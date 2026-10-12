const VIDEO_HOST = /(^|\.)fbcdn\.net$/;
const PAGE_HOST = /(^|\.)facebook\.com$/;
const VIDEO_ID = /^\d+$/;

export function isVideoUrl(url) {
  if (!URL.canParse(url)) return false;
  const { protocol, hostname } = new URL(url);
  return protocol === "https:" && VIDEO_HOST.test(hostname);
}

export function isPageBlobUrl(url) {
  if (typeof url !== "string" || !url.startsWith("blob:") || !URL.canParse(url.slice(5))) return false;
  const { protocol, hostname } = new URL(url.slice(5));
  return protocol === "https:" && PAGE_HOST.test(hostname);
}

export function videoFileName(videoId) {
  return VIDEO_ID.test(videoId) ? `facebook-story-${videoId}.mp4` : "facebook-story.mp4";
}
