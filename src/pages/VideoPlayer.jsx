import YouTube from "react-youtube";
import { useRef, useEffect } from "react";

export default function VideoPlayer({ video, extractVideoID, onClose }) {
  const playerRef = useRef(null);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) event.target.mute();
    else {
      event.target.unMute();
      event.target.setVolume(100);
    }

    event.target.playVideo();
  };

  useEffect(() => {
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
    return () => window.removeEventListener('touchstart', handleTouch);
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
            muted: 0,
          },
        }}
      />
      <div className="video-info">
        🎧 正在播放（由 {video.user?.name || "未知"} 點播）
        <button className="close-btn" onClick={onClose}>✖</button>
      </div>
    </div>
  );
}
