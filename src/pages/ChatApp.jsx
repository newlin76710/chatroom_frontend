import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MessageList from "./MessageList";
import VideoPlayer from "./VideoPlayer";
import SongPanel from "../components/SongPanel";

import './ChatApp.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000';
const socket = io(BACKEND);

export default function ChatApp() {
  const [room] = useState("public");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userList, setUserList] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);

  // 歌曲相關
  const [currentSong, setCurrentSong] = useState(null);
  const [songResult, setSongResult] = useState(null);
  const [displayQueue, setDisplayQueue] = useState([]);

  const messagesEndRef = useRef(null);

  // 自動滾到底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket 事件
  useEffect(() => {
    socket.on("message", (m) => setMessages((s) => [...s, m]));
    socket.on("systemMessage", (m) =>
      setMessages((s) => [...s, { user: { name: "系統" }, message: m }])
    );
    socket.on("updateUsers", (list) => setUserList(list));
    socket.on("videoUpdate", (video) => setCurrentVideo(video));

    // 歌曲事件
    socket.on("playSong", (song) => setCurrentSong(song));
    socket.on("songResult", (result) => {
      setSongResult(result);
      setCurrentSong(null);
    });
    socket.on("displayQueueUpdate", (queue) => setDisplayQueue(queue || []));

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("updateUsers");
      socket.off("videoUpdate");
      socket.off("playSong");
      socket.off("songResult");
      socket.off("displayQueueUpdate");
    };
  }, []);

  // 自動登入（訪客）
  useEffect(() => {
    const storedName = localStorage.getItem("name");
    if (!storedName) return;

    setName(storedName);
    const type = localStorage.getItem("type") || "guest";
    const token = localStorage.getItem("token") || localStorage.getItem("guestToken") || "";

    socket.emit("joinRoom", {
      room,
      user: { name: storedName, type, token },
    });
    setJoined(true);
  }, []);

  const loginGuest = async () => {
    const res = await fetch(`${BACKEND}/auth/guest`, { method: "POST" });
    const data = await res.json();
    localStorage.setItem("guestToken", data.guestToken);
    localStorage.setItem("name", data.name);
    localStorage.setItem("type", "guest");
    setName(data.name);

    socket.emit("joinRoom", {
      room,
      user: { name: data.name, type: "guest", token: data.guestToken },
    });
    setJoined(true);
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);
    localStorage.removeItem("guestToken");
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("type");
    window.location.href = "/login";
  };

  const sendMessage = (message, target = "", mode = "public") => {
    if (!message) return;
    socket.emit("message", { room, message, user: { name }, target, mode });
  };

  const uploadSong = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const res = await fetch(`${BACKEND}/song/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: base64, singer: name })
    });
    const data = await res.json();

    socket.emit("startSong", {
      room,
      singer: name,
      songUrl: `${BACKEND}${data.url}`
    });
  };

  return (
    <div className="chat-container">
      <h2>尋夢園男歡女愛聊天室</h2>

      {!joined ? (
        <button onClick={loginGuest}>訪客登入</button>
      ) : (
        <div className="user-header">
          <strong>Hi, {name}</strong>
          <button onClick={leaveRoom}>離開</button>
        </div>
      )}

      <div className="chat-main">
        <div className="chat-box">
          <MessageList messages={messages} name={name} messagesEndRef={messagesEndRef} />
        </div>

        <div className="user-list">
          <strong>在線：{userList.length}</strong>
          {userList.map(u => (
            <div key={u.id}>{u.name} (Lv.{u.level || 1})</div>
          ))}
        </div>
      </div>

      {/* 🎤 歌唱區 */}
      <SongPanel
        socket={socket}
        room={room}
        name={name}
        uploadSong={uploadSong}
        currentSong={currentSong}
        songResult={songResult}
        displayQueue={displayQueue}
      />

      <VideoPlayer video={currentVideo} onClose={() => setCurrentVideo(null)} />
    </div>
  );
}
