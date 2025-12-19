import { useEffect, useRef, useState } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, name }) {
  const localAudioRef = useRef(null);
  const peersRef = useRef({}); // { socketId: RTCPeerConnection }

  const [recording, setRecording] = useState(false);
  const [liveSingers, setLiveSingers] = useState([]);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 100 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  let localStream = useRef(null);

  // --- WebRTC 初始化 ---
  const initWebRTC = async () => {
    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    localAudioRef.current.srcObject = localStream.current;

    socket.emit("join-room", room);

    // 其他人進來時建立 PeerConnection
    socket.on("offer", async ({ offer, from }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { room, answer, to: from });
    });

    socket.on("answer", async ({ answer, from }) => {
      const pc = peersRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", ({ candidate, from }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-left", ({ socketId }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
      setLiveSingers((prev) => prev.filter((s) => s !== socketId));
    });
  };

  const createPeerConnection = (socketId) => {
    const pc = new RTCPeerConnection();

    // 加入本地音訊
    localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));

    // 收到遠端音訊時 attach
    pc.ontrack = (event) => {
      const remoteAudio = document.getElementById(`remoteAudio-${socketId}`);
      if (remoteAudio) {
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch(() => {});
      }
      setLiveSingers((prev) => [...new Set([...prev, socketId])]);
    };

    // ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { room, candidate: event.candidate, to: socketId });
      }
    };

    peersRef.current[socketId] = pc;
    return pc;
  };

  const startRecord = async () => {
    try {
      await initWebRTC();
      setRecording(true);
    } catch (err) {
      console.error(err);
      alert("無法取得麥克風權限");
    }
  };

  const stopRecord = () => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRecording(false);
    setLiveSingers([]);
  };

  // 拖動事件
  const handleMouseDown = (e) => {
    setDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  };
  const handleMouseUp = () => setDragging(false);
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      className={`song-panel floating ${collapsed ? "collapsed" : ""}`}
      style={{ top: position.y, left: position.x }}
    >
      <div className="song-header" onMouseDown={handleMouseDown}>
        <h4>🎤 唱歌區</h4>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "▲ 展開" : "▼ 收起"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="volume-control">
            <label>
              音量：
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </label>
            <button onClick={() => setMuted(!muted)}>
              {muted ? "解除靜音" : "靜音"}
            </button>
          </div>

          {!recording ? (
            <button onClick={startRecord}>開始唱歌</button>
          ) : (
            <button onClick={stopRecord}>結束唱歌</button>
          )}

          <audio ref={localAudioRef} autoPlay muted />
          {liveSingers.map((s) => (
            <audio key={s} id={`remoteAudio-${s}`} autoPlay />
          ))}
        </>
      )}
    </div>
  );
}
