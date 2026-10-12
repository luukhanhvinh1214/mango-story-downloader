const SOURCE = "msd";
const PAGE_REPLY_TIMEOUT_MS = 3000;
// ponytail: thu hồi blob sau 5 phút, đủ cho hộp thoại chọn nơi lưu; theo dõi chrome.downloads nếu cần chính xác hơn.
const BLOB_LIFETIME_MS = 5 * 60 * 1000;

const HANDLERS = new Map([
  ["findStoryVideo", findStoryVideo],
  ["mergeStoryVideo", mergeStoryVideo],
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = HANDLERS.get(message.type);
  if (!handler) return false;
  handler(message).then(sendResponse, (err) => sendResponse({ error: err.message }));
  return true;
});

async function findStoryVideo() {
  const found = await askPage("findStoryVideo");
  if (!found || !found.dashXml) return found;
  const { dashXml, ...video } = found;
  const dash = pickDash(dashXml);
  if (!dash || (video.url && dash.side <= (video.side || 0))) return video;
  return { ...video, dash: { videoUrl: dash.videoUrl, audioUrl: dash.audioUrl, quality: dash.side + "p" } };
}

async function mergeStoryVideo({ videoUrl, audioUrl }) {
  const [video, audio] = await Promise.all([fetchBytes(videoUrl), fetchBytes(audioUrl)]);
  const blob = new Blob(mergeDashMp4(video, audio), { type: "video/mp4" });
  const blobUrl = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_LIFETIME_MS);
  return { blobUrl };
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Facebook không trả file video (mã ${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function pickDash(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const reps = [...doc.querySelectorAll("Representation")].map(readRepresentation).filter((rep) => rep.url);
  const video = reps.filter((rep) => rep.kind === "video").sort(byVideoPreference)[0];
  const audio = reps.filter((rep) => rep.kind === "audio").sort((a, b) => b.bandwidth - a.bandwidth)[0];
  if (!video || !audio) return null;
  return { videoUrl: video.url, audioUrl: audio.url, side: Math.min(video.width, video.height) };
}

function readRepresentation(rep) {
  const set = rep.closest("AdaptationSet");
  const mimeType = rep.getAttribute("mimeType") || (set && set.getAttribute("mimeType")) || "";
  const baseUrl = rep.querySelector("BaseURL");
  return {
    kind: (set && set.getAttribute("contentType")) || mimeType.split("/")[0],
    width: Number(rep.getAttribute("width")) || 0,
    height: Number(rep.getAttribute("height")) || 0,
    bandwidth: Number(rep.getAttribute("bandwidth")) || 0,
    codecs: rep.getAttribute("codecs") || "",
    url: baseUrl ? baseUrl.textContent.trim() : "",
  };
}

function byVideoPreference(a, b) {
  const side = (rep) => Math.min(rep.width, rep.height);
  const isAvc = (rep) => (rep.codecs.startsWith("avc1") ? 1 : 0);
  return side(b) - side(a) || isAvc(b) - isAvc(a) || b.bandwidth - a.bandwidth;
}

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
