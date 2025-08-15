const apiKeyEl = document.getElementById('apiKey');
const langEl = document.getElementById('lang');
const styleEl = document.getElementById('style');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(["apiKey","lang","style"], (cfg) => {
  apiKeyEl.value = cfg.apiKey || "";
  langEl.value = cfg.lang || "zh-CN";
  styleEl.value = cfg.style || "bullets";
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({
    apiKey: apiKeyEl.value.trim(),
    lang: langEl.value,
    style: styleEl.value
  }, () => {
    statusEl.textContent = "Saved ✓";
    setTimeout(() => statusEl.textContent = "", 1200);
  });
});
