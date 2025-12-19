import { useEffect, useRef, useState } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, name }) {
  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // peerId -> RTCPeerConnection
  const remoteAudioRefs = useRef({}); // peerId -> audio element

  const [recording, setRecording] = useState(false);
  const [liveSingers, setLiveSingers] = useState([]);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  // --- 建立 RTCPeerConnection ---
  const createPeerConnection = (peerId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // 把本地音訊加入連線
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    // 接收遠端音訊
    pc.ontrack = (event) => {
      let audioEl = remoteAudioRefs.current[peerId];
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        audioEl.volume = muted ? 0 : volume;
        remoteAudioRefs.current[peerId] = audioEl;
      }
      audioEl.srcObject = event.streams[0];
    };

    // ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: peerId, candidate: event.candidate });
      }
    };

    return pc;
  };

  // --- 開始唱歌 ---
  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      setRecording(true);
      socket.emit("start-singing", { room, singer: name });

      // 建立與現有房間使用者的 peer
      const users = await new Promise(resolve => {
        socket.emit("getRoomUsers", room, resolve);
      });

      users.forEach(u => {
        if (u.id === socket.id) return; // 忽略自己
        if (!peersRef.current[u.id]) {
          const pc = createPeerConnection(u.id);
          peersRef.current[u.id] = pc;

          // 建立 offer
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            socket.emit("offer", { offer, to: u.id });
          });
        }
      });
    } catch (err) {
      console.error("取得麥克風失敗", err);
      alert("無法取得麥克風權限");
    }
  };

  // --- 停止唱歌 ---
  const stopRecord = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setRecording(false);
    socket.emit("stop-singing", { room, singer: name });

    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    remoteAudioRefs.current = {};
    setLiveSingers([]);
  };

  // --- WebRTC 信令 ---
  useEffect(() => {
    // 收到 offer
    socket.on("offer", async ({ offer, from }) => {
      if (peersRef.current[from]) return;
      const pc = createPeerConnection(from);
      peersRef.current[from] = pc;

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { answer, to: from });
    });

    // 收到 answer
    socket.on("answer", async ({ answer, from }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(answer);
    });

    // 收到 ICE candidate
    socket.on("ice-candidate", async ({ candidate, from }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.warn("addIceCandidate 失敗", err);
        }
      }
    });

    // 更新房間唱歌狀態
    socket.on("user-start-singing", ({ singer }) => {
      setLiveSingers(prev => [...new Set([...prev, singer])]);
    });
    socket.on("user-stop-singing", ({ singer }) => {
      setLiveSingers(prev => prev.filter(s => s !== singer));
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-start-singing");
      socket.off("user-stop-singing");
    };
  }, [socket, muted, volume]);

  // --- 音量控制 ---
  useEffect(() => {
    Object.values(remoteAudioRefs.current).forEach(a => a.volume = muted ? 0 : volume);
  }, [volume, muted]);

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      {liveSingers.length > 0 && (
        <div>
          <strong>正在唱歌：</strong>
          {liveSingers.join(", ")}
        </div>
      )}

      <div>
        <label>
          音量：
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
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
    </div>
  );
}
