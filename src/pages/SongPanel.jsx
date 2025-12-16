import { useEffect, useRef, useState } from "react";

export default function SongPanel({ socket, room, name, uploadSong }) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [score, setScore] = useState(0);
  const audioRef = useRef(null);
  const scoreTimeoutRef = useRef(null);

  // 🎤 開始錄音
  const startRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = e => audioChunksRef.current.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (uploadSong) {
        await uploadSong(blob);
      }
    };

    recorder.start();
    setRecording(true);
  };

  // ⏹ 停止錄音
  const stopRecord = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // 🔊 接收播放歌曲事件
  useEffect(() => {
    socket.on("playSong", (song) => {
      if (!song) return;
      setQueue(prev => [...prev, song]);
      if (!currentSong) playNext();
    });

    socket.on("songResult", () => {
      // 評分完成 → 播下一首
      clearTimeout(scoreTimeoutRef.current);
      playNext();
    });

    return () => {
      socket.off("playSong");
      socket.off("songResult");
      clearTimeout(scoreTimeoutRef.current);
    };
  }, [currentSong]);

  const playNext = () => {
    setScore(0);
    setCurrentSong(prev => {
      if (!queue.length) return null;
      const [next, ...rest] = queue;
      setQueue(rest);

      // 開啟自動評分結算 5 秒
      scoreTimeoutRef.current = setTimeout(() => {
        if (next) {
          socket.emit("scoreSong", { room, score: 0 });
        }
      }, 5000);

      return next;
    });
  };

  // ⭐ 送出評分
  const sendScore = () => {
    if (!currentSong) return;
    clearTimeout(scoreTimeoutRef.current); // 已送出則取消自動結算
    socket.emit("scoreSong", { room, score });
  };

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      {!recording ? (
        <button onClick={startRecord}>開始唱歌</button>
      ) : (
        <button onClick={stopRecord}>結束錄音</button>
      )}

      {currentSong && (
        <div className="song-playing">
          <p>🎶 正在播放：{currentSong.singer}</p>
          <audio ref={audioRef} src={currentSong.songUrl} controls autoPlay />

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
