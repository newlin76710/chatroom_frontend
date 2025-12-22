import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import "./SongPanel.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const socket = io(BACKEND, { transports: ["websocket"] });

export default function SongPanel({ room, name }) {
  const [phase, setPhase] = useState("idle"); // idle | singing | scoring | canListen
  const [micLevel, setMicLevel] = useState(0);
  const [myScore, setMyScore] = useState(null);
  const [avgScore, setAvgScore] = useState(null);
  const [scoreCount, setScoreCount] = useState(0);
  const [scoreCountdown, setScoreCountdown] = useState(0);
  const [queue, setQueue] = useState([]);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [joinedQueue, setJoinedQueue] = useState(false);

  const localStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);
  const countdownRef = useRef(null);

  // mediasoup
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const producerRef = useRef(null);

  const startedRef = useRef(false);

  // ===== 加入隊列 =====
  const joinQueue = () => {
    if (joinedQueue || phase === "singing") return;
    socket.emit("joinQueue", { room, singer: name });
    setJoinedQueue(true);
  };

  // ===== 開始唱歌 =====
  const startSinging = async () => {
    if (phase === "singing") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // 音量分析
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

      // ===== 初始化 mediasoup client =====
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      const { rtpCapabilities } = await fetch(`${BACKEND}/mediasoup-rtpCapabilities`).then(r => r.json());
      await device.load({ routerRtpCapabilities: rtpCapabilities });

      // 建立 sendTransport
      socket.emit("create-transport", { direction: "send" }, async transportInfo => {
        const transport = device.createSendTransport(transportInfo);
        sendTransportRef.current = transport;

        transport.on("connect", ({ dtlsParameters }, callback) => {
          socket.emit("connect-transport", { transportId: transport.id, dtlsParameters });
          callback();
        });

        transport.on("produce", async ({ kind, rtpParameters }, callback) => {
          socket.emit("produce", { transportId: transport.id, kind, rtpParameters }, ({ id }) => callback({ id }));
        });

        const track = stream.getAudioTracks()[0];
        const producer = await transport.produce({ track });
        producerRef.current = producer;
      });

      setPhase("singing");
      setMyScore(null);
      setAvgScore(0);
      setScoreCount(0);
      startedRef.current = true;
    } catch (err) {
      console.error("🎤 麥克風失敗", err);
    }
  };

  // ===== 停止唱歌 =====
  const stopSinging = () => {
    if (phase !== "singing") return;

    // 停止本地音訊
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    cancelAnimationFrame(animationIdRef.current);
    animationIdRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    startedRef.current = false;

    // 停止 mediasoup producer
    producerRef.current?.close();
    producerRef.current = null;
    sendTransportRef.current?.close();
    sendTransportRef.current = null;

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

  // ===== 倒數計時 =====
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

  // ===== Socket 監聽 =====
  useEffect(() => {
    socket.on("queueUpdate", ({ queue, current }) => {
      setQueue(queue);
      setCurrentSinger(current);

      if (current === name && !startedRef.current) startSinging();
    });

    socket.on("songResult", ({ avg, count }) => {
      setAvgScore(avg);
      setScoreCount(count);
      setPhase("idle");
      setMyScore(null);
      setScoreCountdown(0);
      setJoinedQueue(false);
      startedRef.current = false;
    });

    return () => {
      socket.off("queueUpdate");
      socket.off("songResult");
    };
  }, [name]);

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>
      <div className="status">等待輪到你唱歌... (當前: {currentSinger || "無"})</div>

      <div className="controls">
        <button onClick={joinQueue} disabled={phase === "singing" || phase === "scoring" || joinedQueue}>加入隊列</button>
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
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} className={myScore >= n ? "selected" : ""} onClick={() => scoreSong(n)}>★</span>
            ))}
          </div>
        </div>
      )}

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
