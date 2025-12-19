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
  const [position, setPosition] = useState({ x: 50, y: 100 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const timerRef = useRef(null);

  const [liveSingers, setLiveSingers] = useState([]);
  const [singerVolumes, setSingerVolumes] = useState({});
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const audioCtxRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  const singerBuffersRef = useRef({}); // { singer: [{ buffer }] }

  // 🎤 開始錄音 + 即時廣播
  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          socket.emit("voice-broadcast", { room, singer: name, chunk: e.data });
          audioChunks.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);

        setPlayingSong({ singer: name, songUrl: localUrl });
        setScore(0);
        setHoverScore(0);
        setScoreSent(false);
        setTimeLeft(0);

        setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
      };

      recorder.start(250);
      setRecording(true);

      socket.emit("start-singing", { room, singer: name });
      setLiveSingers((prev) => [...new Set([...prev, name])]);
    } catch (err) {
      console.error("錄音失敗", err);
      alert("無法取得麥克風權限");
    }
  };

  const stopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
      socket.emit("stop-singing", { room, singer: name });
      setLiveSingers((prev) => prev.filter((s) => s !== name));
      setSingerVolumes((prev) => ({ ...prev, [name]: 0 }));
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

  // --- 接收其他人語音 & 唱歌狀態 ---
  useEffect(() => {
    socket.on("voice-broadcast", async ({ singer, chunk }) => {
      const arrayBuffer = await chunk.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);

      if (!singerBuffersRef.current[singer]) singerBuffersRef.current[singer] = [];
      singerBuffersRef.current[singer].push({ buffer: audioBuffer });

      schedulePlayback(singer);

      // 計算音量
      const channelData = audioBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) sum += channelData[i] ** 2;
      const rms = Math.sqrt(sum / channelData.length);
      setSingerVolumes((prev) => ({ ...prev, [singer]: rms }));
    });

    socket.on("user-start-singing", ({ singer }) => {
      setLiveSingers((prev) => [...new Set([...prev, singer])]);
    });

    socket.on("user-stop-singing", ({ singer }) => {
      setLiveSingers((prev) => prev.filter((s) => s !== singer));
      setSingerVolumes((prev) => ({ ...prev, [singer]: 0 }));
    });

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
      socket.off("voice-broadcast");
      socket.off("user-start-singing");
      socket.off("user-stop-singing");
      socket.off("playSong");
      socket.off("songResult");
    };
  }, [socket, muted, volume]);

  const schedulePlayback = (singer) => {
    const queue = singerBuffersRef.current[singer];
    if (!queue || queue.length === 0) return;

    const ctx = audioCtxRef.current;
    const delay = 0.2;
    let startTime = ctx.currentTime + delay;

    while (queue.length) {
      const { buffer } = queue.shift();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = muted ? 0 : volume;
      source.connect(gainNode).connect(ctx.destination);
      source.start(startTime);
      startTime += buffer.duration;
    }
  };

  useEffect(() => {
    if (timeLeft === 0 && playingSong && score > 0 && !scoreSent) sendScore(score);
  }, [timeLeft]);

  // --- 拖動事件 ---
  const handleMouseDown = (e) => {
    setDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
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
      style={{ top: position.y, left: position.x }}
    >
      <div className="song-header" onMouseDown={handleMouseDown}>
        <h4>🎤 唱歌區</h4>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "▲ 展開" : "▼ 收起"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* 正在唱歌列表 + 音量條 */}
          {liveSingers.length > 0 && (
            <div className="live-singers">
              {liveSingers.map((singer) => (
                <div key={singer} className="singer-item">
                  <span>{singer}</span>
                  <div className="singer-volume-bar">
                    <div
                      className="singer-volume-fill"
                      style={{
                        width: `${Math.min((singerVolumes[singer] || 0) * 3 * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 音量控制 */}
          <div className="volume-control">
            <label>
              音量：
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                }}
              />
            </label>
            <button
              onClick={() => setMuted(!muted)}
            >
              {muted ? "解除靜音" : "靜音"}
            </button>
          </div>

          {!recording ? (
            <button onClick={startRecord}>開始唱歌</button>
          ) : (
            <button onClick={stopRecord}>結束唱歌</button>
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
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`star ${n <= (hoverScore || score) ? "active" : ""} ${scoreSent ? "disabled" : ""}`}
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
