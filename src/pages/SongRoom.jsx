import { useState, useEffect, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";
import "./SongRoom.css";

const ANL = import.meta.env.VITE_ADMIN_MIN_LEVEL || 91;

export default function SongRoom({ room, name, socket, currentSinger, myLevel }) {
  const [lkRoom, setLkRoom] = useState(null);
  const [singing, setSinging] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [myPosition, setMyPosition] = useState(0);
  const [queue, setQueue] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inQueue = queue.includes(name);
  const roomRef = useRef(null);
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);
  const micTrackRef = useRef(null);
  const micSourceRef = useRef(null);
  const micStreamRef = useRef(null);
  const panelRef = useRef(null);
  const posRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const startDrag = (clientX, clientY) => {
    posRef.current.dragging = true;

    const el = panelRef.current;
    const rect = el.getBoundingClientRect();

    // 🔥 關鍵：清掉衝突定位
    el.style.right = "auto";
    el.style.bottom = "auto";

    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;

    posRef.current.offsetX = clientX - rect.left;
    posRef.current.offsetY = clientY - rect.top;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  };

  const onMouseDown = (e) => {
    startDrag(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };
  const moveDrag = (clientX, clientY) => {
    if (!posRef.current.dragging) return;

    const x = clientX - posRef.current.offsetX;
    const y = clientY - posRef.current.offsetY;

    panelRef.current.style.left = `${x}px`;
    panelRef.current.style.top = `${y}px`;
    panelRef.current.style.right = "auto";
  };

  const onMouseMove = (e) => {
    moveDrag(e.clientX, e.clientY);
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  };
  const endDrag = () => {
    posRef.current.dragging = false;

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
  };

  const onMouseUp = () => endDrag();
  const onTouchEnd = () => endDrag();
  useEffect(() => {
    if (!socket) return;

    socket.on("forceStopSing", () => stopSing());
    socket.on("yourTurn", () => { setWaiting(false); grabMic(); });
    socket.on("micStateUpdate", data => { setQueue(data.queue); setMyPosition(data.queue.indexOf(name) + 1); });

    return () => {
      socket.off("forceStopSing");
      socket.off("yourTurn");
      socket.off("micStateUpdate");
    };
  }, [socket, name]);

  const startSing = async (jwtToken) => {
    try {
      const lk = new Room({
        adaptiveStream: true,
        dynacast: true,
        reconnectPolicy: {
          maxRetries: 999,
        }
      });
      roomRef.current = lk;
      await lk.connect(import.meta.env.VITE_LIVEKIT_URL, jwtToken, {
        autoSubscribe: true,
      });

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      destRef.current = dest;

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(dest);
      micSourceRef.current = micSource;
      micStreamRef.current = micStream;
      const micTrack = new LocalAudioTrack(dest.stream.getAudioTracks()[0]);
      micTrackRef.current = micTrack;
      await lk.localParticipant.publishTrack(micTrack, {
        audioBitrate: 32000
      });

      setLkRoom(lk);
      setSinging(true);

    } catch (err) { console.error(err); }
  };

  const stopSing = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const lk = roomRef.current;
    await lk?.localParticipant.setMicrophoneEnabled(false);
    if (micTrackRef.current) await lk?.localParticipant.unpublishTrack(micTrackRef.current);
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    micTrackRef.current?.mediaStreamTrack?.stop();
    micTrackRef.current?.stop();
    micTrackRef.current = null;
    await lk?.disconnect();
    roomRef.current = null;
    setLkRoom(null);
    await audioCtxRef.current?.suspend();
    await audioCtxRef.current?.close();
    audioCtxRef.current = null;
    destRef.current = null;
    setSinging(false);
    socket.emit("stopSing", { room, singer: name });
    setIsProcessing(false);
  };

  const grabMic = () => {
    if (isProcessing || singing) return;

    setIsProcessing(true);

    socket.emit("grabMic", { room, singer: name });
    socket.off("livekit-token");
    socket.once("livekit-token", async ({ token }) => {
      await startSing(token);
      setIsProcessing(false);
    });
  };
  const joinQueue = () => { socket.emit("joinQueue", { room, name }); setWaiting(true); };
  const leaveQueue = () => { socket.emit("leaveQueue", { room, name }); setWaiting(false); };
  const forceStopSinger = (singerName) => { socket.emit("forceStopSinger", { room, singer: singerName }); };

  const otherSinger = currentSinger && currentSinger !== name;

  return (
    <div className="songroom-container">
      <button className="songroom-button" disabled={isProcessing}
        onClick={singing ? stopSing : inQueue ? leaveQueue : otherSinger ? joinQueue : grabMic}>
        {isProcessing ? "⏳ 處理中" : singing ? "🛑 下麥" : inQueue ? `🎤 取消排麥` : otherSinger ? "🎶 排麥" : "🎤 上麥"}
      </button>

      <div ref={panelRef} className="queue-panel">
        <div className="queue-panel-header" onClick={() => setPanelOpen(!panelOpen)} onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
          <span>🎤 排麥列表</span>
          <span>{panelOpen ? "−" : "+"}</span>
        </div>
        {panelOpen && (
          <div className="queue-panel-content">
            <div style={{ marginBottom: 8 }}>
              <strong>正在唱：</strong>
              {currentSinger && (
                <div className="queue-item">
                  <span>{currentSinger}</span>
                  {myLevel >= ANL && <button className="kick-button" onClick={() => forceStopSinger(currentSinger)}>踢下麥</button>}
                </div>
              )}
              {!currentSinger && <div className="queue-item">無 </div>}
            </div>

            <div>
              <strong>排麥中：</strong>
              {queue.length === 0 ? <div style={{ opacity: 0.6 }}>目前沒有人排麥</div> :
                queue.map((q, i) => (
                  <div key={i} className={`queue-item ${q === name ? "me" : ""}`}>
                    <span>{i + 1}. {q}{q === name && " (我)"}</span>
                    {myLevel >= ANL && <div className="admin-controls">
                      {i === 0 && currentSinger && (
                        <button
                          className="force-button"
                          title="直接推上來替換演唱者"
                          onClick={() => socket.emit("adminForceNext", { room })}>
                          ⬆
                        </button>
                      )}

                      {i > 0 && (
                        <button
                          className="kick-button"
                          onClick={() =>
                            socket.emit("adminMoveQueue", {
                              room,
                              fromIndex: i,
                              toIndex: i - 1
                            })
                          }>
                          ⬆
                        </button>
                      )}

                      {i < queue.length - 1 && (
                        <button
                          className="kick-button"
                          onClick={() =>
                            socket.emit("adminMoveQueue", {
                              room,
                              fromIndex: i,
                              toIndex: i + 1
                            })
                          }>
                          ⬇
                        </button>
                      )}

                      <button
                        className="kick-button"
                        onClick={() => forceStopSinger(q)}>
                        ❌
                      </button>
                    </div>}
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
