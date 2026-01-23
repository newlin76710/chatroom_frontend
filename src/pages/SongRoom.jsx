import { useState, useEffect, useRef } from "react";
import { Room, createLocalAudioTrack } from "livekit-client";

export default function SongRoom({ room, name, socket }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [singing, setSinging] = useState(false);
  const [token, setToken] = useState(null);

  const roomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // 更新目前唱歌的人
    socket.on("micStateUpdate", (data) => {
      setCurrentSinger(data.currentSinger);
    });

    // 後端發 token 給前端
    socket.on("livekit-token", async ({ token }) => {
      console.log("[SongRoom] Got LiveKit token:", token);
      setToken(token);

      // 自動開始唱歌
      if (!singing) startSing(token);
    });

    // 被踢掉
    socket.on("forceStopSing", () => {
      console.log("[SongRoom] 被踢掉停止唱歌");
      stopSing();
      alert("你被踢掉了，Mic 被搶走！");
    });

    return () => {
      socket.off("micStateUpdate");
      socket.off("livekit-token");
      socket.off("forceStopSing");
    };
  }, [socket]);

  const startSing = async (jwtToken) => {
    try {
      const lk = new Room();
      roomRef.current = lk;

      await lk.connect(import.meta.env.VITE_LIVEKIT_URL, jwtToken);

      const track = await createLocalAudioTrack();
      await lk.localParticipant.publishTrack(track);

      setLkRoom(lk);
      setSinging(true);
      console.log("[SongRoom] 開始唱歌 🎤");
    } catch (err) {
      console.error("[SongRoom] connect/publish failed:", err);
      alert("無法開始唱歌，請稍後或確認網路是否正常");
    }
  };

  const stopSing = () => {
    lkRoom?.localParticipant.unpublishTracks();
    lkRoom?.disconnect();
    setLkRoom(null);
    setSinging(false);
    socket.emit("stopSing", { room, singer: name });
  };

  const grabMic = () => {
    console.log("[SongRoom] 嘗試搶 Mic");
    socket.emit("grabMic", { room, singer: name });
  };

  return (
    <div style={{ padding: 12 }}>
      {singing ? (
        <button onClick={stopSing}>🛑 停止唱</button>
      ) : (
        <button onClick={grabMic}>🎤 搶 Mic</button>
      )}
    </div>
  );
}
