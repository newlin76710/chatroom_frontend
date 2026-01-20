import { useRef, useState, useEffect } from "react";

export default function SongPanel({ socket, room, name }) {
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);

  const [singing, setSinging] = useState(false);
  const [micState, setMicState] = useState({ queue: [], currentSinger: null });

  const isMyTurn = micState.currentSinger === name;
  const isIdle = !micState.currentSinger;

  /* ========================
     🎤 開始唱（輪到才可唱）
  ======================== */
  async function startSing() {
    if (singing || !isMyTurn) return;

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

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", { room, offer, singer: name });

    setSinging(true);
  }

  /* ========================
     🛑 放下 Mic
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
    const onAnswer = async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
      for (const c of pendingCandidates.current) await pcRef.current.addIceCandidate(c);
      pendingCandidates.current = [];
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;
      if (!pcRef.current.remoteDescription) pendingCandidates.current.push(candidate);
      else await pcRef.current.addIceCandidate(candidate).catch(e => console.warn(e));
    };

    const onMicStateUpdate = ({ queue, currentSinger }) => {
      console.log("[micStateUpdate]", queue, currentSinger);
      setMicState({ queue, currentSinger });
    };

    const onRoomPhase = ({ phase, singer }) => {
      if (phase === "singing" && singer === name && !singing) startSing();
    };

    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);
    socket.on("micStateUpdate", onMicStateUpdate);
    socket.on("update-room-phase", onRoomPhase);
    socket.on("webrtc-stop", () => {
      if (singing) stopSing();
    });

    return () => {
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
      socket.off("micStateUpdate", onMicStateUpdate);
      socket.off("update-room-phase", onRoomPhase);
      socket.off("webrtc-stop");
    };
  }, [socket, singing]);

  /* ========================
     🎛 UI
  ======================== */
  return (
    <div style={{ padding: 12 }}>
      {/* 沒人在唱，自己沒在隊列中 */}
      {!micState.currentSinger && !micState.queue.includes(name) && (
        <button onClick={() => socket.emit("joinQueue", { room, singer: name })}>
          🎤 排隊拿 Mic
        </button>
      )}

      {/* 正在輪到你唱（後端已設你為 currentSinger） */}
      {micState.currentSinger === name && !singing && (
        <button onClick={startSing}>🎤 輪到你，開始唱</button>
      )}

      {/* 正在唱 */}
      {micState.currentSinger === name && singing && (
        <button onClick={stopSing}>🛑 放下 Mic</button>
      )}

      {/* 顯示其他人正在唱 */}
      {micState.currentSinger && micState.currentSinger !== name && (
        <p>🎶 {micState.currentSinger} 正在唱</p>
      )}
    </div>
  );
}
