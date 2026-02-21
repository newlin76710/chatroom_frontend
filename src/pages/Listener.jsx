import { useState, useEffect, useRef } from "react";
import { Room } from "livekit-client";
import "./Listener.css";

export default function Listener({ room, name, socket, onSingerChange }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [listening, setListening] = useState(false);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [nextSinger, setNextSinger] = useState(null);
  const [score, setScore] = useState(0);
  const [ratedSinger, setRatedSinger] = useState(null);
  const [averageScore, setAverageScore] = useState(null);
  const [scoreCount, setScoreCount] = useState(0);

  const togglingRef = useRef(false); // ⭐ 防止連續 toggle
  const audioElementsRef = useRef({});
  const audioTracksRef = useRef({});

  useEffect(() => {
    setScore(0);
    setRatedSinger(null);
  }, [currentSinger]);

  /* ===== Socket：目前演唱者 ===== */
  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      const singer = data.currentSinger || null;
      const queue = data.queue || [];
      setNextSinger(queue.length > 0 ? queue[0] : null);
      setCurrentSinger(singer);
      onSingerChange?.(singer);
    };

    socket.on("micStateUpdate", handler);
    return () => socket.off("micStateUpdate", handler);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      if (data.singer === currentSinger) {
        setAverageScore(data.average);
        setScoreCount(data.count);
      }
    };

    socket.on("scoreUpdate", handler);
    return () => socket.off("scoreUpdate", handler);
  }, [socket, currentSinger]);

  const submitScore = (value) => {
    if (!currentSinger || ratedSinger === currentSinger) return;

    socket.emit("rateSinger", {
      room,
      singer: currentSinger,
      score: value
    });

    setScore(value);
    setRatedSinger(currentSinger);
  };

  /* ===== 清 audio ===== */
  const clearAllAudio = () => {
    Object.values(audioElementsRef.current).forEach((el) => {
      el.pause?.();
      el.remove();
    });
    audioElementsRef.current = {};
  };

  /* ===== 停止 ===== */
  const stopListening = async () => {
    if (!lkRoom) return;

    try {
      lkRoom.removeAllListeners();
      lkRoom.disconnect();
    } catch { }

    clearAllAudio();
    audioTracksRef.current = {};
    setLkRoom(null);
    setListening(false);

    // ⭐ 給 LiveKit 一點時間清乾淨（關鍵）
    await new Promise((r) => setTimeout(r, 300));
  };

  /* ===== 開始 ===== */
  const startListening = async () => {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/livekit-token?room=${room}&name=${name}`
    );
    const data = await res.json();
    if (!data.token) return;

    const lk = new Room();

    lk.on("trackSubscribed", (track, pub, participant) => {
      if (track.kind !== "audio") return;

      audioTracksRef.current[participant.identity] = track;

      if (participant.identity === currentSinger) {
        clearAllAudio();
        const el = track.attach();
        el.autoplay = true;
        document.body.appendChild(el);
        audioElementsRef.current[participant.identity] = el;
      }
    });

    lk.on("trackUnsubscribed", (track, pub, participant) => {
      delete audioTracksRef.current[participant.identity];
    });

    await lk.connect(import.meta.env.VITE_LIVEKIT_URL, data.token, {
      autoSubscribe: true,
    });

    setLkRoom(lk);
    setListening(true);
  };

  /* ===== 手動 toggle ===== */
  const toggleListening = async () => {
    if (togglingRef.current) return;
    togglingRef.current = true;

    try {
      if (listening) {
        await stopListening();
      } else {
        await startListening();
      }
    } finally {
      togglingRef.current = false;
    }
  };

  /* ===== ⭐ singer 換人 → 自動 toggle 兩次 ===== */
  useEffect(() => {
    if (!listening || !currentSinger) return;
    if (togglingRef.current) return;

    (async () => {
      togglingRef.current = true;
      await stopListening();
      await startListening();
      togglingRef.current = false;
    })();
  }, [currentSinger]);

  return (
    <div className="listener-bar">
      <span className="current-singer">
        🎤 演唱者：{currentSinger || "無"} &nbsp;
      </span>
      <span className="next-singer">
        ⏭ 下一位：{nextSinger || "無"} &nbsp;
      </span>
      <button className="listen-btn" onClick={toggleListening}>
        {listening ? "🛑 停止聽" : "🎧 開始聽"}
      </button>

      {/* {currentSinger && (
        <div className="rating-panel">
          <span>評分：</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={`star ${score >= s ? "active" : ""}`}
              onClick={() => submitScore(s)}
            >
              ★
            </span>
          ))}
        </div>
      )}

      {averageScore && (
        <div className="score-display">
          🎵 平均：{averageScore}分/{scoreCount}人
        </div>
      )} */}

    </div>
  );
}
