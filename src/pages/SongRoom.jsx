import { useState, useEffect, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";

export default function SongRoom({ room, name, socket }) {
  const [singing, setSinging] = useState(false);
  const [queued, setQueued] = useState(false);
  const [queuePos, setQueuePos] = useState(null);
  const [currentSinger, setCurrentSinger] = useState(null);

  const roomRef = useRef(null);
  const micStreamRef = useRef(null);

  const startingRef = useRef(false);
  const stoppingRef = useRef(false);

  //////////////////////////////////////////////////////
  // 加入歌房
  //////////////////////////////////////////////////////
  useEffect(() => {
    if (!socket) return;
    socket.emit("joinSongRoom", { room, name });
  }, [socket, room, name]);

  //////////////////////////////////////////////////////
  // micStateUpdate = 唯一狀態來源
  //////////////////////////////////////////////////////
  useEffect(() => {
    if (!socket) return;

    const handler = ({ queue, currentSinger }) => {
      setCurrentSinger(currentSinger);

      // 正在唱
      if (currentSinger === name) {
        setSinging(true);
        setQueued(false);
        setQueuePos(null);
        return;
      }

      // 排隊中
      const pos = queue.indexOf(name);
      if (pos !== -1) {
        setQueued(true);
        setQueuePos(pos + 1);
      } else {
        setQueued(false);
        setQueuePos(null);
      }

      // 不是唱的人
      setSinging(false);
    };

    socket.on("micStateUpdate", handler);
    return () => socket.off("micStateUpdate", handler);
  }, [socket, name]);

  //////////////////////////////////////////////////////
  // LiveKit token
  //////////////////////////////////////////////////////
  useEffect(() => {
    if (!socket) return;

    const handler = ({ token }) => {
      startSing(token);
    };

    socket.on("livekit-token", handler);
    return () => socket.off("livekit-token", handler);
  }, [socket]);

  //////////////////////////////////////////////////////
  // React unmount 防殘音
  //////////////////////////////////////////////////////
  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  //////////////////////////////////////////////////////
  // 上麥
  //////////////////////////////////////////////////////
  const startSing = async (token) => {
    if (startingRef.current || roomRef.current) return;
    startingRef.current = true;

    try {
      const lk = new Room();
      await lk.connect(import.meta.env.VITE_LIVEKIT_URL, token);
      roomRef.current = lk;

      // LiveKit 被斷線 → cleanup
      lk.on("disconnected", () => {
        cleanupAudio();
        setSinging(false);
      });

      // mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const track = new LocalAudioTrack(stream.getAudioTracks()[0]);
      await lk.localParticipant.publishTrack(track);

      setSinging(true);
      setQueued(false);
      setQueuePos(null);

      console.log("🎤 上麥成功");
    } catch (err) {
      console.error("LiveKit error:", err);
      cleanupAudio();
      socket.emit("stopSing", { room });
    }

    startingRef.current = false;
  };

  //////////////////////////////////////////////////////
  // 清理音源
  //////////////////////////////////////////////////////
  const cleanupAudio = () => {
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;

    if (roomRef.current) {
      try { roomRef.current.disconnect(true); } catch {}
      roomRef.current = null;
    }
  };

  //////////////////////////////////////////////////////
  // 下麥
  //////////////////////////////////////////////////////
  const stopSing = () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    cleanupAudio();
    socket.emit("stopSing", { room });
    setSinging(false);

    stoppingRef.current = false;
  };

  //////////////////////////////////////////////////////
  // grab mic
  //////////////////////////////////////////////////////
  const grabMic = () => {
    if (startingRef.current || singing || queued) return;
    socket.emit("grabMic", { room, singer: name });
  };

  //////////////////////////////////////////////////////
  // UI 狀態
  //////////////////////////////////////////////////////
  const otherSinger = currentSinger && currentSinger !== name;
  const grabDisabled = singing || queued || otherSinger;

  return (
    <div style={{ padding: 12 }}>
      <button
        onClick={singing ? stopSing : grabMic}
        disabled={grabDisabled}
        style={{
          opacity: grabDisabled ? 0.5 : 1,
          cursor: grabDisabled ? "not-allowed" : "pointer",
          marginRight: 8
        }}
      >
        {singing ? "🛑 下麥" : queued ? "⏳ 排隊中" : "🎤 上麥"}
      </button>

      {queued && (
        <span style={{ marginLeft: 12 }}>
          ⏳ 第 {queuePos} 位
        </span>
      )}
    </div>
  );
}
