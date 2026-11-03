// Caps Lock YOQILGAN holatda F (yoki sozlamadagi tugma) bosib turilganda javob
// savol matni o'rnida chiqadi. Tugma qo'yib yuborilsa, asl matn qaytadi.

let hotkey = ((typeof CONFIG !== "undefined" && CONFIG.hotkey) || "f").toLowerCase();
let mouseX = 0, mouseY = 0;
let keyDown = false;   // tugma hozir bosib turilganmi
let token = 0;         // eski (kechikkan) javoblarni bekor qilish uchun
let active = null;     // { el, nodes } — almashtirilgan element va uning asl tarkibi

chrome.storage.sync.get({ hotkey: "" }, (s) => { if (s.hotkey) hotkey = s.hotkey.toLowerCase(); });
chrome.storage.onChanged.addListener((c) => {
  if (c.hotkey && c.hotkey.newValue) hotkey = c.hotkey.newValue.toLowerCase();
});

document.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; }, true);

document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== hotkey || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (!e.getModifierState("CapsLock")) return;      // faqat Caps Lock yoqilgan bo'lsa

  e.preventDefault();
  e.stopImmediatePropagation();                     // saytning o'z "F" qisqa tugmasi ishlamasin
  if (e.repeat || keyDown) return;
  keyDown = true;
  start();
}, true);

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() !== hotkey) return;
  if (keyDown) { e.preventDefault(); e.stopImmediatePropagation(); }
  release();
}, true);

// Xavfsizlik: oyna fokusdan chiqsa yoki tab almashsa ham asl matnni qaytaramiz
window.addEventListener("blur", release);
document.addEventListener("visibilitychange", () => { if (document.hidden) release(); });

function release() {
  keyDown = false;
  token++;       // kutilayotgan javob bo'lsa, u endi qo'llanmaydi
  restore();
}

function restore() {
  if (!active) return;
  try { active.el.replaceChildren(...active.nodes); } catch (_) {}
  active = null;
}

function getTarget() {
  let el = null;
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(mouseX, mouseY);
    if (r) el = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer;
  }
  if (!el) el = document.elementFromPoint(mouseX, mouseY);
  if (!el || el === document.body || el === document.documentElement) return null;

  // juda qisqa matnli element (<b>, <span>...) bo'lsa, yuqoriga ko'tariladi
  while (el.parentElement && el.parentElement !== document.body &&
         (el.innerText || "").trim().length < 15) {
    el = el.parentElement;
  }
  const text = (el.innerText || el.textContent || "").trim().slice(0, 600);
  if (text.length < 3) return null;

  // AI uchun kengroq kontekst (test variantlari ham kirishi uchun)
  let ctx = el;
  while (ctx.parentElement && ctx.parentElement !== document.body &&
         (ctx.parentElement.innerText || "").length <= 1500) ctx = ctx.parentElement;

  return { el, text, context: (ctx.innerText || "").trim().slice(0, 1500) };
}

async function start() {
  restore();
  const t = getTarget();
  if (!t) return;
  const my = ++token;
  let answer;
  try {
    const res = await chrome.runtime.sendMessage({
      type: "ask", text: t.text, context: t.context, title: document.title, url: location.href
    });
    answer = !res ? "Javob kelmadi." : res.error ? res.error : res.answer;
  } catch (err) {
    answer = "Xatolik: " + err.message;
  }
  // Javob kelguncha tugma qo'yib yuborilgan bo'lsa — hech narsa o'zgartirilmaydi
  if (my !== token || !keyDown) return;
  apply(t.el, answer);
}

function apply(el, text) {
  restore();
  active = { el, nodes: Array.from(el.childNodes) };
  el.textContent = text;   // element o'z uslubini (shrift, rang) saqlab qoladi
}
