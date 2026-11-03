importScripts("config.js");

const SHEET_TTL = 10 * 60 * 1000;
let mem = { url: null, rows: [], time: 0 };
let noThinking = false;

chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg.type !== "ask") return;
  handleAsk(msg).then(send).catch((e) => send({ error: "Xatolik: " + e.message }));
  return true;
});

// config.js — asosiy; Options sahifasida to'ldirilgan (bo'sh bo'lmagan) qiymatlar ustun turadi
async function getCfg() {
  const s = await chrome.storage.sync.get(null);
  const cfg = { ...CONFIG };
  for (const k of Object.keys(s)) if (s[k]) cfg[k] = s[k];
  return cfg;
}

async function handleAsk({ text, context, title, url }) {
  const cfg = await getCfg();

  // 1) Jadval
  if (cfg.sheetUrl) {
    try {
      const hit = findInSheet(await loadSheet(cfg.sheetUrl), text, context);
      if (hit) return { source: "sheet", answer: hit.answer, question: hit.question };
    } catch (e) { console.warn("Jadvalni o'qib bo'lmadi:", e); }
  }

  // 2) AI (avval keshdan)
  const useGemini = cfg.provider !== "claude";
  if (useGemini && !cfg.geminiKey) return { error: "Jadvalda topilmadi. AI uchun config.js ga Gemini kalitini yozing." };
  if (!useGemini && !cfg.apiKey) return { error: "Jadvalda topilmadi. AI uchun config.js ga Anthropic kalitini yozing." };

  const ckey = "ai:" + norm(text).slice(0, 300);
  const cached = (await chrome.storage.local.get(ckey))[ckey];
  if (cached) return { source: "ai", answer: cached };

  context = context.slice(0, 1000);
  const answer = useGemini
    ? await askGemini(cfg, text, context, title, url)
    : await askClaude(cfg, text, context, title, url);
  await chrome.storage.local.set({ [ckey]: answer });
  return { source: "ai", answer };
}

/* ---------- Google Sheets ---------- */
function csvUrl(input) {
  const id = (input.match(/\/d\/([a-zA-Z0-9-_]+)/) || [])[1];
  if (!id) throw new Error("Jadval havolasi noto'g'ri");
  const gid = (input.match(/[#&?]gid=(\d+)/) || [])[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? "&gid=" + gid : ""}`;
}

async function loadSheet(input) {
  const fresh = (c) => c && c.url === input && Date.now() - c.time < SHEET_TTL;
  if (fresh(mem)) return mem.rows;
  const st = (await chrome.storage.local.get("sheetCache")).sheetCache;
  if (fresh(st)) { mem = st; return st.rows; }
  const r = await fetch(csvUrl(input), { credentials: "omit" });
  if (!r.ok) throw new Error("Jadval yuklanmadi (" + r.status + ")");
  const rows = parseCSV(await r.text())
    .filter((x) => x[0] && x[1])
    .map((x) => ({ q: x[0], a: x[1], n: norm(x[0]) }));
  mem = { url: input, rows, time: Date.now() };
  await chrome.storage.local.set({ sheetCache: mem });
  return rows;
}

function parseCSV(s) {
  const out = []; let row = [], f = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); out.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out;
}

/* ---------- Moslashtirish ---------- */
function norm(s) {
  return s.toLowerCase()
    .replace(/[ʻʼ’‘`´']/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ").trim();
}
function bigrams(s) {
  const m = new Map(); s = s.replace(/ /g, "");
  for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); }
  return m;
}
function dice(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a), B = bigrams(b); let inter = 0, ta = 0, tb = 0;
  for (const v of A.values()) ta += v;
  for (const v of B.values()) tb += v;
  for (const [g, v] of A) if (B.has(g)) inter += Math.min(v, B.get(g));
  return (2 * inter) / (ta + tb);
}
function findInSheet(rows, text, context) {
  const t = norm(text), c = norm(context);
  let best = null, bestScore = 0;
  for (const r of rows) {
    let s = dice(t, r.n);
    if (r.n.length >= 10) {
      if (t.includes(r.n)) s = Math.max(s, 0.95);
      else if (c.includes(r.n)) s = Math.max(s, 0.9);
    }
    if (t.length >= 10 && r.n.includes(t)) s = Math.max(s, 0.85);
    if (s > bestScore) { bestScore = s; best = r; }
  }
  return bestScore >= 0.72 ? { question: best.q, answer: best.a } : null;
}

/* ---------- AI ---------- */
const SYSTEM_PROMPT =
  "Sen juda qisqa va aniq javob beradigan yordamchisan. Foydalanuvchi veb-sahifadagi savol yoki matn ustiga kursor olib borgan. " +
  "Javobni savol tilida ber. Test (variantli) savolda faqat to'g'ri variantni yoz. Oddiy savolda 1-2 jumlada javob ber. " +
  "Kirish so'z, tushuntirish va takrorlash yozma.";

function userPrompt(text, context, title, url) {
  return `Sahifa: ${title}\n\nKursor ostidagi matn:\n"""${text}"""\n\nAtrofdagi kontekst (variantlar bo'lishi mumkin):\n"""${context}"""`;
}

async function askGemini(cfg, text, context, title, url) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.geminiModel)}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userPrompt(text, context, title, url) }] }],
    generationConfig: { maxOutputTokens: 400 }
  };
  if (!noThinking) body.generationConfig.thinkingConfig = { thinkingBudget: 0 }; // "o'ylash"ni o'chirish — tezroq
  const call = async () => {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": cfg.geminiKey },
      body: JSON.stringify(body)
    });
    return [r, await r.json()];
  };
  let [r, data] = await call();
  if (r.status === 400 && body.generationConfig.thinkingConfig) {   // model bu parametrni qabul qilmasa
    noThinking = true; delete body.generationConfig.thinkingConfig;
    [r, data] = await call();
  }
  if (r.status === 429) {
    const sec = Math.ceil(parseFloat((data?.error?.message || "").match(/retry in ([\d.]+)s/)?.[1] || "60"));
    throw new Error("Gemini bepul limiti tugadi. " + sec + " soniyadan keyin qayta urinib ko'ring.");
  }
  if (!r.ok) throw new Error(data?.error?.message || "Gemini xatosi " + r.status);
  const out = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n").trim();
  if (!out) throw new Error("Gemini bo'sh javob qaytardi");
  return out;
}

async function askClaude(cfg, text, context, title, url) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: cfg.model, max_tokens: 400, system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(text, context, title, url) }]
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "AI xatosi " + r.status);
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}
