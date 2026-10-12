(() => {
  const SOURCE = "msd";
  const GRAPHQL_PATH = "/api/graphql/";
  const STORY_MARKER = '"__typename":"Story"';

  const storyVideos = new Map();

  listenToGraphql();

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.source !== SOURCE || data.type !== "findStoryVideo") return;
    const payload = findStoryVideo();
    window.postMessage({ source: SOURCE, replyTo: data.id, payload }, location.origin);
  });

  function findStoryVideo() {
    const cardId = currentCardId();
    if (!cardId) return { error: "Không xác định được story đang mở" };
    return storyVideos.get(cardId) || { error: "Chưa thấy dữ liệu của story này, tải lại trang rồi thử lại" };
  }

  function currentCardId() {
    const url = new URL(location.href);
    const fromQuery = url.searchParams.get("card_id");
    if (fromQuery) return fromQuery;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "stories" && parts[2] ? decodeURIComponent(parts[2]) : null;
  }

  function listenToGraphql() {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      if (String(url).includes(GRAPHQL_PATH)) this.addEventListener("load", onGraphqlLoad);
      return open.apply(this, arguments);
    };
  }

  function onGraphqlLoad() {
    if (this.responseType !== "" && this.responseType !== "text") return;
    const text = this.responseText;
    if (!text.includes(STORY_MARKER)) return;
    for (const line of text.split("\n")) collectStories(parseLine(line));
  }

  function parseLine(line) {
    if (!line.startsWith("{")) return null;
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }

  function collectStories(node) {
    if (!node || typeof node !== "object") return;
    if (node.__typename === "Story" && typeof node.id === "string" && Array.isArray(node.attachments)) {
      rememberStory(node);
    }
    for (const key in node) collectStories(node[key]);
  }

  function rememberStory(story) {
    const media = story.attachments.map((attachment) => attachment && attachment.media).find(Boolean);
    if (!media) return;
    const video = toVideo(media);
    const known = storyVideos.get(story.id);
    if (known && known.url && !video.url) return;
    storyVideos.set(story.id, video);
  }

  function toVideo(media) {
    const source = pickVideoSource(media);
    if (source) return { id: media.id, ...source };
    if (media.__typename === "Video") return { id: media.id, error: "Không tìm thấy link tải của video này" };
    return { id: media.id, error: "Story này không có video" };
  }

  function pickVideoSource(media) {
    const delivery = media.videoDeliveryResponseFragment && media.videoDeliveryResponseFragment.videoDeliveryResponseResult;
    const progressive = ((delivery && delivery.progressive_urls) || []).filter((item) => item.progressive_url);
    const byQuality = (quality) => progressive.find((item) => item.metadata && item.metadata.quality === quality);
    const best = byQuality("HD") || byQuality("SD") || progressive[0];
    if (best) return { url: best.progressive_url, quality: (best.metadata && best.metadata.quality) || "SD" };

    const hd = media.browser_native_hd_url || media.playable_url_quality_hd;
    if (hd) return { url: hd, quality: "HD" };
    const sd = media.browser_native_sd_url || media.playable_url;
    return sd ? { url: sd, quality: "SD" } : null;
  }
})();
