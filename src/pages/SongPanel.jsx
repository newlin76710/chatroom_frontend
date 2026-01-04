// SongPanel.jsx
import { useRef, useState, useEffect } from "react";

export default function SongPanel({ socket, room, name }) {
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const [singing, setSinging] = useState(false);

  console.log("joinRoom", room);

  async function startSing() {
    if (singing) return;

    console.log("🎤 startSing");

    // 1. 取得麥克風
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // 2. 建立 PeerConnection
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

    // 3. 加入音軌
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // 4. ICE state log
    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log("PC state:", pc.connectionState);
    };

    // 5. ICE candidate
    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("webrtc-ice", { room, candidate: e.candidate });
      }
    };

    // 6. 建立 offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
      room,
      offer,
      singer: name,
    });

    setSinging(true);
  }

  function stopSing() {
    console.log("🛑 stopSing");

    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();

    streamRef.current = null;
    pcRef.current = null;
    pendingCandidates.current = [];
    setSinging(false);

    socket.emit("webrtc-stop", { room });
  }

  // 7. socket.on 事件（useEffect 只註冊一次）
  useEffect(() => {
    const onAnswer = async ({ answer }) => {
      if (!pcRef.current) return;

      await pcRef.current.setRemoteDescription(answer);

      // 先前 queue 的 candidate
      for (const c of pendingCandidates.current) {
        await pcRef.current.addIceCandidate(c);
      }
      pendingCandidates.current = [];
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;

      // 如果 remoteDescription 還沒 set，先放 queue
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

    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);

    return () => {
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
    };
  }, [socket]);

  return (
    <div>
      {!singing ? (
        <button onClick={startSing}>開始唱</button>
      ) : (
        <button onClick={stopSing}>停止</button>
      )}
    </div>
  );
}
