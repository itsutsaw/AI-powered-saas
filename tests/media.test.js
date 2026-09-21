import test from "node:test";
import assert from "node:assert/strict";
import { validateFile, cropRect, MAX_BYTES } from "../lib/media.js";
import { liveReady } from "../lib/config.js";
test("upload validation rejects unsupported, empty, oversized and mismatched files", () => {
  for (const file of [
    null,
    { type: "image/svg+xml", size: 20 },
    { type: "image/png", size: 0 },
    { type: "image/png", size: MAX_BYTES + 1 },
    { type: "video/mp4", size: 100 },
  ])
    assert.ok(validateFile(file, "image"));
  assert.equal(validateFile({ type: "image/png", size: 200 }, "image"), null);
  assert.equal(validateFile({ type: "video/mp4", size: 200 }, "video"), null);
  assert.ok(validateFile({ type: "image/png", size: 200 }, "anything"));
});
test("landscape and portrait inputs crop without distortion", () => {
  assert.deepEqual(cropRect(1600, 1000, 1000, 1000), {
    x: 300,
    y: 0,
    width: 1000,
    height: 1000,
  });
  assert.deepEqual(cropRect(1000, 1600, 1000, 1000), {
    x: 0,
    y: 300,
    width: 1000,
    height: 1000,
  });
  const rect = cropRect(1600, 1100, 1080, 1920);
  assert.ok(Math.abs(rect.width / rect.height - 1080 / 1920) < 1e-9);
  assert.ok(rect.x >= 0 && rect.y >= 0);
});
test("missing credentials keep live API disabled", () => {
  const original = process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_API_SECRET;
  assert.equal(liveReady(), false);
  if (original !== undefined) process.env.CLOUDINARY_API_SECRET = original;
});
