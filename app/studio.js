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
    <div className="shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="logo">
            m<span>✦</span>
          </span>
          mediaforge<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="avatar">M</span>
          <div>
            My workspace<small>Creator studio</small>
          </div>
          <span className="chevron">⌄</span>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {[
            ["image", "▧", "Image studio"],
            ["video", "▷", "Video studio"],
            ["library", "▦", "Media library"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => switchTab(id)}
            >
              <span>{icon}</span>
              {label}
              {id === "image" && <em>AI</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="tip">
            <span>✧</span>
            <strong>Make more of your media.</strong>
            <p>
              One image. Every platform.
              <br />A lot less busywork.
            </p>
          </div>
          <div className="mode">
            <i />
            {live ? "Cloud workspace" : "Local demo workspace"}
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <div>
            Workspace <span>/</span>{" "}
            <strong>
              {tab === "image"
                ? "Image studio"
                : tab === "video"
                  ? "Video studio"
                  : "Media library"}
            </strong>
          </div>
          <div className="header-right">
            <span className="badge">{live ? "LIVE MODE" : "DEMO MODE"}</span>
            {live ? <Account /> : <span className="avatar">You</span>}
          </div>
        </header>
        <main>
          <div className="heading">
            <div>
              <p className="eyebrow">YOUR CONTENT, EVERY FORMAT</p>
              <h1>
                {tab === "image"
                  ? "Big ideas. Perfectly framed."
                  : tab === "video"
                    ? "Less weight. More impact."
                    : "All your media, together."}
              </h1>
              <p>
                {tab === "image"
                  ? "Turn one image into content for every corner of the internet."
                  : tab === "video"
                    ? "Upload, optimize, and share your next great story."
                    : live
                      ? "Your latest 50 uploads, saved to your account."
                      : "Your uploads from this session. Refreshing clears the demo library."}
              </p>
            </div>
            <span className="heading-spark">✳</span>
          </div>
          {!live && (
            <div className="demo-note">
              <span>◉</span>
              <p>
                <strong>Try it right here.</strong> Images crop locally. AI
                cropping, video compression, sign-in, and saved history activate
                after service setup.
              </p>
            </div>
          )}
          <div
            role="status"
            aria-live="polite"
            className={notice ? "notice" : "notice empty"}
          >
            {notice}
          </div>
          {tab === "library" ? (
            <section className="library">
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
                      <div className="video-placeholder">▷</div>
                    )}
                    <strong>{item.title}</strong>
                    <span>
                      {item.kind} · {sizeLabel(Number(item.original_bytes))}
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty-library">
                  <span>▦</span>
                  <h2>Your next creation starts here.</h2>
                  <p>
                    Upload an image or video and it will appear in your library.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => switchTab("image")}
                  >
                    Open image studio →
                  </button>
                </div>
              )}
            </section>
          ) : (
            <div className="studio-grid">
              <section className="controls">
                <div className="panel">
                  <div className="step-title">
                    <span>01</span>
                    <h2>Add your {tab}</h2>
                  </div>
                  <button
                    disabled={busy}
                    className="dropzone"
                    onClick={() => input.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      upload(event.dataTransfer.files[0]);
                    }}
                  >
                    <span className="upload-icon">↑</span>
                    <strong>
                      {busy ? "Processing your upload…" : "Drop your file here"}
                    </strong>
                    <span>
                      or <u>browse files</u>
                    </span>
                    <small>
                      {tab === "image" ? "JPG, PNG, WebP" : "MP4, WebM"} · up to
                      4 MB
                    </small>
                  </button>
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
                    <div className="file-info">
                      <span>✓</span>
                      <div>
                        <strong>{asset.title}</strong>
                        <small>
                          {asset.id === "sample"
                            ? "Sample illustration · ready to try"
                            : `${sizeLabel(Number(asset.original_bytes))} · ${live ? "Saved to your library" : "On your device"}`}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
                <div className="panel">
                  <div className="step-title">
                    <span>02</span>
                    <h2>
                      {tab === "image" ? "Choose a format" : "Optimization"}
                    </h2>
                  </div>
                  {tab === "image" ? (
                    <div className="formats">
                      {formats.map((item, index) => (
                        <button
                          key={item.name}
                          className={
                            format === index ? "format selected" : "format"
                          }
                          onClick={() => setFormat(index)}
                          aria-pressed={format === index}
                        >
                          <span
                            className="format-shape"
                            style={{
                              aspectRatio: `${item.width}/${item.height}`,
                            }}
                          />
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.label}</small>
                          </div>
                          <span className="radio" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="video-details">
                      <h3>{live ? "Automatic quality" : "Preview mode"}</h3>
                      <p>
                        {live
                          ? "Cloudinary adjusts quality and exports MP4. Results depend on the source; some files may not shrink."
                          : "Connect your services to compress videos. You can preview a short clip here now."}
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
                  <div className="smart-note">
                    ✧{" "}
                    <span>
                      {live && asset?.public_id
                        ? "Cloudinary processing enabled"
                        : tab === "image"
                          ? "Demo uses a centered crop"
                          : "Original video · no compression in demo"}
                    </span>
                  </div>
                </div>
              </section>
              <section className="preview-panel">
                <div className="preview-top">
                  <h2>Preview</h2>
                  <span>
                    {tab === "image"
                      ? `${selected.width} × ${selected.height} px`
                      : "Video player"}
                  </span>
                </div>
                <div className="preview-canvas">
                  {tab === "image" && preview ? (
                    <img
                      className="preview-image"
                      src={preview}
                      alt={`${selected.name} crop preview`}
                      onLoad={() => setPreviewBusy(false)}
                      onError={() => {
                        setPreviewBusy(false);
                        setPreview("");
                        setNotice(
                          "Preview failed. Check Cloudinary transformations or try another image.",
                        );
                      }}
                    />
                  ) : tab === "video" && asset ? (
                    <video
                      src={asset.url}
                      controls
                      onError={() =>
                        setNotice(
                          "Your browser could not play this video. Try MP4 with H.264 encoding.",
                        )
                      }
                    />
                  ) : (
                    <div className="preview-empty">
                      {tab === "image" && previewBusy
                        ? "Preparing your preview…"
                        : "Upload a file to see it here."}
                    </div>
                  )}
                  <span className="canvas-label">
                    {tab === "image"
                      ? "MADE TO FIT. READY TO SHARE."
                      : "YOUR NEXT STORY STARTS HERE."}
                  </span>
                </div>
                <div className="preview-footer">
                  <div>
                    <strong>
                      {tab === "image"
                        ? selected.name
                        : asset?.title || "Video preview"}
                    </strong>
                    <small>
                      {tab === "image"
                        ? "JPEG export · ready for your feed"
                        : live
                          ? "Optimized MP4 export"
                          : "Original file download"}
                    </small>
                  </div>
                  <button
                    className="button primary"
                    disabled={
                      busy ||
                      exporting ||
                      !asset ||
                      (tab === "image" && (!preview || previewBusy))
                    }
                    onClick={download}
                  >
                    {exporting
                      ? "Preparing…"
                      : tab === "image"
                        ? "↓ Download image"
                        : "↓ Download video"}
                  </button>
                </div>
              </section>
            </div>
          )}
          <footer>
            <span>Built for your creative flow.</span>
            <span>
              MediaForge <span className="footer-star">✦</span>{" "}
              {live ? "Powered by Cloudinary" : "Starter edition"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
