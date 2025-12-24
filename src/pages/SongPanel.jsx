// SongPanel.jsx
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./SongPanel.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const socket = io(BACKEND, { transports: ["websocket"] });

export default function SongPanel({ room, name }) {
  const [phase, setPhase] = useState("idle"); // idle | singing | recording | scoring | listening
  const [micLevel, setMicLevel] = useState(0);
  const [myScore, setMyScore] = useState(null);
  const [avgScore, setAvgScore] = useState(null);
  const [scoreCount, setScoreCount] = useState(0);
  const [scoreCountdown, setScoreCountdown] = useState(0);
  const [queue, setQueue] = useState([]);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [joinedQueue, setJoinedQueue] = useState(false);
  const [listeningUrl, setListeningUrl] = useState(null);

  const localStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);
  const countdownRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ===== 加入隊列 =====
  const joinQueue = () => {
    if (phase !== "idle") return;
    socket.emit("joinQueue", { room, singer: name });
    setJoinedQueue(true);
    setPhase("singing"); 
  };

  // ===== 開始錄音 =====
  const startRecording = async () => {
    if (phase !== "singing") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // 麥克風音量分析
      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateMic = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const avg = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
        setMicLevel(avg / 255);
        animationIdRef.current = requestAnimationFrame(updateMic);
      };
      updateMic();

      // MediaRecorder
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        setListeningUrl(audioUrl); 
        chunksRef.current = [];

        // 計算錄音長度
        const duration = await getBlobDuration(blob);

        // 上傳
        const formData = new FormData();
        formData.append("audio", blob, "song.webm");
        formData.append("singer", name);

        const res = await fetch(`${BACKEND}/song/upload`, { method: "POST", body: formData });
        const data = await res.json();
        console.log("上傳回傳", data);

        // 廣播給其他人播放
        socket.emit("songReady", {
          room,
          singer: name,
          url: data.url,
          duration
        });

        setPhase("scoring");
        setScoreCountdown(Math.ceil(duration));
      };

      mediaRecorder.start();
      setPhase("recording");
    } catch (err) {
      console.error("🎤 錄音失敗", err);
    }
  };

  // ===== 停止錄音 =====
  const stopRecording = () => {
    if (phase !== "recording") return;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    cancelAnimationFrame(animationIdRef.current);
    animationIdRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;

    mediaRecorderRef.current?.stop();
    // 不要立刻清掉 mediaRecorderRef.current，保留 onstop 使用
  };

  // ===== 評分 =====
  const scoreSong = (score) => {
    if (phase !== "scoring") return;
    setMyScore(score);
    socket.emit("scoreSong", { room, score });
  };

  // ===== 倒數計時 =====
  useEffect(() => {
    if (phase !== "scoring" || scoreCountdown <= 0) return;
    countdownRef.current = setInterval(() => {
      setScoreCountdown((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [phase, scoreCountdown]);

  // ===== Socket 監聽 =====
  useEffect(() => {
    socket.on("queueUpdate", ({ queue, current }) => {
      setQueue(queue);
      if (current) setCurrentSinger(current); 
    });

    socket.on("songResult", ({ avg, count }) => {
      setAvgScore(avg);
      setScoreCount(count);
      setPhase("idle");
      setMyScore(null);
      setScoreCountdown(0);
      setJoinedQueue(false);
      setListeningUrl(null);
    });

    socket.on("playSong", ({ url, duration }) => {
      setListeningUrl(url);
      setScoreCountdown(Math.ceil(duration));
      setPhase("scoring");
    });

    socket.on("update-room-phase", ({ phase: newPhase, singer }) => {
      setPhase(newPhase);
      if (singer) setCurrentSinger(singer); 
    });

    const handleUnload = () => {
      stopRecording();
      if (joinedQueue) socket.emit("leaveQueue", { room, singer: name });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      socket.off("queueUpdate");
      socket.off("songResult");
      socket.off("playSong");
      socket.off("update-room-phase");
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [name, phase, joinedQueue]);

  const getBlobDuration = (blob) =>
    new Promise((resolve) => {
      const tempAudio = document.createElement("audio");
      tempAudio.src = URL.createObjectURL(blob);
      tempAudio.addEventListener("loadedmetadata", () => resolve(tempAudio.duration));
    });

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>
      <div className="status">
        當前: {currentSinger || "--"} / 我的狀態: {phase}
      </div>

      <div className="controls">
        <button onClick={joinQueue} disabled={phase !== "idle"}>加入隊列</button>
        <button onClick={startRecording} disabled={phase !== "singing" || currentSinger !== name}>開始錄音</button>
        <button onClick={stopRecording} disabled={phase !== "recording"}>停止錄音</button>
      </div>

      {(phase === "recording" || phase === "scoring") && (
        <div className="mic-meter">
          {phase === "recording" && <div className="mic-bar" style={{ width: `${micLevel * 100}%` }} />}
        </div>
      )}

      {phase === "scoring" && (
        <div className="score-container">
          <div className="score-countdown">評分倒數：{scoreCountdown} 秒</div>
          <div className="score-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={myScore >= n ? "selected" : ""} onClick={() => scoreSong(n)}>★</span>
            ))}
          </div>
        </div>
      )}

      {listeningUrl && <div>
        <audio src={listeningUrl} controls autoPlay />
      </div>}

      <div className="avg-score">
        上一位平均：{avgScore !== null ? avgScore.toFixed(1) : "--"} 分 ⭐（{scoreCount} 人）
      </div>

      <div className="queue-list">
        當前唱歌者：{currentSinger || "--"}<br />
        排隊名單：{queue.length ? queue.join(" / ") : "--"}
      </div>
    </div>
  );
}
