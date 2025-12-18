import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MessageList from "./MessageList";
import VideoPlayer from "./VideoPlayer";
import SongPanel from "./SongPanel";
import { aiAvatars } from "./aiConfig";
import "./ChatApp.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const socket = io(BACKEND);

const safeText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (v.name) return String(v.name);
    if (v.user) return String(v.user);
    if (v.message) return String(v.message);
    return JSON.stringify(v);
  }
  return String(v);
};

export default function ChatApp() {
  const [room] = useState("public");
  const [name, setName] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [target, setTarget] = useState("");
  const [typing, setTyping] = useState("");
  const [userList, setUserList] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [chatMode, setChatMode] = useState("public");
  const [userListCollapsed, setUserListCollapsed] = useState(false);
  const [showSongPanel, setShowSongPanel] = useState(false);
  const messagesEndRef = useRef(null);

  // 自動捲動
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket 事件
  useEffect(() => {
    socket.on("message", (m) => {
      if (!m) return;
      setMessages((s) => [
        ...s,
        {
          ...m,
          message: safeText(m.message),
          user: { name: safeText(m.user?.name) },
          target: safeText(m.target),
          mode: safeText(m.mode),
        },
      ]);
    });

    socket.on("systemMessage", (m) => {
      setMessages((s) => [
        ...s,
        { user: { name: "系統" }, message: safeText(m) },
      ]);
    });

    socket.on("updateUsers", (list = []) => {
      if (!Array.isArray(list)) return;
      setUserList(
        list.map((u, i) => ({
          id: u?.id || i,
          name: safeText(u?.name || u?.user),
          level: u?.level || 1,
        }))
      );
    });

    socket.on("videoUpdate", (v) => setCurrentVideo(v || null));

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("updateUsers");
      socket.off("videoUpdate");
    };
  }, []);

  // 自動登入
  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const token = localStorage.getItem("token") || localStorage.getItem("guestToken");
    const type = localStorage.getItem("type") || "guest";
    if (!storedName) return;

    const safeName = safeText(storedName);
    setName(safeName);
    socket.emit("joinRoom", { room, user: { name: safeName, type, token } });
    setJoined(true);
  }, [room]);

  // 訪客登入
  const loginGuest = async () => {
    const res = await fetch(`${BACKEND}/auth/guest`, { method: "POST" });
    const data = await res.json();
    const safeName = safeText(data.name);

    localStorage.setItem("guestToken", data.guestToken);
    localStorage.setItem("name", safeName);
    localStorage.setItem("type", "guest");

    setName(safeName);
    socket.emit("joinRoom", {
      room,
      user: { name: safeName, type: "guest", token: data.guestToken },
    });
    setJoined(true);
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    localStorage.clear();
    window.location.reload();
  };

  // 發訊息
  const send = () => {
    if (!text.trim()) return;
    if (chatMode !== "public" && !target) return;

    socket.emit("message", {
      room,
      message: text,
      user: { name },
      target: target || "",
      mode: chatMode,
    });
    setText("");
  };

  // YouTube
  const extractVideoID = (url) => {
    if (!url) return null;
    const match =
      url.match(/v=([\w-]{11})/) ||
      url.match(/youtu\.be\/([\w-]{11})/) ||
      url.match(/shorts\/([\w-]{11})/);
    return match ? match[1] : null;
  };

  const playVideo = () => {
    const id = extractVideoID(videoUrl);
    if (!id) return alert("無法解析 YouTube 連結");
    socket.emit("playVideo", { room, url: `https://www.youtube.com/watch?v=${id}`, user: { name } });
    setVideoUrl("");
  };

  // 上傳錄音
  const uploadSong = async (blob) => {
    try {
      const formData = new FormData();
      formData.append("file", blob, `${name}_song.webm`);
      await fetch(`${BACKEND}/uploadSong`, { method: "POST", body: formData });
    } catch (err) {
      console.error("上傳錄音失敗：", err);
    }
  };

  return (
    <div className="chat-layout">
      {/* 左側：聊天室 */}
      <div className="chat-left">
        <div className="chat-title">尋夢園男歡女愛聊天室</div>

        {/* 訊息列表 */}
        <div className="message-list">
          <MessageList
            messages={messages}
            name={name}
            typing={typing}
            messagesEndRef={messagesEndRef}
          />
        </div>

        {/* 聊天輸入 */}
        <div className="chat-input">
          {/* 公聊 / 私聊選項 + 輸入框 + 發送按鈕 */}
        </div>

        {/* YouTube + 唱歌一行排列 */}
        <div className="video-row">

          {/* 唱歌區 */}
          {showSongPanel && (
            <div className={`song-panel-wrapper ${songCollapsed ? "collapsed" : ""}`}>
              <button
                className="song-collapse-btn"
                onClick={() => setSongCollapsed(!songCollapsed)}
              >
                {songCollapsed ? "▶" : "▼"}
              </button>

              {!songCollapsed && (
                <SongPanel
                  socket={socket}
                  room={room}
                  name={name}
                  uploadSong={uploadSong}
                  userList={userList}
                  chatMode={chatMode}
                  setChatMode={setChatMode}
                  target={target}
                  setTarget={setTarget}
                />
              )}
            </div>
          )}

          {/* YouTube 播放區 */}
          <div className="video-player-wrapper">
            <VideoPlayer
              video={currentVideo}
              extractVideoID={extractVideoID}
              onClose={() => setCurrentVideo(null)}
            />
            <div className="video-request">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="YouTube 連結"
              />
              <button onClick={playVideo}>🎵 點播</button>
            </div>
          </div>
        </div>
      </div>

      {/* 右側：使用者列表 */}
      <div className="chat-right">
        <div className={`user-list ${userListCollapsed ? "collapsed" : ""}`}>
          <div
            className="user-list-header"
            onClick={() => setUserListCollapsed(!userListCollapsed)}
          >
            在線：{userList.length}
          </div>
          {!userListCollapsed &&
            userList.map((u) => (
              <div
                key={u.id}
                className={`user-item ${u.name === target ? "selected" : ""}`}
                onClick={() => {
                  setChatMode("private");
                  setTarget(u.name);
                }}
              >
                {aiAvatars[u.name] && (
                  <img src={aiAvatars[u.name]} alt={u.name} className="user-avatar" />
                )}
                {u.name} (Lv.{u.level})
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
