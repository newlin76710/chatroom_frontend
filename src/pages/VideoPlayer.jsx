import YouTube from "react-youtube";
import { useRef, useEffect } from "react";

export default function VideoPlayer({ video, extractVideoID, onClose }) {
  const playerRef = useRef(null);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    // 必須先靜音才能 autoplay
    event.target.mute();
    event.target.playVideo();
  };

  useEffect(() => {
    // 只對手機或觸控裝置啟用
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) return;

    const handleTouch = () => {
      if (playerRef.current) {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      }
      // 移除事件，避免多次觸發
      window.removeEventListener('touchstart', handleTouch);
    };

    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  if (!video || !extractVideoID(video.url)) return null;

  return (
    <div className="video-player-float">
      <YouTube
        videoId={extractVideoID(video.url)}
        onReady={onPlayerReady}
        opts={{
          width: "240",
          height: "135",
          playerVars: { autoplay: 1, playsinline: 1, muted: 1 },
        }}
      />
      <div className="video-info">
        🎧 正在播放（由 {video.user} 點播）
        <button className="close-btn" onClick={onClose}>✖</button>
      </div>
    </div>
  );
}
