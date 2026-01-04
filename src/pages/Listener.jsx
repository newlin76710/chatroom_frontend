// Listener.jsx
import { useEffect, useRef } from "react";

export default function Listener({ socket, room }) {
  const audioRef = useRef(null);
  const pcRef = useRef(null);
  const pendingCandidates = useRef([]);

  useEffect(() => {
    if (pcRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
          urls: [
            "turn:turn.ek21.com:3478?transport=udp",
            "turn:turn.ek21.com:3478?transport=tcp"
          ],
          username: "webrtcuser",
          credential: "Abc76710",
        },
      ],
    });

    pcRef.current = pc;

    // 1️⃣ 連線狀態 log
    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log("PC state:", pc.connectionState);
    };

    // 2️⃣ 接收音軌
    pc.ontrack = e => {
      console.log("🎧 ontrack");
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
      }
    };

    // 3️⃣ ICE candidate
    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("webrtc-ice", { room, candidate: e.candidate });
      }
    };

    // 4️⃣ socket 事件（只註冊一次）
    const onOffer = async ({ offer }) => {
      if (!pcRef.current) return;

      console.log("📩 offer received");
      await pc.setRemoteDescription(offer);

      // 先前 queue 的 candidate
      for (const c of pendingCandidates.current) {
        await pcRef.current.addIceCandidate(c);
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { room, answer });
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;

      if (!pcRef.current.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }

      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.warn("addIceCandidate failed", err);
      }
    };

    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-ice", onIce);

    return () => {
      pc.close();
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-ice", onIce);
    };
  }, [socket, room]);

  // 🔑 autoplay unlock
  const unlockAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = false;
    audioRef.current.play().catch(e => console.warn("Audio play failed", e));
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  return (
    <div>
      <audio ref={audioRef} autoPlay playsInline />
      <button onClick={unlockAudio}>🔊 開始收聽</button>
      <button onClick={pauseAudio}>⏹️ 停止收聽</button>
    </div>
  );
}
