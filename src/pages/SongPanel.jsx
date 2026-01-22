// SongPanel.jsx
import { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const SFU_URL = "ws://turn.ek21.com:8443"; // Cloudflare 443 代理，不用加 port

export default function SongPanel({ room, name }) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [singing, setSinging] = useState(false);
  const [consumers, setConsumers] = useState([]);

  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producerRef = useRef(null);

  /* ========================
     Socket 初始化
  ======================== */
  useEffect(() => {
    console.log("[SongPanel] init socket");
    const socket = io(SFU_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[SongPanel] socket connected", socket.id);
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[SongPanel] socket disconnected");
      setSocketConnected(false);
    });

    // 被別人搶 mic
    socket.on("forceStop", () => {
      console.warn("[SongPanel] 你被踢下 Mic");
      stopSing(true);
    });

    // 收到新 producer，建立 consumer
    socket.on("newProducer", async ({ producerId }) => {
      await consumeProducer(producerId);
    });

    return () => socket.disconnect();
  }, [room]);

  /* ========================
     Consume Producer
  ======================== */
  const consumeProducer = async (producerId) => {
    if (!deviceRef.current || !recvTransportRef.current) return;

    try {
      const consumerData = await new Promise((resolve) =>
        socketRef.current.emit(
          "consume",
          { room, producerId, rtpCapabilities: deviceRef.current.rtpCapabilities },
          resolve
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
      setConsumers((prev) => [...prev, { consumer, stream }]);
    } catch (err) {
      console.error("[SongPanel] consumeProducer failed", err);
    }
  };

  /* ========================
     搶 Mic 開始唱
  ======================== */
  const startSing = async () => {
    if (!socketConnected) return alert("尚未連線 SFU");

    socketRef.current.emit("forceStartSing", { room, singer: name });

    try {
      // 1️⃣ 取得麥克風
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2️⃣ 建立 Mediasoup Device
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      // 2a. 拿 router RTP capabilities
      const routerRtpCapabilities = await new Promise((resolve) => {
        socketRef.current.emit("getRouterRtpCapabilities", { room }, resolve);
      });

      await device.load({ routerRtpCapabilities });

      // 3️⃣ 建立 SendTransport
      const sendData = await new Promise((resolve) => {
        socketRef.current.emit("createWebRtcTransport", { room, direction: "send" }, resolve);
      });

      const sendTransport = device.createSendTransport(sendData);
      sendTransportRef.current = sendTransport;

      sendTransport.on("connect", ({ dtlsParameters }, callback) => {
        socketRef.current.emit("connectTransport", { room, direction: "send", dtlsParameters }, callback);
      });

      sendTransport.on("produce", ({ kind, rtpParameters }, callback) => {
        socketRef.current.emit("produce", { room, kind, rtpParameters }, callback);
      });

      const producer = await sendTransport.produce({
        track: stream.getAudioTracks()[0],
        appData: { name },
      });
      producerRef.current = producer;
      setSinging(true);

      // 4️⃣ 建立 RecvTransport
      const recvData = await new Promise((resolve) => {
        socketRef.current.emit("createWebRtcTransport", { room, direction: "recv" }, resolve);
      });

      const recvTransport = device.createRecvTransport(recvData);
      recvTransportRef.current = recvTransport;

      recvTransport.on("connect", ({ dtlsParameters }, callback) => {
        socketRef.current.emit("connectTransport", { room, direction: "recv", dtlsParameters }, callback);
      });

      // 5️⃣ 自動 consume 已存在的 producer
      socketRef.current.emit("existingProducers", { room }, (existing) => {
        existing?.forEach((pid) => consumeProducer(pid));
      });
    } catch (err) {
      console.error("[SongPanel] startSing failed", err);
    }
  };

  /* ========================
     停止唱
  ======================== */
  const stopSing = (forced = false) => {
    producerRef.current?.close();
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();

    producerRef.current = null;
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    deviceRef.current = null;
    setConsumers([]);

    setSinging(false);

    if (!forced) {
      socketRef.current.emit("stopSing", { room, singer: name });
    }
  };

  /* ========================
     UI
  ======================== */
  return (
    <div style={{ padding: 12 }}>
      {!singing && <button onClick={startSing}>🎤 開始唱（搶 Mic）</button>}
      {singing && <button onClick={() => stopSing(false)}>🛑 停止唱</button>}

      {consumers.map((c, i) => (
        <audio key={i} ref={(el) => el && (el.srcObject = c.stream)} autoPlay playsInline />
      ))}
    </div>
  );
}
