// SongPanel.jsx
import { useRef, useState, useEffect } from "react";

export default function SongPanel({ socket, room, name }) {
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);

  const [singing, setSinging] = useState(false);
  const [micState, setMicState] = useState({
    queue: [],
    currentSinger: null,
  });

  const isIdle = !micState.currentSinger;

  /* ========================
     🎤 開始唱（輪到自己才可唱）
  ======================== */
  async function startSing() {
    if (singing || micState.currentSinger !== name) return;

    console.log("🎤 startSing");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

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

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = e => {
      if (e.candidate) socket.emit("webrtc-ice", { room, candidate: e.candidate });
    };

    pc.onconnectionstatechange = () => console.log("PC state:", pc.connectionState);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", { room, offer, singer: name });

    setSinging(true);
  }

  /* ========================
     🛑 停止唱 / 放下 Mic
  ======================== */
  function stopSing() {
    console.log("🛑 stopSing");

    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();

    streamRef.current = null;
    pcRef.current = null;
    pendingCandidates.current = [];

    setSinging(false);

    socket.emit("leaveQueue", { room, singer: name });
    socket.emit("webrtc-stop", { room });
  }

  /* ========================
     📡 Socket Events
  ======================== */
  useEffect(() => {
    // WebRTC
    const onAnswer = async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
      for (const c of pendingCandidates.current) {
        await pcRef.current.addIceCandidate(c);
      }
      pendingCandidates.current = [];
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;
      if (!pcRef.current.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (e) {
        console.warn("ICE error", e);
      }
    };

    const onQueueUpdate = ({ queue, current }) => setMicState({ queue, currentSinger: current });

    const onRoomPhase = ({ phase, singer }) => {
      if (phase === "singing" && singer === name && !singing) startSing();
    };

    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);
    socket.on("queueUpdate", onQueueUpdate);
    socket.on("update-room-phase", onRoomPhase);
    socket.on("webrtc-stop", () => {
      if (singing) stopSing();
    });

    return () => {
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
      socket.off("queueUpdate", onQueueUpdate);
      socket.off("update-room-phase", onRoomPhase);
      socket.off("webrtc-stop");
    };
  }, [socket, singing]);

  useEffect(() => {
    socket.on("micStateUpdate", ({ queue, currentSinger }) => {
      setMicState({ queue, currentSinger });
    });
    return () => socket.off("micStateUpdate");
  }, [socket]);

  /* ========================
     🎛 UI
  ======================== */
  return (
    <div style={{ padding: 12 }}>
      {/* 排隊拿 Mic */}
      {isIdle && !micState.queue.includes(name) && (
        <button onClick={() => socket.emit("joinQueue", { room, singer: name })}>
          🎤 排隊拿 Mic
        </button>
      )}

      {/* 輪到自己唱 */}
      {micState.queue[0] === name && isIdle && (
        <button onClick={startSing}>🎤 輪到你，開始唱</button>
      )}

      {/* 正在唱按鈕（自己唱） */}
      {micState.currentSinger === name && (
        <button onClick={stopSing} style={{ marginLeft: 10 }}>🛑 放下 Mic</button>
      )}

      {/* 正在唱文字 */}
      {micState.currentSinger && (
        <p>🎶 {micState.currentSinger} 正在唱 {micState.currentSinger === name ? "（你自己）" : ""}</p>
      )}

      {/* 排隊列表 */}
      {micState.queue.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <b>🎧 排隊中：</b>
          {micState.queue.join(" → ")}
        </div>
      )}
    </div>
  );
}
