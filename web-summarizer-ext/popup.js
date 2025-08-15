const out = document.getElementById('out');
const langSel = document.getElementById('lang');
const styleSel = document.getElementById('style');

const LANG_OPTIONS = [
  ["zh-CN","中文（简体）"],["zh-TW","中文（繁体）"],["en","English"],["ja","日本語"],
  ["fr","Français"],["es","Español"],["de","Deutsch"],["ko","한국어"]
];
LANG_OPTIONS.forEach(([v,l]) => {
  const opt = document.createElement('option');
  opt.value = v; opt.textContent = l; langSel.appendChild(opt);
});

chrome.storage.sync.get(["lang","style"], (cfg) => {
  langSel.value = cfg.lang || "zh-CN";
  styleSel.value = cfg.style || "bullets";
});

document.getElementById('run').addEventListener('click', async () => {
  out.textContent = "Extracting content...";
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  try {
    // 注入 Readability & content.js（如果未注入）
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["readability.js", "content.js"]
    });
    // 让 content.js 在页面上跑提取，并返回 {title, text, url}
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__summarizer_extract__ && window.__summarizer_extract__()
    });
    if (!result || !result.text) throw new Error("正文提取失败或为空");

    out.textContent = "Summarizing via API...";
    const config = await chrome.storage.sync.get(["apiKey"]);
    if (!config.apiKey) {
      out.textContent = "未设置 API Key：请在 Options 页面里设置。";
      return;
    }
    const summary = await chrome.runtime.sendMessage({
      type: "SUMMARIZE",
      payload: {
        title: result.title, text: result.text, pageUrl: result.url,
        targetLang: langSel.value, style: styleSel.value
      }
    });
    out.textContent = summary;
  } catch (e) {
    out.textContent = `Error: ${e.message}`;
  }
});
