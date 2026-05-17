import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../utils/api";

/* ─── Camera hook ─── */
function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // "user" = front, "environment" = back
  const [cameraError, setCameraError] = useState("");

  const startStream = useCallback(async (facing) => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setCameraError("Bạn chưa cấp quyền truy cập camera. Vui lòng cho phép trong cài đặt trình duyệt.");
      } else if (err.name === "NotFoundError") {
        setCameraError("Không tìm thấy camera trên thiết bị này.");
      } else {
        setCameraError("Không thể mở camera: " + err.message);
      }
    }
  }, []);

  const openCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Trình duyệt của bạn không hỗ trợ truy cập camera.");
      setIsOpen(true);
      return;
    }
    setIsOpen(true);
    await startStream(facingMode);
  }, [facingMode, startStream]);

  const flipCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await startStream(next);
  }, [facingMode, startStream]);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsOpen(false);
    setCameraError("");
  }, []);

  // Capture a frame as a File
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1440;
    const ctx = canvas.getContext("2d");

    // Mirror horizontally for front camera (selfie feel)
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(null); return; }
          resolve(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    });
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { videoRef, isOpen, cameraError, facingMode, openCamera, flipCamera, closeCamera, capturePhoto };
}

/* ─── Main component ─── */
export default function UploadPhoto() {
  const navigate = useNavigate();
  const { token, refreshMe } = useAuth();
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const {
    videoRef,
    isOpen: cameraOpen,
    cameraError,
    facingMode,
    openCamera,
    flipCamera,
    closeCamera,
    capturePhoto,
  } = useCamera();

  const previewUrl = useMemo(() => {
    return imageFile ? URL.createObjectURL(imageFile) : "";
  }, [imageFile]);

  const handleCapture = useCallback(async () => {
    const file = await capturePhoto();
    if (file) {
      setImageFile(file);
      closeCamera();
    }
  }, [capturePhoto, closeCamera]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("caption", caption);
      if (imageFile) formData.append("image", imageFile);

      await apiRequest("/posts", { method: "POST", body: formData, token });
      await refreshMe();
      navigate("/feed", { replace: true });
    } catch (caughtError) {
      setError(caughtError.message || "Không thể đăng ảnh lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mobile-stage">
      <div className="phone-shell phone-shell--editor">
        {/* Status bar */}
        <div className="phone-statusbar">
          <span>4:30</span>
          <span className="phone-statusbar__icons">◔ ))) 82%</span>
        </div>

        {/* Toolbar */}
        <div className="phone-toolbar">
          <Link className="round-icon-button" to="/feed" aria-label="Quay lại">
            ←
          </Link>
          <div className="toolbar-pill toolbar-pill--static">Đăng khoảnh khắc</div>
          <div className="round-icon-button round-icon-button--ghost" />
        </div>

        {/* ── Camera overlay ── */}
        {cameraOpen && (
          <div className="camera-overlay">
            {cameraError ? (
              <div className="camera-overlay__error">
                <p>{cameraError}</p>
                <button className="camera-overlay__close-btn" onClick={closeCamera} type="button">
                  Đóng
                </button>
              </div>
            ) : (
              <>
                {/* Live viewfinder */}
                <video
                  ref={videoRef}
                  className={`camera-overlay__video${facingMode === "user" ? " camera-overlay__video--mirrored" : ""}`}
                  autoPlay
                  playsInline
                  muted
                />

                {/* Controls */}
                <div className="camera-overlay__controls">
                  {/* Close */}
                  <button
                    className="camera-overlay__ctrl-btn"
                    onClick={closeCamera}
                    type="button"
                    aria-label="Đóng camera"
                  >
                    ✕
                  </button>

                  {/* Shutter */}
                  <button
                    className="camera-overlay__shutter"
                    onClick={handleCapture}
                    type="button"
                    aria-label="Chụp ảnh"
                  >
                    <span />
                  </button>

                  {/* Flip camera */}
                  <button
                    className="camera-overlay__ctrl-btn"
                    onClick={flipCamera}
                    type="button"
                    aria-label="Đổi camera"
                  >
                    🔄
                  </button>
                </div>

                {/* Facing indicator */}
                <div className="camera-overlay__facing-badge">
                  {facingMode === "user" ? "📷 Camera trước" : "📷 Camera sau"}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Upload form ── */}
        <form className="editor-screen" onSubmit={handleSubmit}>
          {/* Photo frame — tap to open camera, or pick from gallery */}
          <div
            className="upload-frame upload-frame--interactive"
            role="button"
            tabIndex={0}
            onClick={previewUrl ? undefined : openCamera}
            onKeyDown={(e) => e.key === "Enter" && !previewUrl && openCamera()}
            aria-label="Mở camera"
          >
            {previewUrl ? (
              <>
                <img className="upload-frame__image" src={previewUrl} alt="Ảnh đã chụp" />
                {/* Retake button */}
                <button
                  className="upload-frame__retake-btn"
                  onClick={(e) => { e.stopPropagation(); setImageFile(null); }}
                  type="button"
                >
                  Chụp lại
                </button>
              </>
            ) : (
              <div className="upload-frame__placeholder">
                <span className="upload-frame__icon">📷</span>
                <strong>Chạm để chụp ảnh</strong>
                <p>Hoặc chọn từ thư viện bên dưới</p>
              </div>
            )}

            {/* Caption input inside the image frame at the bottom */}
            <div className="upload-frame__caption-wrap">
              <input
                className="upload-frame__caption-input"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onClick={(e) => e.stopPropagation()} /* Prevent opening camera when typing */
                placeholder="Viết 1 dòng ngắn cho khoảnh khắc này..."
                maxLength={100}
              />
            </div>
          </div>

          {/* Hidden file picker as fallback */}
          <input
            ref={fileInputRef}
            id="photo-input"
            className="file-input-hidden"
            type="file"
            accept="image/*"
            onChange={(e) => { setImageFile(e.target.files?.[0] || null); }}
          />

          {/* Gallery picker link */}
          {!previewUrl && (
            <button
              className="ghost-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              🖼️ Chọn từ thư viện ảnh
            </button>
          )}

          <div className="editor-panel">
            {error ? <p className="error-text error-text--compact">{error}</p> : null}

            <button
              className="camera-submit-button"
              type="submit"
              disabled={isSubmitting || !imageFile}
            >
              {isSubmitting ? "Đang đăng..." : "Đăng ngay"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
