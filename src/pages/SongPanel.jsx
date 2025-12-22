import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { io } from "socket.io-client";
import "./SongPanel.css";
import * as mediasoupClient from "mediasoup-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const socket = io(BACKEND, { transports: ["websocket"] });

export default function SongPanel({ room, name }) {
  const [phase, setPhase] = useState("idle"); // idle | singing | scoring
  const [micLevel, setMicLevel] = useState(0);
  const [myScore, setMyScore] = useState(null);
  const [avgScore, setAvgScore] = useState(null);
  const [scoreCount, setScoreCount] = useState(0);
  const [scoreCountdown, setScoreCountdown] = useState(0);

  const localStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);
  const countdownRef = useRef(null);

  // ===== Mediasoup =====
  const deviceRef = useRef(null);
  const producerTransportRef = useRef(null);
  const consumerTransportsRef = useRef([]);
  const producersRef = useRef([]);
  const consumersRef = useRef([]);

  // ===== YouTube =====
  const ytRef = useRef(null);

  // ===== 開始唱歌 =====
  const startSinging = async () => {
    if (phase !== "idle") return;

    try {
      // ===== MediaStream =====
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Mic meter
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

      // ===== Mediasoup Client Device =====
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      // 從後端獲取 router rtpCapabilities
      const { rtpCapabilities } = await fetch(`${BACKEND}/mediasoup-rtpCapabilities`).then(r => r.json());
      await device.load({ routerRtpCapabilities: rtpCapabilities });

      // ===== 建立 Transport =====
      socket.emit("create-transport", null, async transportInfo => {
        const transport = device.createSendTransport(transportInfo);
        producerTransportRef.current = transport;

        transport.on("connect", ({ dtlsParameters }, callback, errCallback) => {
          socket.emit("connect-transport", { transportId: transport.id, dtlsParameters });
          callback();
        });

        transport.on("produce", async ({ kind, rtpParameters }, callback, errCallback) => {
          socket.emit("produce", { transportId: transport.id, kind, rtpParameters }, ({ id }) => {
            callback({ id });
          });
        });

        // ===== Produce 音訊 =====
        const track = stream.getAudioTracks()[0];
        await transport.produce({ track });
      });

      socket.emit("start-singing", { room, singer: name });

      setPhase("singing");
      setMyScore(null);
      setAvgScore(0);
      setScoreCount(0);

    } catch (err) {
      console.error("🎤 麥克風取得失敗", err);
    }
  };

  // ===== 停止唱歌 =====
  const stopSinging = () => {
    if (phase !== "singing") return;

    producerTransportRef.current?.close();
    producerTransportRef.current = null;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    cancelAnimationFrame(animationIdRef.current);
    audioCtxRef.current?.close();

    setMicLevel(0);
    setPhase("scoring");
    setScoreCountdown(15);

    socket.emit("stop-singing", { room, singer: name });
  };

  // ===== 評分 =====
  const scoreSong = score => {
    if (phase !== "scoring") return;
    setMyScore(score);
    socket.emit("scoreSong", { room, score });
  };

  // ===== 評分倒數 =====
  useEffect(() => {
    if (phase !== "scoring") return;
    countdownRef.current = setInterval(() => {
      setScoreCountdown(s => {
        if (s <= 1) { clearInterval(countdownRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [phase]);

  // ===== 接收結果 =====
  useEffect(() => {
    socket.on("songResult", ({ avg, count }) => {
      setAvgScore(avg);
      setScoreCount(count);
      setPhase("idle");
      setMyScore(null);
      setScoreCountdown(0);
    });
    return () => socket.off("songResult");
  }, []);

  // ===== YouTube 伴奏 =====
  const onReady = event => {
    ytRef.current = event.target;
    ytRef.current.playVideo();
  };

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      <YouTube videoId="VIDEO_ID_HERE" opts={{ width: "100%", playerVars: { autoplay: 1 } }} onReady={onReady} />

      <div className="controls">
        <button onClick={startSinging} disabled={phase !== "idle"}>開始唱歌</button>
        <button onClick={stopSinging} disabled={phase !== "singing"}>停止唱歌</button>
      </div>

      {(phase === "singing" || phase === "scoring") && (
        <div className="mic-meter">
          {phase === "singing" && <div className="mic-bar" style={{ width: `${micLevel * 100}%` }} />}
        </div>
      )}

      {phase === "scoring" && (
        <div className="score-container">
          <div className="score-countdown">評分倒數：{scoreCountdown} 秒</div>
          <div className="score-stars">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={myScore >= n ? "selected" : ""} onClick={() => scoreSong(n)}>★</span>
            ))}
          </div>
        </div>
      )}

      <div className="avg-score">
        上一位平均：{avgScore !== null ? avgScore.toFixed(1) : "--"} 分 ⭐（{scoreCount} 人）
      </div>
    </div>
  );
}
