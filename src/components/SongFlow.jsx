import { useEffect, useRef, useState } from "react";

export default function SongFlow({ socket, room, name, uploadSong, currentSong, songResult, displayQueue }) {
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

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
    if (score > 0) socket.emit("scoreSong", { room, score });
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
    setTimeLeft(30);
  };

  // 自動送分
  useEffect(() => {
    if (timeLeft === 0 && score > 0) sendScore();
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
      {displayQueue && displayQueue.length > 0 && (
        <div className="song-queue">
          <h5>📋 輪候中</h5>
          {displayQueue.map((q, i) => (
            <div key={i}>
              {i + 1}. {q.type === "song" ? "🎤" : "🎵"} {q.name || q.singer || "未知"}
            </div>
          ))}
        </div>
      )}

      {/* 播放歌曲 */}
      {currentSong && (
        <div className="song-playing">
          <p>🎶 正在播放：{currentSong.singer}</p>
          <audio
            key={currentSong.songUrl}
            ref={audioRef}
            src={currentSong.songUrl}
            controls
            autoPlay
            onEnded={handleSongEnded}
          />

          {timeLeft > 0 && <div>⏱️ 評分倒數：{timeLeft} 秒</div>}

          <div className="score">
            <select value={score} onChange={e => setScore(+e.target.value)}>
              <option value="0">評分</option>
              {[1,2,3,4,5].map(n => (
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
