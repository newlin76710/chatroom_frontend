import { useState, useEffect, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";

export default function SongRoom({ room, name, socket, currentSinger }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [singing, setSinging] = useState(false);

  const roomRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // 被踢掉
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

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      audioCtx.createMediaStreamSource(micStream).connect(dest);

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const tabAudioTrack = displayStream.getAudioTracks()[0];
      if (tabAudioTrack) {
        audioCtx.createMediaStreamSource(new MediaStream([tabAudioTrack])).connect(dest);
      }

      const mixedTrack = new LocalAudioTrack(dest.stream.getAudioTracks()[0]);
      await lk.localParticipant.publishTrack(mixedTrack);

      setLkRoom(lk);
      setSinging(true);
      console.log("[SongRoom] 開始唱歌（分頁混音）🎤");
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
    socket.emit("stopSing", { room, singer: name });
  };

  const grabMic = () => {
    socket.emit("grabMic", { room, singer: name });
    socket.once("livekit-token", ({ token }) => {
      startSing(token);
    });
  };

  const otherSinger = currentSinger && currentSinger !== name;
  const buttonDisabled = !singing && otherSinger;
  const buttonTitle = buttonDisabled ? "請等歌手下 Mic" : "";

  return (
    <div style={{ padding: 12 }}>
      <button
        onClick={singing ? stopSing : grabMic}
        disabled={buttonDisabled}
        title={buttonTitle}
        style={{
          opacity: buttonDisabled ? 0.5 : 1,
          cursor: buttonDisabled ? "not-allowed" : "pointer",
        }}
      >
        {singing ? "🛑 停止唱" : "🎤 搶 Mic"}
      </button>
    </div>
  );
}
