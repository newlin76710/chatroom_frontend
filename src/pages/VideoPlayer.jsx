import YouTube from "react-youtube";
import { useRef, useEffect } from "react";
import "./VideoPlayer.css";

export default function VideoPlayer({ video, extractVideoID, onClose }) {
  const playerRef = useRef(null);
  const lastVideoIdRef = useRef(null);
  const closedRef = useRef(false);

  const videoId = video ? extractVideoID(video.url) : null;

  /* ===== Player Ready ===== */
  const onPlayerReady = (event) => {
    if (closedRef.current) return;

    playerRef.current = event.target;

    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    try {
      if (isTouchDevice) {
        event.target.mute(); // 手機先靜音避免 autoplay 被擋
      } else {
        event.target.unMute();
        event.target.setVolume(100);
      }
    } catch { }
  };

  /* ===== 手機首次觸控解除靜音 ===== */
  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) return;

    const handleTouch = () => {
      try {
        playerRef.current?.unMute();
        playerRef.current?.setVolume(100);
      } catch { }

      window.removeEventListener("touchstart", handleTouch);
    };

    window.addEventListener("touchstart", handleTouch);
    return () => window.removeEventListener("touchstart", handleTouch);
  }, []);

  /* ===== 影片真的換了才播放 ===== */
  useEffect(() => {
    if (!playerRef.current || !videoId || closedRef.current) return;

    if (lastVideoIdRef.current !== videoId) {
      try {
        playerRef.current.playVideo();
        lastVideoIdRef.current = videoId;
      } catch { }
    }
  }, [videoId]);

  /* ===== 關閉播放器 ===== */
  const handleClose = () => {
    closedRef.current = true;

    try {
      if (playerRef.current) {
        playerRef.current.stopVideo();
        playerRef.current.destroy();
        playerRef.current = null;
      }
    } catch { }

    lastVideoIdRef.current = null;

    onClose?.(); // 通知父層
  };

  /* ===== Unmount 保護（超重要） ===== */
  useEffect(() => {
    return () => {
      closedRef.current = true;

      try {
        if (playerRef.current) {
          playerRef.current.stopVideo();
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } catch { }
    };
  }, []);

  return (
    <div className={`video-player-float ${!videoId ? "placeholder" : ""}`}>
      {videoId ? (
        <>
          <YouTube
            videoId={videoId}
            onReady={onPlayerReady}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0, // 建議開 → 點播就是要播
                playsinline: 1,
                controls: 1,
                rel: 0,
                modestbranding: 1,
              },
            }}
          />

          <div className="video-info">
            <span>
              🎧 正在播放（由 {video.user?.name || "未知"} 點播）
            </span>

            <button className="close-btn" onClick={handleClose}>
              ✖
            </button>
          </div>
        </>
      ) : (
        <div className="video-placeholder">
          <div className="placeholder-text">
            🎧 音樂點播中...
            <br />
            歡樂聊天盡在尋夢園
          </div>
        </div>
      )}
    </div>
  );
}
