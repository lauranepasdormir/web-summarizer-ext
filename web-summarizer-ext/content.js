// content.js — robust extractor with fallbacks & retries
(function () {
  // 统计纯文本长度
  const textLen = (s) => (s || "").replace(/\s+/g, " ").trim().length;

  // 1) Readability 优先
  function extractWithReadability() {
    try {
      if (typeof Readability !== "function") return null;
      const doc = document.cloneNode(true);
      doc.querySelectorAll("script,noscript,style").forEach((n) => n.remove());
      const art = new Readability(doc, { debug: false }).parse();
      if (!art) return null;
      const title = (art.title || document.title || "").trim();
      const text = (art.textContent || "").trim();
      if (textLen(text) < 200) return null;
      return { title, text };
    } catch (_) {
      return null;
    }
  }

  // 2) 选择常见正文容器
  function pickCandidateContainer() {
    const selectors = [
      "article",
      "main",
      "[role='main']",
      "[itemprop='articleBody']",
      "[data-component='article-body']",
      "[data-test-id='article-body']",
      ".post-content,.entry-content,.article-content,.content__article-body",
      ".liveblog__content,.live-blog,.blog-posts",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && textLen(el.innerText) > 200) return el;
    }
    // 3) 退一步：从页面中找“最大文本块”
    let best = null;
    let bestScore = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      // 跳过导航/页脚/侧栏/代码等
      const bad =
        /nav|header|footer|aside|menu|form|button|input|figure|figcaption|code|pre|script|style/i;
      if (bad.test(el.tagName)) continue;
      const len = textLen(el.innerText);
      if (len > bestScore) {
        bestScore = len;
        best = el;
      }
    }
    return best;
  }

  function extractWithFallbacks() {
    const c = pickCandidateContainer();
    if (!c) return null;
    const text = (c.innerText || "").trim();
    if (textLen(text) < 200) return null;
    return { title: (document.title || "").trim(), text };
  }

  // 4) 总调度 + 重试（等待懒加载/直播块填充）
  async function robustExtract(maxTries = 3, gapMs = 800) {
    for (let i = 0; i < maxTries; i++) {
      let r = extractWithReadability();
      if (r) return r;

      r = extractWithFallbacks();
      if (r) return r;

      // 等一等再试（给 SPA/直播流时间）
      await new Promise((res) => setTimeout(res, gapMs));
    }
    return null;
  }

  // 暴露给 popup.js 调用
  window.__summarizer_extract__ = async () => {
    // 有些站点的主要内容在 shadow DOM/iframe 中，本最低可行版本忽略它们
    const result = await robustExtract(4, 900);
    if (!result) return { title: document.title || "", text: "", url: location.href };
    return { title: result.title, text: result.text, url: location.href };
  };
})();

