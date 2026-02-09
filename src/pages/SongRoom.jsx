// SongRoom.jsx
import { useState, useEffect, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";

export default function SongRoom({ room, name, socket, currentSinger }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [singing, setSinging] = useState(false);
  const [sharing, setSharing] = useState(false);

  const roomRef = useRef(null);
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);

  // 保存 track / source
  const micTrackRef = useRef(null);
  const micSourceRef = useRef(null);
  const tabTrackRef = useRef(null);
  const tabSourceRef = useRef(null);

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

  const stopSing = () => {
    // 停止 mic track
    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current = null;
    }

    // 停止 tab track
    if (tabTrackRef.current) {
      tabTrackRef.current.stop();
      tabTrackRef.current = null;
    }

    // 斷開 mic / tab source
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    tabSourceRef.current?.disconnect();
    tabSourceRef.current = null;

    // 取消發佈
    lkRoom?.localParticipant.unpublishTracks();

    // 斷線
    lkRoom?.disconnect();
    setLkRoom(null);

    // 關閉 AudioContext
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    destRef.current = null;

    setSinging(false);
    setSharing(false);

    socket.emit("stopSing", { room, singer: name });
    console.log("[SongRoom] 已下麥 🛑");
  };

  const grabMic = () => {
    socket.emit("grabMic", { room, singer: name });
    socket.once("livekit-token", ({ token }) => {
      startSing(token);
    });
  };

  const shareTabAudio = async () => {
    if (!lkRoom || !destRef.current) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const tabTrack = displayStream.getAudioTracks()[0];
      if (tabTrack) {
        const audioCtx = audioCtxRef.current;
        const tabSource = audioCtx.createMediaStreamSource(new MediaStream([tabTrack]));
        tabSource.connect(destRef.current);

        tabTrackRef.current = new LocalAudioTrack(destRef.current.stream.getAudioTracks()[0]);
        tabSourceRef.current = tabSource;

        await lkRoom.localParticipant.publishTrack(tabTrackRef.current);
        setSharing(true);
        console.log("[SongRoom] 分頁音已加入 🎶");
      }
    } catch (err) {
      console.error("[SongRoom] shareTabAudio failed:", err);
    }
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
      {/* 
      <button
        onClick={shareTabAudio}
        disabled={!singing || sharing}
        title={!singing ? "請先上麥" : sharing ? "已分享分頁音" : ""}
        style={{
          opacity: !singing || sharing ? 0.5 : 1,
          cursor: !singing || sharing ? "not-allowed" : "pointer",
        }}
      >
        {sharing ? "✅ 已分享分頁音" : "📢 分享分頁音"}
      </button> */}
    </div>
  );
}
