import { useEffect, useRef, useState } from "react";

export default function SongPanel({ socket, room, name, uploadSong }) {
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [playingSong, setPlayingSong] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // 評分倒數

  // 🎤 開始錄音
  const startRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunks.current = [];

    recorder.ondataavailable = e => audioChunks.current.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      if (uploadSong) await uploadSong(blob); // 上傳並廣播
    };

    recorder.start();
    setRecording(true);
  };

  // ⏹ 停止錄音
  const stopRecord = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // 🔊 播放房間內的歌 & 評分倒數
  useEffect(() => {
    socket.on("playSong", ({ singer, songUrl }) => {
      if (!singer || !songUrl) {
        setPlayingSong(null);
        setTimeLeft(0);
        return;
      }
      setPlayingSong({ singer, songUrl });
      setScore(0);
      setTimeLeft(0); // 評分倒數等歌曲播完再開始
    });

    socket.on("songResult", ({ singer, avg, count }) => {
      alert(`🎤 ${singer} 平均分數：${avg}（${count}人評分）`);
      setPlayingSong(null);
      setScore(0);
      setTimeLeft(0);
    });

    return () => {
      socket.off("playSong");
      socket.off("songResult");
    };
  }, [socket]);

  // ⭐ 評分倒數計時
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          sendScore(); // 倒數結束自動送出
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // ⭐ 送出評分
  const sendScore = () => {
    if (!playingSong) return;
    socket.emit("scoreSong", { room, score });
    setTimeLeft(0);
  };

  // ⭐ 歌曲播放完開始90秒倒數
  const handleSongEnded = () => {
    setTimeLeft(90);
  };

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      {!recording ? (
        <button onClick={startRecord}>開始唱歌</button>
      ) : (
        <button onClick={stopRecord}>結束錄音</button>
      )}

      {playingSong && (
        <div className="song-playing">
          <p>🎶 正在播放：{playingSong.singer}</p>
          <audio
            ref={audioRef}
            src={playingSong.songUrl}
            controls
            autoPlay
            onEnded={handleSongEnded}
          />

          {timeLeft > 0 && <p>⏱ 評分剩餘時間：{timeLeft}s</p>}

          {timeLeft > 0 && (
            <div className="score">
              <select value={score} onChange={e => setScore(+e.target.value)}>
                <option value="0">評分</option>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} ⭐</option>
                ))}
              </select>
              <button onClick={sendScore}>送出</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
