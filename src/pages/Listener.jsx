import { useState, useEffect } from "react";
import { Room } from "livekit-client";

export default function Listener({ room, name, socket }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [listening, setListening] = useState(false);
  const [currentSinger, setCurrentSinger] = useState(null);

  useEffect(() => {
    if (!socket) return;

    console.log("[Listener] socket ready, subscribing to micStateUpdate");

    const handler = (data) => {
      console.log("[Listener] micStateUpdate received:", data);
      setCurrentSinger(data.currentSinger);
    };

    socket.on("micStateUpdate", handler);

    return () => {
      console.log("[Listener] unsubscribing from micStateUpdate");
      socket.off("micStateUpdate", handler);
    };
  }, [socket]);

  const toggleListening = async () => {
    if (!name) {
      console.warn("[Listener] name is undefined, cannot get token");
      return;
    }

    if (listening) {
      console.log("[Listener] stopping listening");
      if (lkRoom) {
        lkRoom.disconnect();
        lkRoom.removeAllListeners();
      }
      setListening(false);
      setLkRoom(null);
      return;
    }

    try {
      console.log(`[Listener] requesting LiveKit token for ${name} in room ${room}`);
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/livekit-token?room=${room}&name=${name}`
      );
      const data = await res.json();
      console.log("[Listener] token response:", data);

      if (!data.token) {
        console.error("[Listener] token missing in response");
        return;
      }

      const lk = new Room();

      lk.on("connected", () => console.log("[Listener] LiveKit room connected"));
      lk.on("disconnected", () => console.log("[Listener] LiveKit room disconnected"));

      lk.on("trackSubscribed", (track, publication, participant) => {
        console.log("[Listener] trackSubscribed:", track.kind, participant.identity);

        if (track.kind === "audio") {
          // 建立 audio element 播放音訊
          const audioEl = track.play();
          audioEl.autoplay = true;
          audioEl.volume = 1;
          audioEl.muted = false;

          // 附加到 DOM，方便 debug
          audioEl.id = `audio-${participant.identity}`;
          if (!document.getElementById(audioEl.id)) {
            document.body.appendChild(audioEl);
          }

          console.log("[Listener] audio track playing for", participant.identity);
        }
      });

      lk.on("trackUnsubscribed", (track, publication, participant) => {
        console.log("[Listener] trackUnsubscribed:", track.kind, participant.identity);
      });

      await lk.connect(import.meta.env.VITE_LIVEKIT_URL, data.token, { autoSubscribe: true });

      setLkRoom(lk);
      setListening(true);
      console.log("[Listener] listening started");
    } catch (err) {
      console.error("[Listener] failed to listen:", err);
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
