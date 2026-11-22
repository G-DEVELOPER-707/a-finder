importScripts("config.js");

const SHEET_TTL = 10 * 60 * 1000;
const ANSWER_TTL = 24 * 60 * 60 * 1000;
let sheetMemory = { url: null, rows: [], time: 0 };
let clientIdPromise;
const inFlight = new Map();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "ask") return;
  handleAsk(msg)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: "Xatolik: " + safeMessage(error) }));
  return true;
});

function safeMessage(error) {
  const message = String(error?.message || error || "Noma'lum xatolik");
  return message.length > 260 ? message.slice(0, 260) + "…" : message;
}

async function getClientId() {
  if (!clientIdPromise) {
    clientIdPromise = (async () => {
      const saved = await chrome.storage.local.get("clientId");
      if (saved.clientId) return saved.clientId;
      const id = (crypto.randomUUID ? crypto.randomUUID() :
        "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === "x" ? r : (r & 3 | 8)).toString(16);
        }));
      await chrome.storage.local.set({ clientId: id });
      return id;
    })();
  }
  return clientIdPromise;
}

async function handleAsk({ text, context = "", title = "", url = "" }) {
  if (typeof text !== "string" || !text.trim()) return { error: "Savol matni topilmadi." };

  // 1) Google Sheets: jadval mavjud bo'lsa avval undan qidiramiz.
  try {
    const rows = await loadSheet(CONFIG.sheetUrl);
    const hit = findInSheet(rows, text, context);
    if (hit) return { source: "sheet", answer: hit.answer, question: hit.question };
  } catch (error) {
    console.warn("Google Sheets vaqtincha o'qilmadi; AI fallback davom etadi:", error);
  }

  // 2) AI javobining lokal keshi.
  const cacheKey = "answer:" + await sha256(norm(text) + "|" + norm(context).slice(0, 500));
  const cached = (await chrome.storage.local.get(cacheKey))[cacheKey];
  if (cached && Date.now() - cached.time < ANSWER_TTL) {
    return { source: "ai-cache", answer: cached.answer };
  }

  // Bir brauzerda bir xil savol bir vaqtda so'ralsa, bitta so'rovdan foydalanadi.
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const task = askWorker(text, context, title, url)
    .then(async (answer) => {
      await chrome.storage.local.set({ [cacheKey]: { answer, time: Date.now() } });
      return { source: "ai", answer };
    })
    .finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, task);
  return task;
}

async function askWorker(text, context, title, url) {
  if (!CONFIG.workerUrl || CONFIG.workerUrl.includes("__WORKER_URL__")) {
    throw new Error("AI server hali sozlanmagan. Loyiha egasi deploy bosqichini yakunlashi kerak.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(CONFIG.workerUrl.replace(/\/+$/, "") + "/ask", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-client-id": await getClientId()
      },
      body: JSON.stringify({
        text: text.slice(0, 1200),
        context: String(context || "").slice(0, 1600),
        title: String(title || "").slice(0, 180),
        url: String(url || "").slice(0, 500)
      }),
      signal: controller.signal
    });

    let data;
    try { data = await response.json(); }
    catch { throw new Error("AI server noto'g'ri javob qaytardi."); }

    if (!response.ok) {
      if (response.status === 429) throw new Error(data.error || "AI so'rovlari limiti vaqtincha tugadi.");
      if (response.status === 503) throw new Error(data.error || "AI server vaqtincha band.");
      throw new Error(data.error || "AI server xatosi (" + response.status + ").");
    }
    if (!data.answer) throw new Error("AI javob qaytarmadi.");
    return data.answer;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("AI javobi 25 soniyada kelmadi. Qayta urinib ko'ring.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- Google Sheets ---------- */
function csvUrl(input) {
  const id = (input.match(/\/d\/([a-zA-Z0-9-_]+)/) || [])[1];
  if (!id) throw new Error("Google Sheets havolasi noto'g'ri.");
  const gid = (input.match(/[#&?]gid=(\d+)/) || [])[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? "&gid=" + gid : ""}`;
}

async function loadSheet(input) {
  const fresh = (cache) => cache && cache.url === input && Date.now() - cache.time < SHEET_TTL;
  if (fresh(sheetMemory)) return sheetMemory.rows;
  const stored = (await chrome.storage.local.get("sheetCache")).sheetCache;
  if (fresh(stored)) { sheetMemory = stored; return stored.rows; }

  const response = await fetch(csvUrl(input), { credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error("Jadval yuklanmadi (" + response.status + ").");
  const csv = await response.text();
  if (/<!doctype html|<html/i.test(csv.slice(0, 500))) {
    throw new Error("Google Sheets ommaviy ko'rish uchun ochilmagan bo'lishi mumkin.");
  }

  const rows = parseCSV(csv)
    .filter((row) => row[0]?.trim() && row[1]?.trim())
    .map((row) => ({ q: row[0].trim(), a: row[1].trim(), n: norm(row[0]) }));

  sheetMemory = { url: input, rows, time: Date.now() };
  await chrome.storage.local.set({ sheetCache: sheetMemory });
  return rows;
}

function parseCSV(source) {
  const output = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); output.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  if (field || row.length) { row.push(field); output.push(row); }
  return output;
}

/* ---------- Moslashtirish: asl algoritm saqlangan ---------- */
function norm(value) {
  return String(value || "").toLowerCase()
    .replace(/[ʻʼ’‘`´']/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ").trim();
}
function bigrams(value) {
  const map = new Map();
  const compact = value.replace(/ /g, "");
  for (let i = 0; i < compact.length - 1; i++) {
    const gram = compact.slice(i, i + 2);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}
function dice(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a), B = bigrams(b);
  let intersection = 0, totalA = 0, totalB = 0;
  for (const value of A.values()) totalA += value;
  for (const value of B.values()) totalB += value;
  for (const [gram, value] of A) if (B.has(gram)) intersection += Math.min(value, B.get(gram));
  return (2 * intersection) / (totalA + totalB);
}
function findInSheet(rows, text, context) {
  const target = norm(text), surrounding = norm(context);
  let best = null, bestScore = 0;
  for (const row of rows) {
    let score = dice(target, row.n);
    if (row.n.length >= 10) {
      if (target.includes(row.n)) score = Math.max(score, 0.95);
      else if (surrounding.includes(row.n)) score = Math.max(score, 0.9);
    }
    if (target.length >= 10 && row.n.includes(target)) score = Math.max(score, 0.85);
    if (score > bestScore) { bestScore = score; best = row; }
  }
  return bestScore >= 0.72 ? { question: best.q, answer: best.a } : null;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
