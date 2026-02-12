import { useState, useEffect, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";

export default function SongRoom({ room, name, socket, currentSinger }) {

  const [singing, setSinging] = useState(false);
  const [sharing, setSharing] = useState(false);

  const roomRef = useRef(null);
  const micStreamRef = useRef(null);
  const displayStreamRef = useRef(null);

  // 防止重複點擊
  const stoppingRef = useRef(false);
  const startingRef = useRef(false);

  //////////////////////////////////////////////////////
  // 🔥 強制停止（Server 可呼叫）
  //////////////////////////////////////////////////////

  useEffect(() => {
    if (!socket) return;

    const forceStop = () => stopSing(true);

    socket.on("forceStopSing", forceStop);

    return () => {
      socket.off("forceStopSing", forceStop);
    };
  }, [socket]);

  //////////////////////////////////////////////////////
  // 🔥 React unmount 防漏音（超級重要）
  //////////////////////////////////////////////////////

  useEffect(() => {
    return () => stopSing(true);
  }, []);

  //////////////////////////////////////////////////////
  // 🎤 上麥
  //////////////////////////////////////////////////////

  const startSing = async (token) => {

    if (startingRef.current) return;
    startingRef.current = true;

    try {

      const lk = new Room();

      await lk.connect(import.meta.env.VITE_LIVEKIT_URL, token);

      roomRef.current = lk;

      //////////////////////////////////////
      // 防止斷線殘音
      //////////////////////////////////////

      lk.on("disconnected", () => {
        console.log("LiveKit disconnected -> force cleanup");
        stopSing(true);
      });

      //////////////////////////////////////
      // 麥克風
      //////////////////////////////////////

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      micStreamRef.current = micStream;

      const track = new LocalAudioTrack(
        micStream.getAudioTracks()[0]
      );

      await lk.localParticipant.publishTrack(track);

      setSinging(true);

      console.log("🎤 上麥成功");

    } catch (err) {
      console.error("startSing error:", err);
      stopSing(true);
    }

    startingRef.current = false;
  };

  //////////////////////////////////////////////////////
  // 🛑 下麥（零卡死版本）
  //////////////////////////////////////////////////////

  const stopSing = () => {

    if (stoppingRef.current) return;
    stoppingRef.current = true;

    try {

      // ⭐⭐⭐⭐⭐ 先更新 UI（極重要）
      setSinging(false);
      setSharing(false);

      //////////////////////////////////////
      // stop 所有硬體音源
      //////////////////////////////////////

      micStreamRef.current?.getTracks().forEach(t => t.stop());
      displayStreamRef.current?.getTracks().forEach(t => t.stop());

      micStreamRef.current = null;
      displayStreamRef.current = null;

      //////////////////////////////////////
      // ⭐ 暴力斷 LiveKit（不要 await）
      //////////////////////////////////////

      if (roomRef.current) {
        try {
          roomRef.current.disconnect(true); // true = stop tracks
        } catch {}
      }

      roomRef.current = null;
      socket.emit("stopSing", { room, singer: name });
      console.log("🛑 已完全下 mic（無殘音）");
    } catch (err) {
      console.error(err);
    }

    stoppingRef.current = false;
  };

  //////////////////////////////////////////////////////
  // 📢 分享分頁音（獨立 track）
  //////////////////////////////////////////////////////

  const shareTabAudio = async () => {
    if (!roomRef.current) return;

    try {

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const audioTrack = stream.getAudioTracks()[0];

      if (!audioTrack) return;

      displayStreamRef.current = stream;

      const tabTrack = new LocalAudioTrack(audioTrack);

      await roomRef.current.localParticipant.publishTrack(tabTrack);

      setSharing(true);

      audioTrack.onended = () => {
        console.log("使用者停止分享");

        tabTrack.stop();

        try {
          roomRef.current?.localParticipant.unpublishTrack(tabTrack);
        } catch {}

        setSharing(false);
      };

    } catch (err) {
      console.error(err);
    }
  };

  //////////////////////////////////////////////////////
  // grab mic
  //////////////////////////////////////////////////////

  const grabMic = () => {

    if (startingRef.current) return;

    socket.emit("grabMic", { room, singer: name });

    const handler = ({ token }) => {
      startSing(token);
      socket.off("livekit-token", handler);
    };

    socket.on("livekit-token", handler);
  };

  //////////////////////////////////////////////////////

  const otherSinger = currentSinger && currentSinger !== name;
  const grabDisabled = !singing && otherSinger;

  //////////////////////////////////////////////////////

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
        {singing ? "🛑 下麥" : "🎤 上麥"}
      </button>

      {/* <button
        onClick={shareTabAudio}
        disabled={!singing || sharing}
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
