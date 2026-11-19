import { isPageBlobUrl, isStoryPage, isVideoUrl, videoFileName } from "./src/msd_video.js";

const NO_RECEIVER = "Receiving end does not exist";
const NOT_FACEBOOK = "Link video không phải của Facebook";

// ponytail: nhớ trong bộ nhớ service worker; worker bị Chrome tắt khi hộp thoại Lưu mở quá lâu thì story không tự đóng, cần chrome.storage.session nếu phải chắc.
const storyTabByDownload = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "downloadStory") return false;
  downloadStory(message.tabId, message.allowMerge !== false).then(sendResponse, (err) =>
    sendResponse({ ok: false, error: err.message })
  );
  return true;
});

chrome.downloads.onChanged.addListener(({ id, state }) => {
  if (!state || state.current === "in_progress" || !storyTabByDownload.has(id)) return;
  const tabId = storyTabByDownload.get(id);
  storyTabByDownload.delete(id);
  if (state.current !== "complete" || [...storyTabByDownload.values()].includes(tabId)) return;
  closeStory(tabId).catch((err) => console.warn("Không đóng được story:", err.message));
});

async function closeStory(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isStoryPage(tab.url)) return;
  await chrome.tabs.update(tabId, { url: new URL(tab.url).origin + "/" });
}

async function downloadStory(tabId, allowMerge) {
  const result = await startDownload(tabId, allowMerge);
  if (result.ok) storyTabByDownload.set(result.downloadId, tabId);
  return result;
}

async function startDownload(tabId, allowMerge) {
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
