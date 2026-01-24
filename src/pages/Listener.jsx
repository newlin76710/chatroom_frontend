import { useState, useEffect, useRef } from "react";
import { Room } from "livekit-client";

export default function Listener({ room, name, socket }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [listening, setListening] = useState(false);
  const [currentSinger, setCurrentSinger] = useState(null);

  // 記住目前正在播放的 audio elements（避免疊音）
  const audioElementsRef = useRef({});

  /* ===== 監聽目前演唱者（Socket） ===== */
  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      console.log("[Listener] micStateUpdate:", data);
      setCurrentSinger(data.currentSinger || null);
    };

    socket.on("micStateUpdate", handler);
    return () => socket.off("micStateUpdate", handler);
  }, [socket]);

  /* ===== 停止收聽（清乾淨） ===== */
  const stopListening = () => {
    console.log("[Listener] stopping listening");

    if (lkRoom) {
      lkRoom.disconnect();
      lkRoom.removeAllListeners();
    }

    Object.values(audioElementsRef.current).forEach((el) => {
      el.pause?.();
      el.remove();
    });

    audioElementsRef.current = {};
    setLkRoom(null);
    setListening(false);
  };

  /* ===== 開始 / 停止收聽 ===== */
  const toggleListening = async () => {
    if (!name) return;

    if (listening) {
      stopListening();
      return;
    }

    try {
      console.log(`[Listener] requesting token for ${name} @ ${room}`);

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/livekit-token?room=${room}&name=${name}`
      );
      const data = await res.json();
      if (!data.token) return;

      const lk = new Room();

      lk.on("connected", () =>
        console.log("[Listener] LiveKit connected")
      );

      lk.on("disconnected", () =>
        console.log("[Listener] LiveKit disconnected")
      );

      /* ===== 收到音訊 Track ===== */
      lk.on("trackSubscribed", (track, publication, participant) => {
        console.log(
          "[Listener] trackSubscribed:",
          track.kind,
          participant.identity
        );

        if (track.kind !== "audio") return;

        // 👉 如果你「只想聽目前唱歌的人」，打開這段
        if (currentSinger && participant.identity !== currentSinger) {
          console.log("[Listener] ignore non-singer:", participant.identity);
          return;
        }

        // 移除舊的（避免疊音）
        if (audioElementsRef.current[participant.identity]) {
          audioElementsRef.current[participant.identity].remove();
          delete audioElementsRef.current[participant.identity];
        }

        // ✅ 正確方式：attach()
        const audioEl = track.attach();

        audioEl.autoplay = true;
        audioEl.muted = false;
        audioEl.volume = 1;

        audioEl.id = `audio-${participant.identity}`;
        document.body.appendChild(audioEl);

        // 行動裝置保險
        audioEl.play?.().catch(() => {});

        audioElementsRef.current[participant.identity] = audioEl;

        console.log(
          "[Listener] audio playing:",
          participant.identity
        );
      });

      /* ===== Track 被移除 ===== */
      lk.on("trackUnsubscribed", (track, publication, participant) => {
        console.log(
          "[Listener] trackUnsubscribed:",
          track.kind,
          participant.identity
        );

        if (track.kind !== "audio") return;

        const el = audioElementsRef.current[participant.identity];
        if (el) {
          el.pause?.();
          el.remove();
          delete audioElementsRef.current[participant.identity];
        }

        track.detach().forEach((e) => e.remove());
      });

      await lk.connect(import.meta.env.VITE_LIVEKIT_URL, data.token, {
        autoSubscribe: true,
      });

      setLkRoom(lk);
      setListening(true);

      console.log("[Listener] listening started");
    } catch (err) {
      console.error("[Listener] failed to listen:", err);
      stopListening();
    }
  };

  return (
    <div>
      <p>🎤 目前演唱者：{currentSinger || "無人唱歌"}</p>
      <button onClick={toggleListening}>
        {listening ? "🛑 停止收聽" : "🎧 開始收聽"}
      </button>
    </div>
  );
}
