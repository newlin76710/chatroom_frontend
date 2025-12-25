import { useRef, useEffect, useState } from "react";
import { ICE_CONFIG } from "./webrtcConfig";
export default function SongPanel({ socket, room, name }) {
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const sessionIdRef = useRef(null);
  const [singing, setSinging] = useState(false);

  async function startSing() {
    if (singing) return;

    sessionIdRef.current = crypto.randomUUID();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("webrtc-ice", {
          room,
          candidate: e.candidate,
          sessionId: sessionIdRef.current,
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
      room,
      offer,
      sessionId: sessionIdRef.current,
      singer: name,
    });

    setSinging(true);
  }

  function stopSing() {
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());

    pcRef.current = null;
    streamRef.current = null;
    sessionIdRef.current = null;

    socket.emit("webrtc-stop", { room });
    setSinging(false);
  }

  useEffect(() => {
    function onAnswer({ answer, sessionId }) {
      if (sessionId !== sessionIdRef.current) return;
      pcRef.current?.setRemoteDescription(answer);
    }

    function onIce({ candidate, sessionId }) {
      if (sessionId !== sessionIdRef.current) return;
      pcRef.current?.addIceCandidate(candidate);
    }

    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);

    return () => {
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
    };
  }, [socket]);

  return (
    <button onClick={singing ? stopSing : startSing}>
      {singing ? "停止唱歌" : "開始唱"}
    </button>
  );
}
