// Service Worker
const STYLE_HINT = {
  bullets: "用 5-8 条要点列出关键信息；尽量具体，有数字与结论。",
  brief: "用 120-180 字简述核心观点与结论；避免赘述。",
  detailed: "用 3-5 段较详细总结，包含背景、主要论点、证据与结论。"
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SUMMARIZE") {
    (async () => {
      try {
        const { apiKey } = await chrome.storage.sync.get(["apiKey"]);
        if (!apiKey) throw new Error("缺少 API Key");
        const { title, text, pageUrl, targetLang, style } = msg.payload;
        const sys = `Always respond strictly in ${targetLang}. No preface, no code fences.`;
        const user = `你是多语信息整理助手。阅读以下网页正文，请**仅用 ${targetLang}** 输出高质量总结：${STYLE_HINT[style] || STYLE_HINT.bullets}
要求：
- 忠实原文，不杜撰
- 如有数据、结论或时间线，用简短条目写清楚
- 保留专有名词；最后给 1 句 TL;DR
网页标题：${title}
来源：${pageUrl}
正文：
${text.slice(0, 12000)}
`;

        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: user }
            ],
            temperature: 0.2
          })
        });

        if (!r.ok) {
          const t = await r.text();
          throw new Error(`OpenAI API error: ${r.status} ${t}`);
        }
        const data = await r.json();
        let out = (data.choices?.[0]?.message?.content || "").trim();
        if (!out) throw new Error("Empty response");

        // 守门员：二次改写为目标语言（简单兜底；避免额外请求可省略）
        // 轻量实现：检查是否含英文/中文占比（留空以简化）

        sendResponse(out);
      } catch (e) {
        sendResponse(`Error: ${e.message}`);
      }
    })();

    // 声明异步响应
    return true;
  }
});
