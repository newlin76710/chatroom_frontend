// SongPanel.jsx
import { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const SFU_URL = "http://220.135.33.190:30000";

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
    const socket = io(SFU_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[SongPanel] socket connected", socket.id);
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[SongPanel] socket disconnected");
    });

    // 被別人搶 mic
    socket.on("forceStop", () => {
      console.warn("[SongPanel] 你被踢下 Mic");
      stopSing(true);
    });

    // 收到新 producer，建立 consumer
    socket.on("newProducer", async ({ producerId }) => {
      console.log("[SongPanel] newProducer", producerId);
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
        console.error("[SongPanel] consume failed", err);
      }
    });

    return () => socket.disconnect();
  }, [room]);

  /* ========================
     搶 Mic 開始唱
  ======================== */
  const startSing = async () => {
    console.log("[SongPanel] 🔥 force start sing");

    if (!socketConnected) return alert("尚未連線 SFU");

    // 通知 server：我要搶 mic
    socketRef.current.emit("forceStartSing", { room, singer: name });

    try {
      // 1️⃣ 取得麥克風
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[SongPanel] mic ok");

      // 2️⃣ 建立 Mediasoup Device
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      // 2a. 拿 router RTP capabilities
      const routerRtpCapabilities = await new Promise((resolve) => {
        socketRef.current.emit("getRouterRtpCapabilities", { room }, (data) => {
          console.log("[SongPanel] routerRtpCapabilities received", data);
          resolve(data);
        });
      });

      await device.load({ routerRtpCapabilities });
      console.log("[SongPanel] device loaded");

      // 3️⃣ 建立 SendTransport
      const sendData = await new Promise((resolve) => {
        socketRef.current.emit(
          "createWebRtcTransport",
          { room, direction: "send" },
          (data) => {
            console.log("[SongPanel] send transport data:", data);
            resolve(data);
          }
        );
      });

      const sendTransport = device.createSendTransport(sendData);
      sendTransportRef.current = sendTransport;

      sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
        console.log("[SongPanel] sendTransport connecting...");
        socketRef.current.emit("connectTransport", { room, direction: "send", dtlsParameters }, callback);
      });

      sendTransport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
        console.log("[SongPanel] sendTransport produce event");
        socketRef.current.emit("produce", { room, kind, rtpParameters }, (data) => {
          console.log("[SongPanel] produce callback", data);
          callback(data);
        });
      });

      // 4️⃣ 發送音訊
      console.log("[SongPanel] producing track...");
      const producer = await sendTransport.produce({
        track: stream.getAudioTracks()[0],
        appData: { name } // 可加個辨識
      });
      console.log("[SongPanel] produce returned:", producer.id);
      producerRef.current = producer;
      setSinging(true);
      console.log("[SongPanel] 🎤 singing state set to true");

      // 5️⃣ 建立 RecvTransport（聽別人）
      const recvData = await new Promise((resolve) => {
        socketRef.current.emit(
          "createWebRtcTransport",
          { room, direction: "recv" },
          (data) => {
            console.log("[SongPanel] recv transport data:", data);
            resolve(data);
          }
        );
      });

      const recvTransport = device.createRecvTransport(recvData);
      recvTransportRef.current = recvTransport;

      recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
        console.log("[SongPanel] recvTransport connecting...");
        socketRef.current.emit("connectTransport", { room, direction: "recv", dtlsParameters }, callback);
      });

      console.log("[SongPanel] 🎧 RecvTransport ready, startSing complete");
    } catch (err) {
      console.error("[SongPanel] startSing failed", err);
    }
  };


  /* ========================
     停止唱
  ======================== */
  const stopSing = (forced = false) => {
    console.log("[SongPanel] stopSing forced =", forced);

    producerRef.current?.close();
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();

    producerRef.current = null;
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    deviceRef.current = null;

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
      {!singing && (
        <button onClick={startSing}>
          🎤 開始唱（搶 Mic）
        </button>
      )}

      {singing && (
        <button onClick={() => stopSing(false)}>
          🛑 停止唱
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
