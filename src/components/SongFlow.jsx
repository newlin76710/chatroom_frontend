import { useEffect, useRef, useState } from "react";

export default function SongFlow({ socket, room, name, uploadSong }) {
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [queueSong, setQueueSong] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [songResult, setSongResult] = useState(null);

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
  const submitScore = (s) => {
    if (submitted) return;
    setScore(s);
    setSubmitted(true);
    socket.emit("scoreSong", { room, score: s });
  };

  // ⭐ 星星互動
  const renderStars = () => (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star ${n <= score ? "active" : ""} ${submitted ? "locked" : ""}`}
          onMouseEnter={() => !submitted && setScore(n)}
          onMouseLeave={() => !submitted && setScore(0)}
          onClick={() => submitScore(n)}
        >
          ★
        </span>
      ))}
    </div>
  );

  // ⏱ 倒數計時
  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  // 倒數結束自動送分
  useEffect(() => {
    if (timeLeft === 0 && currentSong && score > 0 && !submitted) {
      submitScore(score);
    }
  }, [timeLeft]);

  const handleSongEnded = () => {
    setTimeLeft(30); // 播放完才開始 30 秒評分
  };

  // 🔊 接收後端歌曲播放
  useEffect(() => {
    socket.on("playSong", (song) => {
      if (!song) {
        setCurrentSong(null);
        setQueueSong(null);
        setTimeLeft(0);
        return;
      }
      setCurrentSong({ singer: song.singer, songUrl: song.url });
      setQueueSong(song);
      setScore(0);
      setSubmitted(false);
      setTimeLeft(0);
      setSongResult(null);
    });

    socket.on("songResult", ({ singer, avg, count }) => {
      setSongResult({ singer, avg, count });
      setCurrentSong(null);
      setScore(0);
      setSubmitted(false);
      setTimeLeft(0);
    });

    return () => {
      socket.off("playSong");
      socket.off("songResult");
    };
  }, [socket]);

  return (
    <div className="song-flow">
      <h4>🎤 唱歌區</h4>
      {!recording ? (
        <button onClick={startRecord}>開始唱歌</button>
      ) : (
        <button onClick={stopRecord}>結束錄音</button>
      )}

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

          {timeLeft > 0 && (
            <div>
              ⏱️ 評分倒數：{timeLeft} 秒
              {renderStars()}
            </div>
          )}

          {submitted && (
            <div className="rated">已評分：{score} 星</div>
          )}
        </div>
      )}

      {songResult && (
        <div className="song-result">
          🎉 <strong>{songResult.singer}</strong> 平均分：⭐ {songResult.avg} （{songResult.count} 人評分）
        </div>
      )}
    </div>
  );
}
