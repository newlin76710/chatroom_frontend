import { useEffect, useRef, useState } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, name, uploadSong }) {
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [playingSong, setPlayingSong] = useState(null);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [scoreSent, setScoreSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 100 }); // 浮動初始位置
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const timerRef = useRef(null);

  // 🎤 開始錄音
  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => audioChunks.current.push(e.data);

      recorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);

        setPlayingSong({ singer: name, songUrl: localUrl });
        setScore(0);
        setHoverScore(0);
        setScoreSent(false);
        setTimeLeft(0);

        setTimeout(() => {
          audioRef.current?.play().catch(() => {});
        }, 50);

        if (uploadSong && typeof uploadSong === "function") {
          await uploadSong(blob);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("錄音失敗", err);
      alert("無法取得麥克風權限");
    }
  };

  const stopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendScore = (n) => {
    if (scoreSent) return;
    setScore(n);
    setScoreSent(true);
    setHoverScore(0);
    socket.emit("scoreSong", { room, score: n });
    setTimeLeft(0);
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  const handleSongEnded = () => setTimeLeft(30);

  useEffect(() => {
    socket.on("playSong", (song) => {
      if (!song) {
        setPlayingSong(null);
        setScore(0);
        setHoverScore(0);
        setScoreSent(false);
        setTimeLeft(0);
        return;
      }
      setPlayingSong({ singer: song.singer, songUrl: song.url });
      setScore(0);
      setHoverScore(0);
      setScoreSent(false);
      setTimeLeft(0);
    });

    socket.on("songResult", ({ singer, avg, count }) => {
      alert(`🎤 ${singer} 平均分數：${avg}（${count}人評分）`);
      setPlayingSong(null);
      setScore(0);
      setHoverScore(0);
      setScoreSent(false);
      setTimeLeft(0);
    });

    return () => {
      socket.off("playSong");
      socket.off("songResult");
    };
  }, [socket]);

  useEffect(() => {
    if (timeLeft === 0 && playingSong && score > 0 && !scoreSent) sendScore(score);
  }, [timeLeft]);

  // 拖動事件
  const handleMouseDown = (e) => {
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      className={`song-panel floating ${collapsed ? "collapsed" : ""}`}
      style={{ top: position.y, left: position.x, position: "fixed", zIndex: 1000 }}
    >
      <div className="song-header" onMouseDown={handleMouseDown}>
        <h4>🎤 唱歌區</h4>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "▲ 展開" : "▼ 收起"}
        </button>
      </div>

      {!collapsed && (
        <>
          {!recording ? (
            <button onClick={startRecord}>開始唱歌</button>
          ) : (
            <button onClick={stopRecord}>結束錄音</button>
          )}

          {playingSong && (
            <div className="song-playing">
              <p>🎶 正在播放：{playingSong.singer}</p>
              <audio
                key={playingSong.songUrl}
                ref={audioRef}
                src={playingSong.songUrl}
                controls
                autoPlay
                onEnded={handleSongEnded}
              />
              {timeLeft > 0 && (
                <div className="score-timer">
                  ⏱️ 評分倒數：
                  <span
                    style={{
                      color: timeLeft <= 5 ? "#ff4d4f" : "#ffd700",
                      fontWeight: "bold",
                    }}
                  >
                    {timeLeft} 秒
                  </span>
                </div>
              )}
              <div className="score-wrapper">
                <div className="score">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`star ${n <= (hoverScore || score) ? "active" : ""} ${
                        scoreSent ? "disabled" : ""
                      }`}
                      onMouseEnter={() => !scoreSent && setHoverScore(n)}
                      onMouseLeave={() => !scoreSent && setHoverScore(0)}
                      onClick={() => !scoreSent && sendScore(n)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {scoreSent && <span className="score-value">{score} 分</span>}
              </div>
            </div>
          )}
        </>
      )}

      {!collapsed && !recording && !playingSong && <p className="info-text">尚未開始唱歌</p>}
    </div>
  );
}
