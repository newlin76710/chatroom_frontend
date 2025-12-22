// Listener.jsx（安全版）
import { useEffect, useRef, useState } from "react";
import * as mediasoupClient from "mediasoup-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

export default function Listener({ socket, room }) {
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);
  const audioRef = useRef(null);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const pendingProducersRef = useRef([]); // 還沒播放的 producerId
  const consumedRef = useRef(new Set());

  // ===== consume producer =====
  const consumeProducer = async (producerId) => {
    if (consumedRef.current.has(producerId)) return;
    consumedRef.current.add(producerId);

    if (!deviceRef.current || !recvTransportRef.current) return;

    const { id, kind, rtpParameters } = await new Promise((resolve) => {
      socket.emit(
        "consume",
        { producerId, rtpCapabilities: deviceRef.current.rtpCapabilities },
        resolve
      );
    });

    const consumer = await recvTransportRef.current.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      paused: false,
    });

    // 🔹 不覆蓋 srcObject，用 addTrack 累加
    let stream = audioRef.current.srcObject;
    if (!stream) {
      stream = new MediaStream();
      audioRef.current.srcObject = stream;
    }
    stream.addTrack(consumer.track);

    // 🔹 延遲播放，避免 AbortError
    setTimeout(async () => {
      try {
        await audioRef.current.play();
        console.log("🔊 playing", producerId);
      } catch (e) {
        console.error("❌ play failed", e);
      }
    }, 50);
  };

  // ===== 解鎖聲音 =====
  const unlockAudio = async () => {
    if (!audioRef.current) return;

    try {
      if (!audioRef.current.srcObject) audioRef.current.srcObject = new MediaStream();
      await new Promise(r => setTimeout(r, 50)); // 延遲
      await audioRef.current.play();

      setAudioUnlocked(true);
      console.log("🔓 Audio unlocked");

      // 🔹 立即 consume 當前 active producer
      socket.emit("get-active-producers", { room }, async (producers) => {
        for (const pid of producers) await consumeProducer(pid);
      });

      // 🔹 consume pending queue
      for (const pid of pendingProducersRef.current) await consumeProducer(pid);
      pendingProducersRef.current = [];
    } catch (e) {
      console.error("❌ unlock failed", e);
    }
  };

  // ===== 初始化 Mediasoup recvTransport =====
  useEffect(() => {
    const init = async () => {
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      const { rtpCapabilities } = await fetch(`${BACKEND}/mediasoup-rtpCapabilities`).then(r => r.json());
      await device.load({ routerRtpCapabilities: rtpCapabilities });

      socket.emit("create-transport", { direction: "recv" }, (transportInfo) => {
        const transport = device.createRecvTransport(transportInfo);
        recvTransportRef.current = transport;

        transport.on("connect", ({ dtlsParameters }, callback) => {
          socket.emit("connect-transport", { transportId: transport.id, dtlsParameters });
          callback();
        });
      });
    };

    init();
  }, []);

  // ===== 監聽新 producer =====
  useEffect(() => {
    const handler = ({ producerId }) => {
      console.log("🎧 new producer", producerId);

      if (!audioUnlocked) {
        console.warn("🔇 queued producer", producerId);
        pendingProducersRef.current.push(producerId);
        return;
      }

      consumeProducer(producerId);
    };

    socket.on("new-producer", handler);
    return () => socket.off("new-producer", handler);
  }, [audioUnlocked]);

  return (
    <>
      {/* 🔹 audio 永遠存在 DOM */}
      <audio ref={audioRef} autoPlay />

      {!audioUnlocked && (
        <button
          onClick={unlockAudio}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
          }}
        >
          🔊 啟用聊天室聲音
        </button>
      )}
    </>
  );
}
