import YouTube from "react-youtube";
import { useRef, useEffect } from "react";
import "./VideoPlayer.css";

export default function VideoPlayer({ video, extractVideoID, onClose }) {
  const playerRef = useRef(null);
  const lastVideoIdRef = useRef(null);

  const videoId = video ? extractVideoID(video.url) : null;

  /* ===== Player Ready ===== */
  const onPlayerReady = (event) => {
    playerRef.current = event.target;

    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      event.target.mute(); // 行動裝置預設靜音
    } else {
      event.target.unMute();
      event.target.setVolume(100);
    }
  };

  /* ===== 行動裝置：首次觸控解除靜音 ===== */
  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) return;

    const handleTouch = () => {
      try {
        if (playerRef.current) {
          playerRef.current.unMute();
          playerRef.current.setVolume(100);
        }
      } catch {}
      window.removeEventListener("touchstart", handleTouch);
    };

    window.addEventListener("touchstart", handleTouch);
    return () => window.removeEventListener("touchstart", handleTouch);
  }, []);

  /* ===== 只有「影片真的換了」才播放 ===== */
  useEffect(() => {
    if (!playerRef.current || !videoId) return;

    if (lastVideoIdRef.current !== videoId) {
      try {
        playerRef.current.playVideo();
        lastVideoIdRef.current = videoId;
      } catch (err) {
        console.warn("playVideo 失敗（已忽略）", err);
      }
    }
  }, [videoId]);

  /* ===== 關閉影片（安全釋放） ===== */
  const handleClose = () => {
    try {
      playerRef.current?.stopVideo();
      playerRef.current?.destroy();
    } catch {}
    onClose();
  };

  return (
    <div className="video-player-float">
      {videoId ? (
        <>
          <YouTube
            key={videoId} // ⭐ 防止 iframe 重建炸 React
            videoId={videoId}
            onReady={onPlayerReady}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                playsinline: 1,
                controls: 1,
                rel: 0,
                muted: 0,
              },
            }}
          />

          <div className="video-info">
            🎧 正在播放（由 {video.user?.name || "未知"} 點播）
            <button className="close-btn" onClick={handleClose}>
              ✖
            </button>
          </div>
        </>
      ) : (
        <div className="video-placeholder">🎬 尚未播放影片</div>
      )}
    </div>
  );
}
