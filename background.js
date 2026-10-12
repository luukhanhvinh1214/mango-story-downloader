import { isPageBlobUrl, isVideoUrl, videoFileName } from "./src/msd_video.js";

const NO_RECEIVER = "Receiving end does not exist";
const NOT_FACEBOOK = "Link video không phải của Facebook";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "downloadStory") return false;
  downloadStory(message.tabId, message.allowMerge !== false).then(sendResponse, (err) =>
    sendResponse({ ok: false, error: err.message })
  );
  return true;
});

async function downloadStory(tabId, allowMerge) {
  const video = await askTab(tabId, { type: "findStoryVideo" });
  if (!video || (!video.url && !video.dash)) {
    return { ok: false, error: (video && video.error) || "Story này không có video" };
  }

  if (video.dash && (allowMerge || !video.url)) {
    const merged = await downloadMerged(tabId, video);
    if (merged.ok || !video.url) return merged;
  }
  return downloadProgressive(video);
}

async function downloadMerged(tabId, video) {
  const { videoUrl, audioUrl, quality } = video.dash;
  if (!isVideoUrl(videoUrl) || !isVideoUrl(audioUrl)) return { ok: false, error: NOT_FACEBOOK };

  const merged = await askTab(tabId, { type: "mergeStoryVideo", videoUrl, audioUrl });
  if (!merged || merged.error) return { ok: false, error: (merged && merged.error) || "Không ghép được video" };
  if (!isPageBlobUrl(merged.blobUrl)) return { ok: false, error: "Không ghép được video" };

  const downloadId = await chrome.downloads.download({ url: merged.blobUrl, filename: videoFileName(video.id) });
  return { ok: true, downloadId, quality: qualityLabel(quality) };
}

async function downloadProgressive(video) {
  if (!isVideoUrl(video.url)) return { ok: false, error: NOT_FACEBOOK };
  const downloadId = await chrome.downloads.download({ url: video.url, filename: videoFileName(video.id) });
  return { ok: true, downloadId, quality: qualityLabel(video.quality) };
}

function qualityLabel(quality) {
  return /^(\d{3,4}p|HD|SD)$/.test(quality) ? quality : "SD";
}

async function askTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    if (err.message.includes(NO_RECEIVER)) return { error: "Tải lại trang Facebook rồi thử lại" };
    throw err;
  }
}
