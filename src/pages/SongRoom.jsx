import { useState, useEffect, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";

export default function SongRoom({ room, name, socket, currentSinger }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [singing, setSinging] = useState(false);
  const [sharing, setSharing] = useState(false); // 是否已分享分頁音

  const roomRef = useRef(null);
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);

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

      // 建立 audio context
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      destRef.current = dest;

      // 先抓麥克風
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      audioCtx.createMediaStreamSource(micStream).connect(dest);

      // 發布 track
      const track = new LocalAudioTrack(dest.stream.getAudioTracks()[0]);
      await lk.localParticipant.publishTrack(track);

      setLkRoom(lk);
      setSinging(true);
      console.log("[SongRoom] 已上麥 🎤");
    } catch (err) {
      console.error("[SongRoom] startSing failed:", err);
    }
  };

  const stopSing = () => {
    lkRoom?.localParticipant.unpublishTracks();
    lkRoom?.disconnect();
    audioCtxRef.current?.close();

    setLkRoom(null);
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
      const tabAudioTrack = displayStream.getAudioTracks()[0];
      if (tabAudioTrack) {
        const audioCtx = audioCtxRef.current;
        audioCtx.createMediaStreamSource(new MediaStream([tabAudioTrack])).connect(destRef.current);
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

      {/* <button
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
