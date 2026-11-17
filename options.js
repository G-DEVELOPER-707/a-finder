// Options may be left untouched: config.js supplies the built-in defaults.
const ids = ["sheetUrl", "provider", "geminiKey", "geminiModel", "apiKey", "model", "hotkey"];
const $ = (id) => document.getElementById(id);

const defaults = {
  sheetUrl: CONFIG.sheetUrl || "",
  provider: CONFIG.provider || "gemini",
  geminiKey: CONFIG.geminiKey || "",
  geminiModel: CONFIG.geminiModel || "gemini-flash-lite-latest",
  apiKey: CONFIG.apiKey || "",
  model: CONFIG.model || "",
  hotkey: CONFIG.hotkey || "f"
};

function toggle() {
  const isClaude = $("provider").value === "claude";
  $("gem").style.display = isClaude ? "none" : "";
  $("cl").style.display = isClaude ? "" : "none";
}

// Show built-in config values first, then apply any saved user overrides.
chrome.storage.sync.get(ids, (saved) => {
  ids.forEach((id) => {
    const value = saved[id];
    $(id).value = value !== undefined && value !== null && value !== ""
      ? value
      : defaults[id];
  });
  toggle();
});

$("provider").onchange = toggle;
$("save").onclick = () => {
  const values = {};
  ids.forEach((id) => { values[id] = $(id).value.trim(); });
  values.hotkey = (values.hotkey || defaults.hotkey).toLowerCase();

  // Empty fields are not stored as overrides; config.js remains the fallback.
  const overrides = {};
  ids.forEach((id) => {
    if (values[id] && values[id] !== defaults[id]) overrides[id] = values[id];
    else overrides[id] = "";
  });

  chrome.storage.sync.set(overrides, () => {
    $("ok").textContent = "Saqlandi ✓";
    setTimeout(() => { $("ok").textContent = ""; }, 2000);
  });
};
