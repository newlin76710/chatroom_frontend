import { useEffect, useRef, useState } from "react";

export default function SongPanel({ socket, room, name, uploadSong }) {
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [playingSong, setPlayingSong] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // ✅ 新增：顯示用列隊
  const [displayQueue, setDisplayQueue] = useState([]);

  const timerRef = useRef(null);

  // 🎤 開始錄音
  const startRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunks.current = [];

    recorder.ondataavailable = e => audioChunks.current.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      if (uploadSong) await uploadSong(blob);
    };

    recorder.start();
    setRecording(true);
  };

  // ⏹ 停止錄音
  const stopRecord = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // ⭐ 送出評分
  const sendScore = () => {
    socket.emit("scoreSong", { room, score });
    setScore(0);
    setTimeLeft(0);
  };

  // ⏱️ 倒數
  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  const handleSongEnded = () => {
    setTimeLeft(30); // 歌播完才開始 30 秒
  };

  // 🔊 Socket 事件
  useEffect(() => {
    socket.on("playSong", song => {
      if (!song) {
        setPlayingSong(null);
        setTimeLeft(0);
        return;
      }
      setPlayingSong({ singer: song.singer, songUrl: song.url });
      setScore(0);
      setTimeLeft(0);
    });

    socket.on("songResult", ({ singer, avg, count }) => {
      alert(`🎤 ${singer} 平均分數：${avg}（${count}人評分）`);
      setPlayingSong(null);
      setScore(0);
      setTimeLeft(0);
    });

    // ✅ 新增：只顯示列隊
    socket.on("displayQueueUpdate", queue => {
      setDisplayQueue(queue || []);
    });

    return () => {
      socket.off("playSong");
      socket.off("songResult");
      socket.off("displayQueueUpdate");
    };
  }, [socket]);

  // ⏱️ 倒數結束自動送分
  useEffect(() => {
    if (timeLeft === 0 && playingSong && score > 0) {
      sendScore();
    }
  }, [timeLeft]);

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      {!recording ? (
        <button onClick={startRecord}>開始唱歌</button>
      ) : (
        <button onClick={stopRecord}>結束錄音</button>
      )}

      {/* ✅ 輪候列隊（純顯示） */}
      {displayQueue.length > 0 && (
        <div className="song-queue">
          <h5>📋 輪候中</h5>
          {displayQueue.map((q, i) => (
            <div key={i} className="queue-item">
              {i + 1}. {q.type === "song" ? "🎤" : "🎵"} {q.name}
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
            <div>⏱️ 評分倒數：{timeLeft} 秒</div>
          )}

          <div className="score">
            <select value={score} onChange={e => setScore(+e.target.value)}>
              <option value="0">評分</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} ⭐</option>
              ))}
            </select>
            <button onClick={sendScore}>送出</button>
          </div>
        </div>
      )}
    </div>
  );
}
