import { useEffect, useRef, useState } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, name }) {
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [canSing, setCanSing] = useState(true);
  const [score, setScore] = useState(0);       // 自己給的分
  const [hoverScore, setHoverScore] = useState(0);
  const [scoreSent, setScoreSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [avgScore, setAvgScore] = useState(null); // 平均分
  const timerRef = useRef(null);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  // ----- 開始唱歌 -----
  const startRecord = async () => {
    if (!canSing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      pcRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });

      stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));

      pcRef.current.ontrack = (event) => {
        audioRef.current.srcObject = event.streams[0];
        audioRef.current.volume = muted ? 0 : volume;
        audioRef.current.play().catch(() => {});
      };

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-candidate", { room, candidate: event.candidate });
        }
      };

      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit("webrtc-offer", { room, offer });

      setRecording(true);
      setCanSing(false);
      socket.emit("start-singing", { room, singer: name });
    } catch (err) {
      console.error("取得麥克風失敗", err);
      alert("無法取得麥克風權限");
    }
  };

  // ----- 結束唱歌 -----
  const stopRecord = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    setRecording(false);
    socket.emit("stop-singing", { room, singer: name });

    // 開始 15 秒評分倒數
    setTimeLeft(15);
    setScoreSent(false);
  };

  // ----- 評分倒數 -----
  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  const sendScore = (n) => {
    if (scoreSent) return;
    setScore(n);
    setScoreSent(true);
    setHoverScore(0);
    socket.emit("scoreSong", { room, score: n });
  };

  // ----- WebRTC & 唱歌事件 -----
  useEffect(() => {
    socket.on("webrtc-offer", async ({ offer, sender }) => {
      if (sender === name) return;
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });

      pc.ontrack = (event) => {
        audioRef.current.srcObject = event.streams[0];
        audioRef.current.volume = muted ? 0 : volume;
        audioRef.current.play().catch(() => {});
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-candidate", { room, candidate: event.candidate, to: sender });
        }
      };

      pcRef.current = pc;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { room, answer, to: sender });
    });

    socket.on("webrtc-answer", async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(answer);
    });

    socket.on("webrtc-candidate", async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(candidate); }
      catch(err){ console.warn("Add ICE candidate failed:", err); }
    });

    socket.on("user-start-singing", () => setCanSing(false));
    socket.on("user-stop-singing", () => setCanSing(true));

    // 後端送來結算平均分
    socket.on("songResult", ({ singer, avg, count }) => {
      setAvgScore(avg);
      alert(`🎵 ${singer} 演唱結束\n平均分：${avg} 分\n參與人數：${count} 人`);
    });

    return () => {
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-candidate");
      socket.off("user-start-singing");
      socket.off("user-stop-singing");
      socket.off("songResult");
    };
  }, [socket, muted, volume]);

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>
      <div className="controls">
        {!recording ? (
          <button disabled={!canSing} onClick={startRecord}>開始唱歌</button>
        ) : (
          <button onClick={stopRecord}>結束唱歌</button>
        )}
      </div>

      <audio ref={audioRef} autoPlay />

      {timeLeft > 0 && (
        <div className="score-section">
          ⏱️ 評分倒數：<span>{timeLeft} 秒</span>
          <div className="score-stars">
            {[1,2,3,4,5].map(n => (
              <span
                key={n}
                className={`star ${n <= (hoverScore || score) ? "active" : ""}`}
                onMouseEnter={() => !scoreSent && setHoverScore(n)}
                onMouseLeave={() => !scoreSent && setHoverScore(0)}
                onClick={() => !scoreSent && sendScore(n)}
              >★</span>
            ))}
          </div>
          {scoreSent && <div className="your-score">你給了：{score} 分</div>}
        </div>
      )}

      {avgScore !== null && <div className="avg-score">平均分：{avgScore} 分</div>}
    </div>
  );
}
