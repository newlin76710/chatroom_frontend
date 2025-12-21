import { useRef, useState, useEffect } from "react";
import "./SongPanel.css";

export default function SongPanel({ socket, room, onLeaveRoom }) {
  const [phase, setPhase] = useState("idle"); // idle | singing | scoring | canListen
  const [listeners, setListeners] = useState([]);
  const [micLevel, setMicLevel] = useState(0);
  const [myScore, setMyScore] = useState(null);
  const [avgScore, setAvgScore] = useState(null);
  const [scoreCount, setScoreCount] = useState(0);
  const [currentSinger, setCurrentSinger] = useState(null);

  const localStreamRef = useRef(null);
  const pcsRef = useRef(new Map());
  const audioRefs = useRef(new Map());
  const listenerPCRef = useRef(null);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);

  // ===== 新增倒數計時狀態 =====
  const [scoreCountdown, setScoreCountdown] = useState(0);
  const countdownRef = useRef(null);

  // ===== 開始唱歌 =====
  const startSinging = async () => {
    if (phase !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateMicMeter = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const avg = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
        setMicLevel(avg / 255);
        animationIdRef.current = requestAnimationFrame(updateMicMeter);
      };
      updateMicMeter();

      setPhase("singing");
      setMyScore(null);
      setAvgScore(null);
      setScoreCount(0);

      socket.emit("start-singing", { room, singer: socket.id });
    } catch (e) {
      console.error("麥克風失敗", e);
    }
  };

  // ===== 更新 stopSinging =====
  const stopSinging = () => {
    if (phase !== "singing") return;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    cancelAnimationFrame(animationIdRef.current);
    audioCtxRef.current?.close();

    pcsRef.current.forEach((pc, listenerId) => {
      pc.close();
      socket.emit("listener-left", { room, listenerId });
    });
    pcsRef.current.clear();

    audioRefs.current.forEach(a => {
      a.pause();
      a.srcObject = null;
      a.remove();
    });
    audioRefs.current.clear();

    setMicLevel(0);
    setPhase("scoring");

    // 倒數設定，例如 15 秒
    setScoreCountdown(15);
    countdownRef.current = setInterval(() => {
      setScoreCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          // 可選：強制結束評分
          socket.emit("scoreTimeUp", { room });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    socket.emit("stop-singing", { room, singer: socket.id });
    console.log("🎤 歌唱結束，開始評分倒數");
  };

  // ===== 評分 =====
  const scoreSong = (score) => {
    if (phase !== "scoring") return;
    setMyScore(score);
    socket.emit("scoreSong", { room, score });
  };

  // ===== 聽眾控制 =====
  const startListening = () => socket.emit("listener-ready", { room, listenerId: socket.id });
  const stopListening = () => socket.emit("stop-listening", { room, listenerId: socket.id });

  // ===== 唱歌者處理新聽眾 =====
  useEffect(() => {
        socket.on("update-room-phase", ({ phase, singer }) => {
      setPhase(phase);
      setCurrentSinger(singer || null);
    });

    socket.on("score-countdown", ({ countdown }) => setScoreCountdown(countdown));
    socket.on("new-listener", async ({ listenerId }) => {
      if (phase !== "singing" || !localStreamRef.current) return;
      if (pcsRef.current.has(listenerId)) return;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

      pc.onicecandidate = e => {
        if (e.candidate) socket.emit("webrtc-candidate", { to: listenerId, candidate: e.candidate });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { to: listenerId, offer });

      pcsRef.current.set(listenerId, pc);
    });

    socket.on("listener-left", ({ listenerId }) => {
      const pc = pcsRef.current.get(listenerId);
      if (pc) pc.close();
      pcsRef.current.delete(listenerId);

      const audio = audioRefs.current.get(listenerId);
      if (audio) {
        audio.pause(); audio.srcObject = null; audio.remove();
        audioRefs.current.delete(listenerId);
      }
    });

    socket.on("webrtc-answer", async ({ from, answer }) => {
      const pc = pcsRef.current.get(from);
      if (pc) await pc.setRemoteDescription(answer);
    });

    socket.on("webrtc-candidate", async ({ from, candidate }) => {
      const pc = pcsRef.current.get(from);
      if (pc) await pc.addIceCandidate(candidate).catch(() => { });
    });

    return () => {
      socket.off("update-room-phase");
      socket.off("score-countdown");
      socket.off("new-listener"); socket.off("listener-left");
      socket.off("webrtc-answer"); socket.off("webrtc-candidate");
    };
  }, [socket, phase]);

  // ===== 聽眾接收音訊 =====
  useEffect(() => {
    socket.on("webrtc-offer", async ({ from, offer }) => {
      if (phase === "singing") return;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      listenerPCRef.current = pc;

      pc.ontrack = e => {
        let audio = audioRefs.current.get(from);
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          document.body.appendChild(audio);
          audioRefs.current.set(from, audio);
        }
        audio.srcObject = e.streams[0];
      };

      pc.onicecandidate = e => {
        if (e.candidate) socket.emit("webrtc-candidate", { to: from, candidate: e.candidate });
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { to: from, answer });
    });

    return () => socket.off("webrtc-offer");
  }, [socket, phase]);

  // ===== 聽眾清理 =====
  useEffect(() => {
    const onListenerLeft = () => {
      if (listenerPCRef.current) { listenerPCRef.current.close(); listenerPCRef.current = null; }
      audioRefs.current.forEach(a => { a.pause(); a.srcObject = null; a.remove(); });
      audioRefs.current.clear();
    };
    socket.on("listener-left", onListenerLeft);
    return () => socket.off("listener-left", onListenerLeft);
  }, [socket]);

  // ===== 更新聽眾列表 =====
  useEffect(() => {
    socket.on("update-listeners", ({ listeners }) => setListeners(listeners || []));
    return () => socket.off("update-listeners");
  }, [socket]);

  // ===== 接收目前唱歌者 =====
  useEffect(() => {
    socket.on("user-start-singing", ({ singer }) => setCurrentSinger(singer));
    socket.on("user-stop-singing", () => setCurrentSinger(null));
    return () => {
      socket.off("user-start-singing"); socket.off("user-stop-singing");
    };
  }, [socket]);


  // ===== songResult 接收後清理倒數 =====
  useEffect(() => {
    socket.on("songResult", ({ avg, count }) => {
      setAvgScore(avg);
      setScoreCount(count);
      setPhase("idle");
      setMyScore(null);

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setScoreCountdown(0);
      }
    });
    return () => socket.off("songResult");
  }, [socket]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // 停止聽歌
      stopListening();

      // 關閉自己的 WebRTC
      if (listenerPCRef.current) {
        listenerPCRef.current.close();
        listenerPCRef.current = null;
      }

      // 移除 audio 元素
      audioRefs.current.forEach(a => {
        a.pause();
        a.srcObject = null;
        a.remove();
      });
      audioRefs.current.clear();

      // 可選：斷線 socket
      socket.disconnect();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket]);

  // ===== 離開房間清理 =====
  const leaveRoom = () => {
    handleBeforeUnload(); // 重用上面的清理
    onLeaveRoom?.();
  };

  // ===== UI =====
  return (
    <div className="song-panel">
      <h4>🎤 唱歌區</h4>

      <button onClick={startSinging} disabled={phase !== "idle" || currentSinger}>開始唱歌</button>
      <button onClick={stopSinging} disabled={phase !== "singing"}>停止唱歌</button>

      {(phase === "singing" || phase === "scoring") && (
        <div className="mic-meter">
          {phase === "singing" && <div className="mic-bar" style={{ width: `${micLevel * 100}%` }} />}
          {phase === "scoring" && (
            <div className="my-score">
              {myScore ? <>你給了 <strong>{myScore}</strong> 分 ⭐</> : <>請評分…</>}
              {avgScore !== null && <> / 平均: {avgScore.toFixed(1)} ({scoreCount}人)</>}
            </div>
          )}
        </div>
      )}

      {phase === "scoring" && (
        <div className="score-container">
          <div className="score-countdown">評分倒數: {scoreCountdown} 秒</div>
          <div className="score-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`star ${myScore >= n ? "selected" : ""}`}
                onClick={() => scoreSong(n)}
              >
                ★
              </span>
            ))}
          </div>
          {myScore && <div className="your-score">你給了 <strong>{myScore}</strong> 分 ⭐</div>}
          {avgScore !== null && <div className="avg-score">平均: {avgScore.toFixed(1)} ({scoreCount}人)</div>}
        </div>
      )}

      <div className="listeners">
        <h4>聽眾 ({listeners.length})</h4>
        {phase === "canListen" && <>
          <button onClick={startListening}>開始聽歌</button>
          <button onClick={stopListening}>取消聽歌</button>
        </>}
      </div>
    </div>
  );
}
