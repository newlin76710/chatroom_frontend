import { useEffect, useRef, useState } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, name }) {
  const [recording, setRecording] = useState(false);
  const [liveSingers, setLiveSingers] = useState([]);
  const [singerVolumes, setSingerVolumes] = useState({});
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // peerId -> RTCPeerConnection
  const audioCtxRef = useRef(new (window.AudioContext || window.webkitAudioContext)());

  // --- WebRTC 事件處理 ---
  useEffect(() => {
    socket.on("offer", async ({ from, offer }) => {
      const pc = new RTCPeerConnection();
      peersRef.current[from] = pc;

      // 加本地 track
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
      }

      // 接收對方音訊
      pc.ontrack = (e) => {
        playRemoteStream(from, e.streams[0]);
      };

      // ICE
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { to: from, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    });

    socket.on("answer", async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(answer);
      }
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) await pc.addIceCandidate(candidate);
    });

    socket.on("user-start-singing", ({ singer }) => {
      setLiveSingers(prev => [...new Set([...prev, singer])]);
    });

    socket.on("user-stop-singing", ({ singer }) => {
      setLiveSingers(prev => prev.filter(s => s !== singer));
      setSingerVolumes(prev => ({ ...prev, [singer]: 0 }));
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-start-singing");
      socket.off("user-stop-singing");
    };
  }, [socket]);

  // --- 播放對方音訊 ---
  const playRemoteStream = (singer, stream) => {
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.volume = muted ? 0 : volume;
    audio.play().catch(() => {});

    // 計算音量
    const audioCtx = audioCtxRef.current;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const updateVolume = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += (data[i] - 128) ** 2;
      const rms = Math.sqrt(sum / data.length) / 128;
      setSingerVolumes(prev => ({ ...prev, [singer]: rms }));
      requestAnimationFrame(updateVolume);
    };
    updateVolume();
  };

  // --- 開始唱歌 ---
  const startRecord = async () => {
    // 停掉舊的
    stopRecord();

    // 取得本地麥克風
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    // 建立 PeerConnection 與所有其他使用者
    const roomUsers = await new Promise(resolve => {
      socket.emit("getRoomUsers", room, resolve);
    });

    roomUsers.forEach(user => {
      if (user.name === name) return; // 不連自己
      const pc = new RTCPeerConnection();
      peersRef.current[user.id] = pc;

      // 加本地 track
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 接收對方音訊
      pc.ontrack = (e) => playRemoteStream(user.name, e.streams[0]);

      // ICE
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { to: user.id, candidate: event.candidate });
        }
      };

      // 建立 offer
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit("offer", { to: user.id, offer });
      });
    });

    setRecording(true);
    socket.emit("start-singing", { room, singer: name });
    setLiveSingers(prev => [...new Set([...prev, name])]);
  };

  // --- 停止唱歌 ---
  const stopRecord = () => {
    socket.emit("stop-singing", { room, singer: name });

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;

    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};

    setRecording(false);
    setLiveSingers(prev => prev.filter(s => s !== name));
    setSingerVolumes(prev => ({ ...prev, [name]: 0 }));
  };

  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      {liveSingers.length > 0 && (
        <div className="live-singers">
          {liveSingers.map(singer => (
            <div key={singer}>
              <span>{singer}</span>
              <div className="volume-bar">
                <div style={{ width: `${Math.min((singerVolumes[singer] || 0) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label>
          音量
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => setVolume(parseFloat(e.target.value))} />
        </label>
        <button onClick={() => setMuted(!muted)}>{muted ? "解除靜音" : "靜音"}</button>
      </div>

      {!recording ? (
        <button onClick={startRecord}>開始唱歌</button>
      ) : (
        <button onClick={stopRecord}>結束唱歌</button>
      )}
    </div>
  );
}
