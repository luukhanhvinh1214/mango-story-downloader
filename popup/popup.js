const FACEBOOK_HOST = /(^|\.)facebook\.com$/;
const STORY_PATH = /^\/stories\//;
const PREFER_1080P_KEY = "msd-prefer-1080p";

const downloadButton = document.getElementById("download-button");
const prefer1080p = document.getElementById("prefer-1080p");
const statusLine = document.getElementById("status");

prefer1080p.checked = localStorage.getItem(PREFER_1080P_KEY) !== "0";
prefer1080p.addEventListener("change", () => localStorage.setItem(PREFER_1080P_KEY, prefer1080p.checked ? "1" : "0"));
downloadButton.addEventListener("click", downloadCurrentStory);

async function downloadCurrentStory() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isStoryTab(tab)) {
    showStatus("Mở một story Facebook trước đã");
    return;
  }

  downloadButton.disabled = true;
  showStatus("Đang chuẩn bị video");
  try {
    const result = await chrome.runtime.sendMessage({
      type: "downloadStory",
      tabId: tab.id,
      allowMerge: prefer1080p.checked,
    });
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
