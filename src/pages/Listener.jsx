import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const SFU_URL = "http://220.135.33.190:30000";

export default function Listener({ room }) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentSinger, setCurrentSinger] = useState(null);
  const [listening, setListening] = useState(false);
  const [consumers, setConsumers] = useState([]);

  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);

  /* ========================
     初始化 Socket
  ======================== */
  useEffect(() => {
    const socket = io(SFU_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Listener] socket connected", socket.id);
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Listener] socket disconnected");
    });

    // 更新目前唱歌的人
    socket.on("currentSinger", ({ singer }) => {
      console.log("[Listener] currentSinger =", singer);
      setCurrentSinger(singer);
    });

    // 有新 producer，自動 consume
    socket.on("newProducer", async ({ producerId }) => {
      if (!deviceRef.current || !recvTransportRef.current) return;
      try {
        const consumerData = await new Promise(cb =>
          socket.emit(
            "consume",
            { room, producerId, rtpCapabilities: deviceRef.current.rtpCapabilities },
            cb
          )
        );
        if (!consumerData) return;

        const consumer = await recvTransportRef.current.consume({
          id: consumerData.id,
          producerId: consumerData.producerId,
          kind: consumerData.kind,
          rtpParameters: consumerData.rtpParameters,
        });

        const stream = new MediaStream([consumer.track]);
        setConsumers(prev => [...prev, { consumer, stream }]);
      } catch (err) {
        console.error("[Listener] consume failed", err);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [room]);

  /* ========================
     開始收聽
  ======================== */
  const startListening = async () => {
    if (!socketConnected || !currentSinger) return alert("目前沒人在唱或尚未連線");

    try {
      // Mediasoup Device
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      const routerRtpCapabilities = await new Promise(cb =>
        socketRef.current.emit("getRouterRtpCapabilities", { room }, cb)
      );
      await device.load({ routerRtpCapabilities });

      // RecvTransport
      const recvData = await new Promise(cb =>
        socketRef.current.emit("createWebRtcTransport", { room, direction: "recv" }, cb)
      );
      const recvTransport = device.createRecvTransport(recvData);
      recvTransportRef.current = recvTransport;

      recvTransport.on("connect", ({ dtlsParameters }, cb) => {
        socketRef.current.emit(
          "connectTransport",
          { room, direction: "recv", dtlsParameters },
          cb
        );
      });

      setListening(true);
      console.log("[Listener] 開始收聽");
    } catch (err) {
      console.error("[Listener] startListening failed", err);
    }
  };

  /* ========================
     停止收聽
  ======================== */
  const stopListening = () => {
    recvTransportRef.current?.close();
    setListening(false);
    recvTransportRef.current = null;
    deviceRef.current = null;
    setConsumers([]);
    console.log("[Listener] 停止收聽");
  };

  /* ========================
     UI
  ======================== */
  return (
    <div style={{ padding: 12 }}>
      <p>🎤 目前演唱者：{currentSinger || "無人唱歌"}</p>

      {!listening && currentSinger && (
        <button onClick={startListening}>
          🎧 開始收聽
        </button>
      )}

      {listening && (
        <button onClick={stopListening}>
          🛑 停止收聽
        </button>
      )}

      {consumers.map((c, i) => (
        <audio
          key={i}
          ref={el => el && (el.srcObject = c.stream)}
          autoPlay
          playsInline
        />
      ))}
    </div>
  );
}
