"use client";
import { useEffect, useRef, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { formats, validateFile, cropRect, sizeLabel } from "../lib/media";
function Account() {
  const { user, isLoaded } = useUser();
  return user ? (
    <UserButton />
  ) : (
    <a className="button secondary" href="/sign-in">
      {isLoaded ? "Sign in" : "Loading…"}
    </a>
  );
}
const sample = {
  id: "sample",
  title: "A little room to explore",
  url: "/sample.svg",
  kind: "image",
  original_bytes: 0,
};
export default function Studio({ live }) {
  const [tab, setTab] = useState("image");
  const [format, setFormat] = useState(0);
  const [asset, setAsset] = useState(sample);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState("");
  const [previewBusy, setPreviewBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const input = useRef(null);
  const urls = useRef([]);
  const selected = formats[format];
  useEffect(
    () => () => urls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  useEffect(() => {
    if (!live) return;
    fetch("/api/media")
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) setItems(data);
        else if (response.status !== 401) setNotice(data.error);
      })
      .catch(() =>
        setNotice("Could not load your library. Refresh to try again."),
      );
  }, [live]);
  useEffect(() => {
    if (asset?.kind !== "image") {
      setPreview("");
      setPreviewBusy(false);
      return;
    }
    let cancelled = false;
    setPreview("");
    setPreviewBusy(true);
    if (asset.public_id) {
      const transformation = `c_fill,g_auto,w_${selected.width},h_${selected.height}/f_jpg,q_auto`;
      setPreview(asset.url.replace("/upload/", `/upload/${transformation}/`));
      return () => {
        cancelled = true;
      };
    }
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = selected.width;
      canvas.height = selected.height;
      const rect = cropRect(
        image.naturalWidth,
        image.naturalHeight,
        canvas.width,
        canvas.height,
      );
      canvas
        .getContext("2d")
        .drawImage(
          image,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      setPreview(canvas.toDataURL("image/jpeg", 0.9));
    };
    image.onerror = () => {
      if (!cancelled) {
        setPreviewBusy(false);
        setNotice("This image could not be decoded. Try another file.");
      }
    };
    image.src = asset.url;
    return () => {
      cancelled = true;
    };
  }, [asset, selected]);
  async function upload(file) {
    if (!file || busy) return;
    const kind = tab === "video" ? "video" : "image";
    const error = validateFile(file, kind);
    if (error) {
      setNotice(error);
      return;
    }
    setNotice("");
    setBusy(true);
    try {
      let result;
      if (live) {
        const data = new FormData();
        data.append("file", file);
        data.append("kind", kind);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: data,
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.error);
      } else {
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        result = {
          id: crypto.randomUUID(),
          title: file.name,
          kind,
          url,
          original_bytes: file.size,
          output_bytes: file.size,
        };
      }
      setAsset(result);
      setItems((previous) => [result, ...previous]);
      setNotice(
        kind === "video" && !live
          ? "Video loaded for preview. Compression requires live mode; demo downloads keep the original file."
          : kind === "video"
            ? "Your video is ready to download."
            : "Ready. Choose your format and download.",
      );
    } catch (error) {
      setNotice(error.message || "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function download() {
    const url = asset?.kind === "video" ? asset.url : preview;
    if (!url) return;
    setExporting(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed. Try again.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download =
        asset.kind === "image"
          ? `mediaforge-${selected.width}x${selected.height}.jpg`
          : asset.public_id
            ? "mediaforge-optimized.mp4"
            : asset.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setNotice("Download ready. Check your downloads folder.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setExporting(false);
    }
  }
  function switchTab(next) {
    setTab(next);
    setNotice("");
    if (next === "image")
      setAsset(items.find((item) => item.kind === "image") || sample);
    if (next === "video")
      setAsset(items.find((item) => item.kind === "video") || null);
  }
  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="/">
          MediaForge
        </a>
        <div className="account">
          {!live && <span className="badge">Demo</span>}
          {live && <Account />}
        </div>
      </header>
      <main>
        <nav aria-label="Media tools">
          {[
            ["image", "Images"],
            ["video", "Videos"],
            ["library", "My library"],
          ].map(([id, label]) => (
            <button
              key={id}
              disabled={busy}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "nav-button active" : "nav-button"}
              onClick={() => switchTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="intro">
          <h1>
            {tab === "image"
              ? "Resize an image"
              : tab === "video"
                ? "Optimize a video"
                : "My library"}
          </h1>
          <p>
            {tab === "image"
              ? "Upload an image, choose a size, and download."
              : tab === "video"
                ? "Upload a short video and download the optimized file."
                : live
                  ? "Your latest 50 uploads."
                  : "Files from this session. Refreshing clears this library."}
          </p>
        </div>
        {!live && (
          <p className="demo-note">
            Demo: images use a centered crop. Videos stay unchanged. Connect
            your services to enable AI cropping and video compression.
          </p>
        )}
        <p
          role="status"
          aria-live="polite"
          className={notice ? "notice" : "notice empty"}
        >
          {notice}
        </p>
        {tab === "library" ? (
          <section className="library" aria-label="Saved media">
            {items.length ? (
              items.map((item) => (
                <button
                  className="media-card"
                  key={item.id}
                  onClick={() => {
                    setTab(item.kind);
                    setAsset(item);
                  }}
                >
                  {item.kind === "image" ? (
                    <img src={item.url} alt="" />
                  ) : (
                    <div className="video-placeholder">Video</div>
                  )}
                  <strong>{item.title}</strong>
                  <span>
                    {item.kind} · {sizeLabel(Number(item.original_bytes))}
                  </span>
                </button>
              ))
            ) : (
              <div className="empty-library">
                <h2>No uploads yet</h2>
                <p>Your images and videos will appear here.</p>
                <button
                  className="button primary"
                  onClick={() => switchTab("image")}
                >
                  Upload an image
                </button>
              </div>
            )}
          </section>
        ) : (
          <div className="studio-grid">
            <section className="controls" aria-label="Upload and settings">
              <h2>1. Upload {tab === "image" ? "an image" : "a video"}</h2>
              <button
                className="dropzone"
                disabled={busy}
                onClick={() => input.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  upload(event.dataTransfer.files[0]);
                }}
              >
                <strong>{busy ? "Processing…" : "Choose a file"}</strong>
                <span>or drag and drop here</span>
              </button>
              <p className="hint">
                {tab === "image" ? "JPG, PNG or WebP" : "MP4 or WebM"} · Maximum
                4 MB
              </p>
              <input
                ref={input}
                type="file"
                aria-label={`Upload ${tab}`}
                accept={
                  tab === "image"
                    ? "image/jpeg,image/png,image/webp"
                    : "video/mp4,video/webm"
                }
                onChange={(event) => upload(event.target.files?.[0])}
                hidden
              />
              {asset && (
                <p className="filename">
                  {asset.id === "sample"
                    ? "Sample image — try a size below"
                    : asset.title}
                </p>
              )}
              {tab === "image" ? (
                <>
                  <label className="setting-label" htmlFor="format">
                    2. Choose a size
                  </label>
                  <select
                    id="format"
                    value={format}
                    onChange={(event) => setFormat(Number(event.target.value))}
                  >
                    {formats.map((item, index) => (
                      <option key={item.name} value={index}>
                        {item.name} ({item.width} × {item.height})
                      </option>
                    ))}
                  </select>
                  <p className="hint">
                    {asset?.public_id
                      ? "AI cropping keeps the main subject in frame."
                      : "This preview uses a centered crop."}
                  </p>
                </>
              ) : (
                <div className="video-details">
                  <h2>2. Automatic optimization</h2>
                  <p>
                    {live
                      ? "Quality is adjusted automatically. File size savings depend on the original video."
                      : "Demo mode previews and downloads your original video."}
                  </p>
                  {asset && live && (
                    <p>
                      Original: {sizeLabel(Number(asset.original_bytes))}
                      <br />
                      Output: {sizeLabel(Number(asset.output_bytes))}
                    </p>
                  )}
                </div>
              )}
              <button
                className="button primary download"
                disabled={
                  busy ||
                  exporting ||
                  !asset ||
                  (tab === "image" && (!preview || previewBusy))
                }
                onClick={download}
              >
                {exporting ? "Preparing download…" : `Download ${tab}`}
              </button>
            </section>
            <section className="preview-panel" aria-label="Media preview">
              <div className="preview-title">
                <h2>Preview</h2>
                {tab === "image" && (
                  <span>
                    {selected.width} × {selected.height}
                  </span>
                )}
              </div>
              <div className="preview-canvas">
                {tab === "image" && preview ? (
                  <img
                    src={preview}
                    alt={`${selected.name} crop preview`}
                    onLoad={() => setPreviewBusy(false)}
                    onError={() => {
                      setPreviewBusy(false);
                      setPreview("");
                      setNotice(
                        "Preview failed. Try another image or check your Cloudinary settings.",
                      );
                    }}
                  />
                ) : tab === "video" && asset ? (
                  <video
                    src={asset.url}
                    controls
                    onError={() =>
                      setNotice(
                        "This video could not be played. Try an MP4 with H.264 encoding.",
                      )
                    }
                  />
                ) : (
                  <p>
                    {tab === "image" && previewBusy
                      ? "Preparing preview…"
                      : "Your video will appear here."}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
