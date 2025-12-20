import { useEffect, useRef, useState } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, name }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isListener, setIsListener] = useState(false);

  // 評分
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [scoreSent, setScoreSent] = useState(false);
  const timerRef = useRef(null);

  // 音量
  const [micLevel, setMicLevel] = useState(0);

  /* ========================
     WebRTC（所有人都能聽）
  ======================== */
  const ensurePC = () => {
    if (pcRef.current) return;

    pcRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pcRef.current.ontrack = (e) => {
      audioRef.current.srcObject = e.streams[0];
      audioRef.current.play().catch(() => { });
      setIsListener(true); // ⭐ 一定要有
      socket.emit("listener-ready", { room });
    };

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("webrtc-candidate", { room, candidate: e.candidate });
      }
    };
  };

  useEffect(() => {
    ensurePC();
  }, []);

  /* ========================
     排隊 & 開唱
  ======================== */
  const joinQueue = () => {
    socket.emit("join-queue", { room, name });
  };

  const startSinging = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    stream.getTracks().forEach(t => pcRef.current.addTrack(t, stream));

    // 麥克風音量
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setMicLevel(avg);
      if (recording) requestAnimationFrame(tick);
    };
    setRecording(true);
    tick();

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socket.emit("webrtc-offer", { room, offer });
  };

  const stopSinging = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setRecording(false);
    socket.emit("stop-singing", { room });

    setTimeLeft(15);
    setScoreSent(false);
  };

  /* ========================
     評分
  ======================== */
  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  const sendScore = (n) => {
    if (scoreSent) return;
    setScore(n);
    setScoreSent(true);
    socket.emit("scoreSong", { room, score: n });
  };

  /* ========================
     Socket 事件
  ======================== */
  useEffect(() => {
    socket.on("queue-update", ({ queue }) => setQueue(queue));

    socket.on("start-singer", ({ singer }) => {
      ensurePC();              // ⭐ listener 一定要先準備好
      setCurrentSinger(singer);
      setIsListener(false);   // ⭐ 很重要
      setTimeLeft(0);
      setScore(0);
      setScoreSent(false);

      if (singer === name) startSinging();
    });


    socket.on("stop-singer", () => {
      setCurrentSinger(null);
      setRecording(false);
      setMicLevel(0);
    });

    socket.on("webrtc-offer", async ({ offer }) => {
      ensurePC(); // ⭐⭐⭐ 必須補這行
      await pcRef.current.setRemoteDescription(offer);
      const ans = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(ans);
      socket.emit("webrtc-answer", { room, answer: ans });
    });

    socket.on("webrtc-answer", async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(answer);
    });

    socket.on("webrtc-candidate", async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(candidate); } catch { }
    });

    socket.on("songResult", ({ singer, avg }) => {
      alert(`🎤 ${singer} 平均分：${avg}`);
    });

    return () => socket.off();
  }, [recording]);

  /* ========================
     UI
  ======================== */
  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      <div className="now-singing">
        {currentSinger ? `🎶 現在演唱：${currentSinger}` : "尚未開始"}
      </div>

      {recording && (
        <div className="mic-meter">
          <div className="mic-bar" style={{ width: `${Math.min(micLevel, 100)}%` }} />
        </div>
      )}

      {!currentSinger && (
        <button onClick={joinQueue} disabled={currentSinger === name}>
          {queue.includes(name) ? "已在排隊中" : "加入唱歌排隊"}
        </button>
      )}

      {currentSinger === name && recording && (
        <button onClick={stopSinging}>結束演唱</button>
      )}

      {queue.length > 0 && (
        <div className="queue">
          ⏳ 排隊中：{queue.join(" → ")}
        </div>
      )}

      <audio
        ref={audioRef}
        autoPlay
        playsInline
        controls={false}
      />

      {/* ===== 評分區（統一放這裡） ===== */}
      {timeLeft > 0 && (
        <>
          {/* 1️⃣ 自己唱歌 → 禁止評分 */}
          {currentSinger === name && (
            <div className="score-section disabled">
              🚫 你不能幫自己評分
            </div>
          )}

          {/* 2️⃣ 沒聽到聲音 → 禁止評分 */}
          {currentSinger !== name && !isListener && (
            <div className="score-section disabled">
              🔇 尚未接收到聲音，無法評分
            </div>
          )}

          {/* 3️⃣ 正常評分（聽到＋不是自己） */}
          {currentSinger !== name && isListener && (
            <div className="score-section">
              ⏱️ 評分倒數：<span>{timeLeft} 秒</span>

              {!scoreSent ? (
                <div className="score-stars">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span
                      key={n}
                      className={`star ${n <= (hoverScore || score) ? "active" : ""}`}
                      onMouseEnter={() => setHoverScore(n)}
                      onMouseLeave={() => setHoverScore(0)}
                      onClick={() => sendScore(n)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              ) : (
                <div className="your-score">
                  你給了：{score} 分
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
