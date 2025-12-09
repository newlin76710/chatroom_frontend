import YouTube from "react-youtube";
import { useRef, useEffect } from "react";

export default function VideoPlayer({ video, extractVideoID, onClose }) {
  const playerRef = useRef(null);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      // 手機：先靜音才能 autoplay
      event.target.mute();
    } else {
      // 桌面：直接播放，不靜音
      event.target.unMute();
      event.target.setVolume(100);
    }

    event.target.playVideo();
  };

  useEffect(() => {
    // 手機解除靜音
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const handleTouch = () => {
      if (playerRef.current) {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      }
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
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            muted: 0, // 讓桌面播放有聲音
          },
        }}
      />
      <div className="video-info">
        🎧 正在播放（由 {video.user} 點播）
        <button className="close-btn" onClick={onClose}>✖</button>
      </div>
    </div>
  );
}
