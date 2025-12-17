import { useEffect, useRef, useState } from "react";

export default function SongFlow({ socket, room, name, uploadSong }) {
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [playingSong, setPlayingSong] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [displayQueue, setDisplayQueue] = useState([]);

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
        if (typeof uploadSong === "function") await uploadSong(blob);
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("錄音失敗:", err);
    }
  };

  // ⏹ 停止錄音
  const stopRecord = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // ⭐ 送出評分
  const sendScore = () => {
    if (!socket || !room) return;
    socket.emit("scoreSong", { room, score });
    setScore(0);
    setTimeLeft(0);
  };

  // ⏱️ 倒數
  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  const handleSongEnded = () => setTimeLeft(30);

  // 🔊 Socket 事件
  useEffect(() => {
    if (!socket) return;

    const playSongHandler = (song) => {
      if (!song) {
        setPlayingSong(null);
        setTimeLeft(0);
        return;
      }
      setPlayingSong({ singer: song.singer, songUrl: song.url });
      setScore(0);
      setTimeLeft(0);
    };

    const songResultHandler = ({ singer, avg, count }) => {
      alert(`🎤 ${singer} 平均分數：${avg}（${count}人評分）`);
      setPlayingSong(null);
      setScore(0);
      setTimeLeft(0);
    };

    const displayQueueHandler = (queue) => {
      setDisplayQueue(queue || []);
    };

    socket.on("playSong", playSongHandler);
    socket.on("songResult", songResultHandler);
    socket.on("displayQueueUpdate", displayQueueHandler);

    return () => {
      socket.off("playSong", playSongHandler);
      socket.off("songResult", songResultHandler);
      socket.off("displayQueueUpdate", displayQueueHandler);
    };
  }, [socket]);

  // ⏱️ 倒數結束自動送分
  useEffect(() => {
    if (timeLeft === 0 && playingSong && score > 0) sendScore();
  }, [timeLeft]);

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      {!recording ? (
        <button onClick={startRecord}>開始唱歌</button>
      ) : (
        <button onClick={stopRecord}>結束錄音</button>
      )}

      {/* 輪候列隊 */}
      {displayQueue.length > 0 && (
        <div className="song-queue">
          <h5>📋 輪候中</h5>
          {displayQueue.map((q, i) => (
            <div key={i} className="queue-item">
              {i + 1}. {q.type === "song" ? "🎤" : "🎵"} {q.name || q.singer || "未知"}
            </div>
          ))}
        </div>
      )}

      {/* 正在播放 */}
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

          {timeLeft > 0 && <div>⏱️ 評分倒數：{timeLeft} 秒</div>}

          <div className="score">
            <select value={score} onChange={(e) => setScore(+e.target.value)}>
              <option value="0">評分</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} ⭐
                </option>
              ))}
            </select>
            <button onClick={sendScore}>送出</button>
          </div>
        </div>
      )}
    </div>
  );
}
