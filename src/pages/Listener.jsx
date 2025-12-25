import { useEffect, useRef } from "react";
import { ICE_CONFIG } from "./webrtcConfig";

export default function Listener({ socket, room }) {
  const pcRef = useRef(null);
  const audioRef = useRef(null);
  const activeSessionRef = useRef(null);

  useEffect(() => {
    async function onOffer({ offer, sessionId }) {
      if (pcRef.current) pcRef.current.close();

      activeSessionRef.current = sessionId;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.ontrack = e => {
        audioRef.current.srcObject = e.streams[0];
      };

      pc.onicecandidate = e => {
        if (e.candidate) {
          socket.emit("webrtc-ice", {
            room,
            candidate: e.candidate,
            sessionId,
          });
        }
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc-answer", { room, answer, sessionId });
    }

    function onIce({ candidate, sessionId }) {
      if (sessionId !== activeSessionRef.current) return;
      pcRef.current?.addIceCandidate(candidate);
    }

    function onStop() {
      pcRef.current?.close();
      pcRef.current = null;
      activeSessionRef.current = null;
      if (audioRef.current) {
        audioRef.current.srcObject = null;
        audioRef.current.pause();
      }
    }

    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-ice", onIce);
    socket.on("webrtc-stop", onStop);

    return () => {
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-ice", onIce);
      socket.off("webrtc-stop", onStop);
    };
  }, [socket, room]);

  function stopListening() {
    pcRef.current?.close();
    pcRef.current = null;
    activeSessionRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.pause();
    }
  }

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline />
      <button onClick={() => audioRef.current.play()}>🔊 開始收聽</button>
      <button onClick={stopListening}>⏹️ 停止收聽</button>
    </>
  );
}
