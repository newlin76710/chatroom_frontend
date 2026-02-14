// SongRoom.jsx
import { useState, useEffect, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";

export default function SongRoom({ room, name, socket, currentSinger }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [singing, setSinging] = useState(false);

  const roomRef = useRef(null);
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);

  // 保存 track / source
  const micTrackRef = useRef(null);
  const micSourceRef = useRef(null);
  const micStreamRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("forceStopSing", () => {
      stopSing();
    });

    return () => {
      socket.off("forceStopSing");
    };
  }, [socket]);

  const startSing = async (jwtToken) => {
    try {
      const lk = new Room();
      roomRef.current = lk;
      await lk.connect(import.meta.env.VITE_LIVEKIT_URL, jwtToken);

      // 建立 AudioContext
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      destRef.current = dest;

      // 麥克風
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(dest);
      micSourceRef.current = micSource;
      micStreamRef.current = micStream;

      const micTrack = new LocalAudioTrack(dest.stream.getAudioTracks()[0]);
      micTrackRef.current = micTrack;
      await lk.localParticipant.publishTrack(micTrack);

      setLkRoom(lk);
      setSinging(true);
      console.log("[SongRoom] 已上麥 🎤");
    } catch (err) {
      console.error("[SongRoom] startSing failed:", err);
    }
  };

  const stopSing = async () => {
    // 停止 mic track
    // ⭐⭐⭐ 先讓 LiveKit 停止送音
    const lk = roomRef.current;
    await lk?.localParticipant.setMicrophoneEnabled(false);

    // 再 unpublish
    if (micTrackRef.current) {
      await lk?.localParticipant.unpublishTrack(micTrackRef.current);
    }

    // 再砍 pipeline
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    // 再停裝置
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;
    micTrackRef.current?.mediaStreamTrack?.stop(); // 🔥 真正關閉裝置
    micTrackRef.current?.stop();
    micTrackRef.current = null;

    // 最後斷房
    await lk?.disconnect();
    roomRef.current = null;
    setLkRoom(null);

    await audioCtxRef.current?.suspend();
    await audioCtxRef.current?.close();
    audioCtxRef.current = null;
    destRef.current = null;

    setSinging(false);

    socket.emit("stopSing", { room, singer: name });
    console.log("[SongRoom] 已下麥 🛑");
  };

  const grabMic = () => {
    socket.emit("grabMic", { room, singer: name });
    socket.once("livekit-token", ({ token }) => {
      startSing(token);
    });
  };

  const otherSinger = currentSinger && currentSinger !== name;
  const grabDisabled = !singing && otherSinger;
  const grabTitle = grabDisabled ? "請等歌手下 Mic" : "";

  return (
    <div style={{ padding: 12 }}>
      <button
        onClick={singing ? stopSing : grabMic}
        disabled={grabDisabled}
        title={grabTitle}
        style={{
          opacity: grabDisabled ? 0.5 : 1,
          cursor: grabDisabled ? "not-allowed" : "pointer",
          marginRight: 8
        }}
      >
        {singing ? "🛑 下麥" : "🎤 上麥"}
      </button>
    </div>
  );
}
