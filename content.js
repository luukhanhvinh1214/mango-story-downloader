const SOURCE = "msd";
const PAGE_REPLY_TIMEOUT_MS = 3000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "findStoryVideo") return false;
  askPage("findStoryVideo").then(sendResponse, (err) => sendResponse({ error: err.message }));
  return true;
});

function askPage(type) {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onReply);
      reject(new Error("Trang không trả lời, tải lại trang rồi thử lại"));
    }, PAGE_REPLY_TIMEOUT_MS);

    function onReply(event) {
      const data = event.data;
      if (event.source !== window || !data || data.source !== SOURCE || data.replyTo !== id) return;
      clearTimeout(timer);
      window.removeEventListener("message", onReply);
      resolve(data.payload);
    }

    window.addEventListener("message", onReply);
    window.postMessage({ source: SOURCE, type, id }, location.origin);
  });
}
