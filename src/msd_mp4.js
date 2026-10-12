const MP4_BROKEN = "File video từ Facebook không đọc được";
const MP4_BASE_DATA_OFFSET_FLAG = 0x000001;

function mergeDashMp4(videoInput, audioInput) {
  const video = readDashFile(videoInput);
  const audio = readDashFile(audioInput);
  const audioTrackId = video.trackId + 1;

  const moov = makeBox("moov", [
    withUint32(copyBox(video.bytes, video.mvhd), (box) => box.end - 4, audioTrackId + 1),
    copyBox(video.bytes, video.trak),
    withUint32(copyBox(audio.bytes, audio.trak), (box, bytes) => fieldOffset(bytes, findPath(bytes, box, ["tkhd"])), audioTrackId),
    makeBox("mvex", [
      ...childBoxes(video.bytes, video.mvex).map((child) => copyBox(video.bytes, child)),
      withUint32(copyBox(audio.bytes, audio.trex), (box) => box.body + 4, audioTrackId),
    ]),
  ]);

  const fragments = [
    ...video.fragments.map((fragment) => ({ time: fragment.time, bytes: video.bytes.slice(fragment.start, fragment.end) })),
    ...audio.fragments.map((fragment) => ({
      time: fragment.time,
      bytes: withUint32(audio.bytes.slice(fragment.start, fragment.end), (box, bytes) => findPath(bytes, box, ["traf", "tfhd"]).body + 4, audioTrackId),
    })),
  ].sort((a, b) => a.time - b.time);

  fragments.forEach((fragment, index) => {
    withUint32(fragment.bytes, (box, bytes) => findPath(bytes, box, ["mfhd"]).body + 4, index + 1);
  });

  return [copyBox(video.bytes, video.ftyp), moov, ...fragments.map((fragment) => fragment.bytes)];
}

function readDashFile(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const top = readBoxes(bytes, 0, bytes.length);
  const moov = requireBox(top, "moov");
  const moovChildren = childBoxes(bytes, moov);
  const trak = requireBox(moovChildren, "trak");
  const mvex = requireBox(moovChildren, "mvex");
  const tkhd = findPath(bytes, trak, ["tkhd"]);
  const mdhd = findPath(bytes, trak, ["mdia", "mdhd"]);
  const timescale = dataView(bytes).getUint32(fieldOffset(bytes, mdhd));
  return {
    bytes,
    ftyp: requireBox(top, "ftyp"),
    mvhd: requireBox(moovChildren, "mvhd"),
    trak,
    mvex,
    trex: findPath(bytes, mvex, ["trex"]),
    trackId: dataView(bytes).getUint32(fieldOffset(bytes, tkhd)),
    fragments: readFragments(bytes, top, timescale),
  };
}

function readFragments(bytes, top, timescale) {
  const fragments = [];
  top.forEach((box, index) => {
    if (box.type !== "moof") return;
    const mdat = top[index + 1];
    if (!mdat || mdat.type !== "mdat") throw new Error(MP4_BROKEN);
    const tfhd = findPath(bytes, box, ["traf", "tfhd"]);
    if (readFlags(bytes, tfhd) & MP4_BASE_DATA_OFFSET_FLAG) throw new Error(MP4_BROKEN);
    const tfdt = findPath(bytes, box, ["traf", "tfdt"]);
    fragments.push({ start: box.start, end: mdat.end, time: readDecodeTime(bytes, tfdt) / timescale });
  });
  if (!fragments.length) throw new Error(MP4_BROKEN);
  return fragments;
}

function readBoxes(bytes, start, end) {
  const view = dataView(bytes);
  const boxes = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = view.getUint32(pos);
    let header = 8;
    if (size === 1) {
      size = Number(view.getBigUint64(pos + 8));
      header = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < header || pos + size > end) throw new Error(MP4_BROKEN);
    boxes.push({ type: String.fromCharCode(...bytes.subarray(pos + 4, pos + 8)), start: pos, body: pos + header, end: pos + size });
    pos += size;
  }
  return boxes;
}

function childBoxes(bytes, box) {
  return readBoxes(bytes, box.body, box.end);
}

function requireBox(boxes, type) {
  const box = boxes.find((candidate) => candidate.type === type);
  if (!box) throw new Error(MP4_BROKEN);
  return box;
}

function findPath(bytes, box, path) {
  return path.reduce((parent, type) => requireBox(childBoxes(bytes, parent), type), box);
}

function fieldOffset(bytes, fullBox) {
  return fullBox.body + (bytes[fullBox.body] === 1 ? 20 : 12);
}

function readFlags(bytes, fullBox) {
  return dataView(bytes).getUint32(fullBox.body) & 0xffffff;
}

function readDecodeTime(bytes, tfdt) {
  const view = dataView(bytes);
  return bytes[tfdt.body] === 1 ? Number(view.getBigUint64(tfdt.body + 4)) : view.getUint32(tfdt.body + 4);
}

function copyBox(bytes, box) {
  return bytes.slice(box.start, box.end);
}

function withUint32(bytes, locate, value) {
  const root = readBoxes(bytes, 0, bytes.length)[0];
  dataView(bytes).setUint32(locate(root, bytes), value);
  return bytes;
}

function makeBox(type, parts) {
  const size = 8 + parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(size);
  dataView(out).setUint32(0, size);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  let pos = 8;
  for (const part of parts) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

function dataView(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
