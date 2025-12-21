import { useRef, useState, useEffect } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room }) {
  const [isSinging, setIsSinging] = useState(false);
  const [listeners, setListeners] = useState([]);
  const [micLevel, setMicLevel] = useState(0);

  const localStreamRef = useRef(null);
  const pcsRef = useRef(new Map()); // 唱歌者對每個聽眾
  const audioRefs = useRef(new Map()); // 聽眾音訊
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);

  // =========================
  // 唱歌者
  // =========================
  const startSinging = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Mic meter
      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateMicMeter = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const avg = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
        setMicLevel(avg / 255);
        animationIdRef.current = requestAnimationFrame(updateMicMeter);
      };
      updateMicMeter();

      setIsSinging(true);
      socket.emit("start-singing", { room, singer: socket.id });
      console.log("🎤 開始唱歌", socket.id);
    } catch (err) {
      console.error("麥克風錯誤:", err);
    }
  };

  const stopSinging = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    cancelAnimationFrame(animationIdRef.current);
    audioCtxRef.current?.close();

    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    audioRefs.current.forEach((audio) => audio.remove());
    audioRefs.current.clear();

    setIsSinging(false);
    setMicLevel(0);
    socket.emit("stop-singing", { room, singer: socket.id });
    console.log("🛑 停止唱歌", socket.id);
  };

  // =========================
  // 聽眾按鈕建立 WebRTC
  // =========================
  const startListening = (listenerId) => {
    if (!listeners.includes(listenerId)) setListeners((prev) => [...prev, listenerId]);
    socket.emit("listener-ready", { room, listenerId });
    console.log("👂 點開始聽歌", listenerId);
  };

  // =========================
  // 唱歌者收到新聽眾 → 建立 PC
  // =========================
  useEffect(() => {
    socket.on("new-listener", async ({ listenerId }) => {
      console.log("[唱歌者] 收到 new-listener", listenerId);
      if (!isSinging || !localStreamRef.current) return;
      if (pcsRef.current.has(listenerId)) return;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc-candidate", { to: listenerId, candidate: e.candidate, sender: socket.id });
          console.log("[唱歌者] 送 ICE candidate 給聽眾", listenerId, e.candidate);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { to: listenerId, offer, sender: socket.id });
      console.log("[唱歌者] send offer to", listenerId);

      pcsRef.current.set(listenerId, pc);
    });

    socket.on("webrtc-answer", async ({ from, answer }) => {
      const pc = pcsRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(answer);
        console.log("[唱歌者] setRemoteDescription answer from", from);
      }
    });

    socket.on("webrtc-candidate", async ({ from, candidate }) => {
      const pc = pcsRef.current.get(from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        console.log("[唱歌者] 收到 candidate from", from, candidate);
      }
    });

    return () => {
      socket.off("new-listener");
      socket.off("webrtc-answer");
      socket.off("webrtc-candidate");
    };
  }, [socket, isSinging]);

  // =========================
  // 聽眾接收音訊
  // =========================
  useEffect(() => {
    socket.on("webrtc-offer", async ({ from, offer }) => {
      if (isSinging) return;

      console.log("[聽眾] 收到 offer", from);

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

      pc.ontrack = (e) => {
        let audio = audioRefs.current.get(from);
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          audio.controls = true;
          audio.className = "listener-audio";
          document.body.appendChild(audio);
          audioRefs.current.set(from, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play().then(() => console.log("[聽眾] audio 播放成功", from))
          .catch((err) => console.error("[聽眾] audio 播放失敗", from, err));
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc-candidate", { to: from, candidate: e.candidate, sender: socket.id });
          console.log("[聽眾] 送 ICE candidate 給唱歌者", from, e.candidate);
        }
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { to: from, answer });
      console.log("[聽眾] 送 answer 給", from);
    });

    return () => socket.off("webrtc-offer");
  }, [socket, isSinging]);

  return (
    <div className="song-panel">
      <div className="song-header">
        <h4>🎤 唱歌區</h4>
      </div>

      <div className="controls">
        {!isSinging ? (
          <button onClick={startSinging}>開始唱歌</button>
        ) : (
          <button onClick={stopSinging}>停止唱歌</button>
        )}
      </div>

      {isSinging && (
        <div className="mic-meter">
          <div className="mic-bar" style={{ width: `${micLevel * 100}%` }}></div>
        </div>
      )}

      <div className="listeners">
        <h4>聽眾</h4>
        {!isSinging && <button onClick={() => startListening(socket.id)}>開始聽歌</button>}
        <div className="listener-list">
          {listeners.map((l) => (
            <span key={l} className="singer-item">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
