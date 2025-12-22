// Listener.jsx（增加完整 log）
import { useEffect, useRef, useState } from "react";
import * as mediasoupClient from "mediasoup-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

export default function Listener({ socket, room }) {
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);
  const audioRef = useRef(null);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const pendingProducersRef = useRef([]);
  const consumedRef = useRef(new Set());

  const log = (...args) => console.log("🔹 Listener log:", ...args);

  const consumeProducer = async (producerId) => {
    if (consumedRef.current.has(producerId)) {
      log("already consumed", producerId);
      return;
    }
    consumedRef.current.add(producerId);
    log("consume called for", producerId);

    if (!deviceRef.current || !recvTransportRef.current) {
      log("device or transport not ready, queueing producer", producerId);
      pendingProducersRef.current.push(producerId);
      return;
    }

    const { id, kind, rtpParameters } = await new Promise((resolve) => {
      socket.emit(
        "consume",
        { producerId, rtpCapabilities: deviceRef.current.rtpCapabilities },
        resolve
      );
    });
    log("consumer info received", { id, kind, producerId });

    const consumer = await recvTransportRef.current.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      paused: false,
    });
    log("consumer created", consumer);

    if (!audioRef.current.srcObject) {
      audioRef.current.srcObject = new MediaStream();
      log("new MediaStream created for audio");
    }

    audioRef.current.srcObject.addTrack(consumer.track);
    log("track added to MediaStream", consumer.track);

    audioRef.current.muted = false;
    audioRef.current.volume = 1.0;

    if (audioUnlocked) {
      try {
        await audioRef.current.play();
        log("playing producer", producerId);
      } catch (e) {
        console.error("❌ play failed", e);
      }
    } else {
      log("audio not unlocked yet, queued producer", producerId);
      pendingProducersRef.current.push(producerId);
    }
  };

  const unlockAudio = async () => {
    if (!audioRef.current) return;
    try {
      setAudioUnlocked(true);
      audioRef.current.muted = false;
      audioRef.current.volume = 1.0;

      if (!audioRef.current.srcObject) {
        audioRef.current.srcObject = new MediaStream();
      }
      await audioRef.current.play();
      log("Audio unlocked!");

      log("consuming pending producers", pendingProducersRef.current);
      for (const pid of pendingProducersRef.current) {
        await consumeProducer(pid);
      }
      pendingProducersRef.current = [];
    } catch (e) {
      console.error("❌ unlock failed", e);
    }
  };

  useEffect(() => {
    log("Initializing mediasoup listener...");
    const init = async () => {
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      const { rtpCapabilities } = await fetch(
        `${BACKEND}/mediasoup-rtpCapabilities`
      ).then((r) => r.json());
      log("rtpCapabilities fetched", rtpCapabilities);

      await device.load({ routerRtpCapabilities: rtpCapabilities });
      log("device loaded");

      socket.emit("create-transport", { direction: "recv" }, (transportInfo) => {
        log("transportInfo received", transportInfo);
        const transport = device.createRecvTransport(transportInfo);
        recvTransportRef.current = transport;

        transport.on("connect", ({ dtlsParameters }, callback) => {
          socket.emit("connect-transport", {
            transportId: transport.id,
            dtlsParameters,
          });
          log("transport connect event fired", transport.id);
          callback();
        });
      });
    };
    init();
  }, []);

  useEffect(() => {
    const handler = ({ producerId }) => {
      log("new-producer event received", producerId);
      consumeProducer(producerId);
    };
    socket.on("new-producer", handler);
    return () => socket.off("new-producer", handler);
  }, [audioUnlocked]);

  useEffect(() => {
    const listener = () => {
      if (!audioUnlocked) {
        log("click detected, unlocking audio...");
        unlockAudio();
      }
    };
    window.addEventListener("click", listener);
    return () => window.removeEventListener("click", listener);
  }, [audioUnlocked]);

  return <audio ref={audioRef} autoPlay />;
}
