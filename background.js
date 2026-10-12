import { isVideoUrl, videoFileName } from "./src/msd_video.js";

const NO_RECEIVER = "Receiving end does not exist";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "downloadStory") return false;
  downloadStory(message.tabId).then(sendResponse, (err) =>
    sendResponse({ ok: false, error: err.message })
  );
  return true;
});

async function downloadStory(tabId) {
  const video = await findStoryVideo(tabId);
  if (!video || !video.url) {
    return { ok: false, error: (video && video.error) || "Story này không có video" };
  }
  if (!isVideoUrl(video.url)) return { ok: false, error: "Link video không phải của Facebook" };

  const downloadId = await chrome.downloads.download({
    url: video.url,
    filename: videoFileName(video.id),
  });
  return { ok: true, downloadId, quality: video.quality === "HD" ? "HD" : "SD" };
}

async function findStoryVideo(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "findStoryVideo" });
  } catch (err) {
    if (err.message.includes(NO_RECEIVER)) return { error: "Tải lại trang Facebook rồi thử lại" };
    throw err;
  }
}
