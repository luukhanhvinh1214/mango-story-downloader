(() => {
  const SOURCE = "msd";

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.source !== SOURCE || data.type !== "findStoryVideo") return;
    const payload = findStoryVideo();
    window.postMessage({ source: SOURCE, replyTo: data.id, payload }, location.origin);
  });

  function findStoryVideo() {
    return { error: "Chưa đọc được video của story này" };
  }
})();
