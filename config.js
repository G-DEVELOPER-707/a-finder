// ===== ASOSIY SOZLAMALAR =====
// Bularni bir marta shu yerda to'ldirasiz. Options sahifasini ochish shart emas.
const CONFIG = {
  sheetUrl: "https://docs.google.com/spreadsheets/d/1GRF1Fk7CLzWjESap5kzTiv_z5FTGfznmU9PLtd-Z7w8/edit?pli=1&gid=0#gid=0",                          // Google Sheets havolasi (A ustun — savol, B ustun — javob)
  provider: "gemini",                    // "gemini" yoki "claude"
  geminiKey: "AQ.Ab8RN6Ifx8t2ZYaUQzrn9cqMQuyja39NnyRcNenlRcTIZaEyLw",                         // aistudio.google.com/api-keys dan olingan kalit
  geminiModel: "gemini-flash-lite-latest", // tez model (sekin bo'lsa ham aniqroq: "gemini-flash-latest")
  apiKey: "",                            // faqat provider "claude" bo'lsa: Anthropic kaliti
  model: "claude-haiku-5-5",
  hotkey: "f"                            // Caps Lock yoqilgan holda shu tugmani bosib turasiz
};
