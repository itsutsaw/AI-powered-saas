export const formats = [
  { name: "Square post", label: "Instagram · 1:1", width: 1080, height: 1080 },
  {
    name: "Portrait post",
    label: "Instagram · 4:5",
    width: 1080,
    height: 1350,
  },
  { name: "Story", label: "Stories · 9:16", width: 1080, height: 1920 },
  { name: "Wide post", label: "LinkedIn / X · 16:9", width: 1200, height: 675 },
];
export const MAX_BYTES = 4_000_000;
export function validateFile(file, kind) {
  const types =
    kind === "image"
      ? ["image/jpeg", "image/png", "image/webp"]
      : kind === "video"
        ? ["video/mp4", "video/webm"]
        : [];
  if (!file || !types.includes(file.type))
    return "Choose a JPG, PNG or WebP image, or an MP4 / WebM video in the matching tool.";
  if (!file.size) return "This file is empty.";
  if (file.size > MAX_BYTES)
    return "Choose a file smaller than 4 MB for this starter.";
  return null;
}
export function sizeLabel(bytes) {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}
export function cropRect(sw, sh, tw, th) {
  const scale = Math.max(tw / sw, th / sh);
  const width = tw / scale,
    height = th / scale;
  return { x: (sw - width) / 2, y: (sh - height) / 2, width, height };
}
