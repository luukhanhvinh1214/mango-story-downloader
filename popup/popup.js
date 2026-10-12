const FACEBOOK_HOST = /(^|\.)facebook\.com$/;
const STORY_PATH = /^\/stories\//;

const downloadButton = document.getElementById("download-button");
const statusLine = document.getElementById("status");

downloadButton.addEventListener("click", downloadCurrentStory);

async function downloadCurrentStory() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isStoryTab(tab)) {
    showStatus("Mở một story Facebook trước đã");
    return;
  }

  downloadButton.disabled = true;
  showStatus("Đang tìm video");
  try {
    const result = await chrome.runtime.sendMessage({ type: "downloadStory", tabId: tab.id });
    showStatus(result.ok ? `Đang tải bản ${result.quality}` : result.error);
  } catch (err) {
    showStatus("Không tải được: " + err.message);
  } finally {
    downloadButton.disabled = false;
  }
}

function isStoryTab(tab) {
  if (!tab || !tab.url) return false;
  const { hostname, pathname } = new URL(tab.url);
  return FACEBOOK_HOST.test(hostname) && STORY_PATH.test(pathname);
}

function showStatus(text) {
  statusLine.textContent = text;
}
