import { useEffect, useRef, useState } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, name }) {
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [canSing, setCanSing] = useState(true);
  const [queue, setQueue] = useState([]);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [scoreSent, setScoreSent] = useState(false);
  const [avgScore, setAvgScore] = useState(null);
  const timerRef = useRef(null);

  // ----- 開始唱歌 -----
  const startRecord = async () => {
    if (!canSing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        audioRef.current.srcObject = event.streams[0];
        audioRef.current.play().catch(() => {});
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-candidate", { room, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { room, offer, sender: name });

      pcRef.current = pc;

      setRecording(true);
      setCanSing(false);
      socket.emit("start-singing", { room, singer: name });
    } catch (err) {
      console.error(err);
      alert("無法取得麥克風權限");
    }
  };

  // ----- 停止唱歌 -----
  const stopRecord = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    setRecording(false);
    socket.emit("stop-singing", { room, singer: name });

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

  // ----- Socket 事件 -----
  useEffect(() => {
    socket.on("queue-update", ({ queue }) => setQueue(queue));
    socket.on("start-singer", ({ singer }) => setCurrentSinger(singer));
    socket.on("stop-singer", () => setCurrentSinger(null));
    socket.on("songResult", ({ singer, avg }) => setAvgScore(avg));

    // WebRTC 信令
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
      catch(err){ console.warn(err); }
    });

    return () => {
      socket.off("queue-update");
      socket.off("start-singer");
      socket.off("stop-singer");
      socket.off("songResult");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-candidate");
    };
  }, [socket, name]);

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

      <div className="queue">
        <strong>排隊：</strong> {queue.join(", ")}
      </div>

      <audio ref={audioRef} autoPlay />

      {timeLeft > 0 && (
        <div className="score-section">
          ⏱️ 評分倒數：{timeLeft} 秒
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
          {scoreSent && <div>你給了：{score} 分</div>}
        </div>
      )}

      {avgScore !== null && <div>平均分：{avgScore} 分</div>}
      {currentSinger && <div>正在唱歌：{currentSinger}</div>}
    </div>
  );
}
