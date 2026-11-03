const ids = ["sheetUrl", "provider", "geminiKey", "geminiModel", "apiKey", "model", "hotkey"];
const defaults = { sheetUrl: "", provider: "", geminiKey: "", geminiModel: "", apiKey: "", model: "", hotkey: "" };
const $ = (i) => document.getElementById(i);

function toggle() {
  const g = $("provider").value !== "claude";
  $("gem").style.display = g ? "" : "none";
  $("cl").style.display = g ? "none" : "";
}
chrome.storage.sync.get(defaults, (s) => { ids.forEach((i) => ($(i).value = s[i])); toggle(); });
$("provider").onchange = toggle;
$("save").onclick = () => {
  const v = {};
  ids.forEach((i) => (v[i] = $(i).value.trim()));
  v.hotkey = v.hotkey.toLowerCase();
  chrome.storage.sync.set(v, () => {
    $("ok").textContent = "Saqlandi ✓"; setTimeout(() => ($("ok").textContent = ""), 2000);
  });
};
