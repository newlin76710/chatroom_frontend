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
  const [displayQueue, setDisplayQueue] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const timerRef = useRef(null);

  const startRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunks.current = [];

    recorder.ondataavailable = (e) => audioChunks.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      if (uploadSong) await uploadSong(blob);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecord = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
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

  const handleSongEnded = () => {
    setTimeLeft(30);
  };

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
      setPlayingSong({ singer: song.singer || "未知", songUrl: song.url });
      setScore(0);
      setHoverScore(0);
      setScoreSent(false);
      setTimeLeft(0);
    });

    socket.on("songResult", ({ singer, avg, count }) => {
      alert(`🎤 ${singer || "未知"} 平均分數：${avg}（${count}人評分）`);
      setPlayingSong(null);
      setScore(0);
      setHoverScore(0);
      setScoreSent(false);
      setTimeLeft(0);
    });

    socket.on("displayQueueUpdate", (queue) => {
      setDisplayQueue(queue || []);
    });

    return () => {
      socket.off("playSong");
      socket.off("songResult");
      socket.off("displayQueueUpdate");
    };
  }, [socket]);

  useEffect(() => {
    if (timeLeft === 0 && playingSong && score > 0 && !scoreSent) {
      sendScore(score);
    }
  }, [timeLeft]);

  return (
    <div className={`song-panel floating ${collapsed ? "collapsed" : ""}`} style={{ background: "#121212", color: "#fff" }}>
      <div className="song-header" onClick={() => setCollapsed(!collapsed)}>
        <h4>🎤 唱歌區</h4>
        <button>{collapsed ? "展開" : "收起"}</button>
      </div>

      {!collapsed && (
        <>
          {!recording ? (
            <button onClick={startRecord}>開始唱歌</button>
          ) : (
            <button onClick={stopRecord}>結束錄音</button>
          )}

          {displayQueue.length > 0 && (
            <div className="song-queue">
              <h5>📋 輪候中</h5>
              {displayQueue.map((q, i) => (
                <div key={i} className="queue-item">
                  {i + 1}. {q.type || q.kind || q.mode || "🎤"} {q.name || q.singer || q.user || "未知"}
                </div>
              ))}
            </div>
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
                  <span style={{ color: timeLeft <= 5 ? "#ff4d4f" : "#ffd700", fontWeight: "bold" }}>
                    {timeLeft} 秒
                  </span>
                </div>
              )}

              <div className="score-wrapper">
                <div className="score">
                  {[1,2,3,4,5].map((n) => (
                    <span
                      key={n}
                      className={`star ${n <= (hoverScore || score) ? "active" : ""} ${scoreSent ? "disabled" : ""}`}
                      onMouseEnter={() => !scoreSent && setHoverScore(n)}
                      onMouseLeave={() => !scoreSent && setHoverScore(0)}
                      onClick={() => !scoreSent && sendScore(n)}
                    >★</span>
                  ))}
                </div>
                {scoreSent && <span className="score-value">{score} 分</span>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
