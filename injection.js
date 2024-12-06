// 参考 [ninja33/mdx-server](https://github.com/ninja33/mdx-server)

document.addEventListener("DOMContentLoaded", () => {
  const audio_type = {
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    wav: "audio/wav",
    spx: "audio/ogg",
    ogg: "audio/ogg",
  };

  function audio_content_type(ext) {
    return audio_type[ext] || "audio/mpeg";
  }

  const getAudioEl = (() => {
    let audioEl;
    return () => {
      if (audioEl) return audioEl;

      audioEl = document.querySelector("audio");
      if (!audioEl) audioEl = document.createElement("audio");
      return audioEl;
    };
  })();

  // 修复sound链接发音问题
  function fixSound() {
    const soundElements = document.querySelectorAll('a[href^="sound://"]');
    soundElements.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const href = el.getAttribute("href");
        const src = href.substring("sound:/".length);

        const audio = getAudioEl();
        audio.setAttribute("src", src);

        const type = audio_content_type(href.slice(-3));
        audio.setAttribute("type", type);

        try {
          audio.play();
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  // 修复entry链接跳转问题
  function fixEntry() {
    const entryElements = document.querySelectorAll('a[href^="entry://"]');
    entryElements.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const href = el.getAttribute("href");
        window.location = href.substring("entry:/".length);
      });
    });
  }

  const parentWin = window.parent || window.top;

  // 双击跳转查词
  document.addEventListener("dblclick", () => {
    const sel = document.getSelection().toString();
    if (/^\w+$/g.test(sel)) {
      parentWin.postMessage({ select: sel }, { targetOrigin: "*" });
    }
  });

  const left = [",", "<", "，", "《", "ArrowLeft"];
  const right = [".", ">", "。", "》", "ArrowRight"];
  // 模拟浏览器历史，快捷键前进后退
  document.addEventListener("keyup", (e) => {
    let jump = 0;

    if (left.includes(e.key)) jump = -1;
    else if (right.includes(e.key)) jump = 1;

    if (jump === 0) return;
    parentWin.postMessage({ jump }, { targetOrigin: "*" });
  });

  // TODO: 等待词典其他的js文件执行结束? 是否存在优化空间
  setTimeout(() => {
    fixSound();
    fixEntry();
  }, 500);
});
