import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { aiAvatars, aiProfiles } from "./aiConfig";
import MessageList from "./MessageList";
import VideoPlayer from "./VideoPlayer";
import './ChatApp.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000';
const socket = io(BACKEND);

export default function ChatApp() {
  const [room] = useState("public");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [guestToken, setGuestToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [target, setTarget] = useState("");
  const [typing, setTyping] = useState("");
  const [userList, setUserList] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [chatMode, setChatMode] = useState("public"); // public | private
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    socket.on("message", (m) => setMessages((s) => [...s, m]));
    socket.on("systemMessage", (m) =>
      setMessages((s) => [...s, { user: { name: "系統" }, message: m }])
    );
    socket.on("updateUsers", (list) => setUserList(list));
    socket.on("videoUpdate", (video) => setCurrentVideo(video));

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("updateUsers");
      socket.off("videoUpdate");
    };
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedToken = localStorage.getItem("token") || localStorage.getItem("guestToken");
    const type = localStorage.getItem("type");
    if (!storedName) return;

    setName(storedName);
    setToken(storedToken || "");
    setGuestToken(localStorage.getItem("guestToken") || "");

    socket.emit("joinRoom", {
      room,
      user: { name: storedName, type: type || "guest", token: storedToken },
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
    setGuestToken(data.guestToken);
    joinRoom(data.name, "guest", data.guestToken);
  };

  const joinRoom = (username, type = "guest", t = "") => {
    socket.emit("joinRoom", { room, user: { name: username, type, token: t } });
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

  const send = () => {
    if (!text) return;
    if (chatMode === "private" && !target) return;

    socket.emit("message", {
      room,
      message: text,
      user: { name },
      target: chatMode === "private" ? target : "",
      mode: chatMode
    });
    setText("");
  };

  const extractVideoID = (url) => {
    if (!url) return null;
    let match = url.match(/v=([a-zA-Z0-9_-]{11})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) || url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const playVideo = () => {
    if (!videoUrl.trim()) return;
    const videoId = extractVideoID(videoUrl.trim());
    if (!videoId) return alert("無法解析此 YouTube 連結");
    socket.emit("playVideo", { room, url: `https://www.youtube.com/watch?v=${videoId}`, user: name });
    setVideoUrl("");
  };

  return (
    <div className="chat-container">
      <h2>尋夢園男歡女愛聊天室</h2>

      {!joined ? (
        <button onClick={loginGuest} className="login-btn">訪客登入</button>
      ) : (
        <div className="user-header">
          <strong>Hi, {name}</strong>
          <button onClick={leaveRoom}>離開</button>
        </div>
      )}

      <div className="chat-main">
        <div className="chat-box">
          <MessageList messages={messages} name={name} typing={typing} messagesEndRef={messagesEndRef} />

          <div className="chat-input">
            <div className="chat-mode">
              <label>
                <input type="radio" value="public" checked={chatMode==="public"} onChange={() => { setChatMode("public"); setTarget(""); }} />公開
              </label>
              <label>
                <input type="radio" value="private" checked={chatMode==="private"} onChange={() => setChatMode("private")} />私聊
              </label>
            </div>

            {chatMode === "private" && (
              <select value={target} onChange={(e)=>setTarget(e.target.value)} className="chat-target-select">
                <option value="">選擇對象</option>
                {userList.filter(u => u.name !== name).map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            )}

            <input type="text" value={text} onChange={(e)=>setText(e.target.value)}
                   onKeyDown={(e)=>e.key==="Enter" && send()}
                   placeholder={chatMode==="private" ? `私聊 ${target || ""}` : "輸入公開訊息..."} />
            <button onClick={send}>發送</button>
          </div>

          <div className="video-request">
            <input type="text" placeholder="輸入 YouTube 連結" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} onKeyDown={e=>e.key==="Enter" && playVideo()} />
            <button onClick={playVideo} className="play-btn">🎵 點播</button>
          </div>
        </div>

        <div className="user-list">
          <strong>在線：{userList.length}</strong>
          {userList.map(u => (
            <div key={u.id} className={`user-item ${u.name===target?"selected":""}`}
                 onClick={() => { setChatMode("private"); setTarget(u.name); }}>
              {aiAvatars[u.name] && <img src={aiAvatars[u.name]} className="user-avatar" />}
              {u.name} (Lv.{u.level || 1})
            </div>
          ))}
        </div>
      </div>

      <VideoPlayer video={currentVideo} extractVideoID={extractVideoID} onClose={()=>setCurrentVideo(null)} />
    </div>
  );
}
