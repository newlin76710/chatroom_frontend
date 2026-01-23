// SongPanel.jsx
import { useState, useEffect, useRef } from "react";
import { connect, Room, LocalAudioTrack } from "livekit-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL;
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

export default function SongPanel({ room, name }) {
  const [queue, setQueue] = useState([]);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | waiting | singing | listening
  const lkRoomRef = useRef(null);
  const audioTrackRef = useRef(null);

  /* ========================
     加入隊列
  ======================== */
  const joinQueue = async () => {
    setStatus("waiting");
    const res = await fetch(`${BACKEND}/song/joinQueue?room=${room}&singer=${name}`);
    const data = await res.json();
    setQueue(data.queue);
    setCurrentSinger(data.currentSinger);

    if (data.currentSinger === name) {
      startSing();
    }
  };

  /* ========================
     開始唱
  ======================== */
  const startSing = async () => {
    setStatus("singing");
    try {
      // 1️⃣ 取得 LiveKit token
      const tokenRes = await fetch(`${BACKEND}/livekit-token?room=${room}&name=${name}`);
      const { token } = await tokenRes.json();

      // 2️⃣ 連線 LiveKit
      const lkRoom = await connect(LIVEKIT_URL, token);
      lkRoomRef.current = lkRoom;

      // 3️⃣ 建立本地音訊 track
      const localTrack = await LocalAudioTrack.create();
      audioTrackRef.current = localTrack;

      // 4️⃣ 發布 track
      await lkRoom.localParticipant.publishTrack(localTrack);

      // 5️⃣ 監聽房間事件，更新當前歌手
      lkRoom.on("participantConnected", (p) => console.log("Participant joined:", p.identity));
      lkRoom.on("participantDisconnected", (p) => console.log("Participant left:", p.identity));
      lkRoom.on("trackSubscribed", (track, participant) => {
        console.log("Subscribed to track:", participant.identity);
      });

      console.log("[SongPanel] 開始唱歌成功");
    } catch (err) {
      console.error("[SongPanel] startSing failed", err);
      setStatus("idle");
      alert("連線失敗，請檢查 token 或網路");
    }
  };

  /* ========================
     停止唱
  ======================== */
  const stopSing = async () => {
    if (audioTrackRef.current) {
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    }
    if (lkRoomRef.current) {
      lkRoomRef.current.disconnect();
      lkRoomRef.current = null;
    }

    setStatus("idle");

    // 通知後端離開 queue
    await fetch(`${BACKEND}/song/leaveQueue?room=${room}&singer=${name}`);
  };

  /* ========================
     UI
  ======================== */
  return (
    <div style={{ padding: 12 }}>
      <p>🎤 目前演唱者：{currentSinger || "無人唱歌"}</p>
      <p>📝 排隊名單：{queue.map(u => u.name).join(", ")}</p>

      {status === "idle" && (
        <button onClick={joinQueue}>🎤 開始唱（搶 Mic）</button>
      )}

      {status === "waiting" && <p>⏳ 等待輪到你唱...</p>}

      {status === "singing" && (
        <button onClick={stopSing}>🛑 停止唱</button>
      )}
    </div>
  );
}
