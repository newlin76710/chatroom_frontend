// Listener.jsx
import { useEffect, useRef, useState } from "react";

export default function Listener({ socket, room }) {
  const audioRef = useRef(null);
  const pcRef = useRef(null);
  const pendingCandidates = useRef([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (pcRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
          urls: [
            "turn:turn.ek21.com:3478?transport=udp",
            "turn:turn.ek21.com:3478?transport=tcp",
          ],
          username: "webrtcuser",
          credential: "Abc76710",
        },
      ],
    });
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => console.log("ICE state:", pc.iceConnectionState);
    pc.onconnectionstatechange = () => console.log("PC state:", pc.connectionState);

    pc.ontrack = e => {
      console.log("🎧 ontrack");
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
        if (listening) audioRef.current.play().catch(() => {});
      }
    };

    pc.onicecandidate = e => {
      if (e.candidate) socket.emit("webrtc-ice", { room, candidate: e.candidate });
    };

    const onOffer = async ({ offer }) => {
      if (!pcRef.current) return;
      await pc.setRemoteDescription(offer);
      for (const c of pendingCandidates.current) await pcRef.current.addIceCandidate(c);
      pendingCandidates.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { room, answer });
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;
      if (!pcRef.current.remoteDescription) pendingCandidates.current.push(candidate);
      else {
        try { await pcRef.current.addIceCandidate(candidate); }
        catch (err) { console.warn("addIceCandidate failed", err); }
      }
    };

    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-ice", onIce);

    return () => {
      pc.close();
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-ice", onIce);
    };
  }, [socket, room, listening]);

  const toggleListening = () => {
    if (!audioRef.current) return;
    if (listening) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setListening(!listening);
  };

  return (
    <div>
      <audio ref={audioRef} autoPlay playsInline />
      <button onClick={toggleListening}>
        {listening ? "⏹️ 停止收聽" : "🔊 開始收聽"}
      </button>
    </div>
  );
}
