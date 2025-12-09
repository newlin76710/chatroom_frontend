import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { aiAvatars, aiProfiles } from "./aiConfig";
import YouTube from "react-youtube";
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
  const [videoQueue, setVideoQueue] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");

  const messagesEndRef = useRef(null);

  /* 自動捲到底部 */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Socket 事件 */
  useEffect(() => {
    socket.on("message", (m) => {
      setMessages((s) => [...s, m]);
      if (m.user && aiAvatars[m.user.name] && m.target) setTyping("");
    });

    socket.on("systemMessage", (m) =>
      setMessages((s) => [...s, { user: { name: "系統" }, message: m }])
    );

    socket.on("updateUsers", (list) => setUserList(list));
    socket.on("videoUpdate", (video) => setCurrentVideo(video));
    socket.on("videoQueueUpdate", (queue) => setVideoQueue(queue));

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("updateUsers");
      socket.off("videoUpdate");
      socket.off("videoQueueUpdate");
    };
  }, []);

  /* 自動登入 */
  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedToken =
      localStorage.getItem("token") || localStorage.getItem("guestToken");
    const type = localStorage.getItem("type");

    if (!storedName) return;

    setName(storedName);
    setToken(localStorage.getItem("token") || "");
    setGuestToken(localStorage.getItem("guestToken") || "");

    socket.emit("joinRoom", {
      room,
      user: { name: storedName, type: type || "guest", token: storedToken },
    });
    setJoined(true);
  }, []);

  /* 訪客登入 */
  const loginGuest = async () => {
    try {
      const res = await fetch(`${BACKEND}/auth/guest`, { method: "POST" });
      const data = await res.json();

      if (!data.guestToken) throw new Error("訪客登入失敗");

      localStorage.setItem("guestToken", data.guestToken);
      localStorage.setItem("name", data.name);
      localStorage.setItem("type", "guest");

      setName(data.name);
      setGuestToken(data.guestToken);

      joinRoom(data.name, "guest", data.guestToken);
    } catch (err) {
      alert("訪客登入失敗: " + err.message);
    }
  };

  /* 正式帳號登入 */
  const loginAccount = (username, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("name", username);
    localStorage.setItem("type", "account");

    setName(username);
    setToken(token);

    joinRoom(username, "account", token);
  };

  /* 加入房間 */
  const joinRoom = (username, type = "guest", t = "") => {
    socket.emit("joinRoom", { room, user: { name: username, type, token: t } });
    setJoined(true);
  };

  /* 離開房間 */
  const leaveRoom = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);

    localStorage.removeItem("guestToken");
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("type");

    window.location.href = "/login";
  };

  /* 發送訊息 */
  const send = () => {
    if (!text || !joined) return;

    socket.emit("message", { room, message: text, user: { name }, target });
    setText("");
  };

  /* 發送 YouTube 點播 */
  const playVideo = () => {
    if (!videoUrl.trim()) return;

    socket.emit("playVideo", {
      room,
      url: videoUrl.trim(),
      user: name,
    });

    setVideoUrl("");
  };

  /* 取得 YouTube videoId */
  const extractVideoID = (url) => {
    const reg = /v=([a-zA-Z0-9_-]{11})/;
    const match = url.match(reg);
    return match ? match[1] : null;
  };

  /* 播放器準備好後解除靜音（手機需要先 muted autoplay 才能啟動） */
  const onPlayerReady = (event) => {
    event.target.unMute();
    event.target.setVolume(100);
  };

  return (
    <div className="chat-container">
      <h2>尋夢園聊天室</h2>

      {!joined ? (
        <button onClick={loginGuest} className="login-btn">訪客登入</button>
      ) : (
        <div className="user-header">
          <strong>Hi, {name}</strong>
          <button onClick={leaveRoom}>離開</button>
        </div>
      )}

      <div className="chat-main">
        {/* 聊天區 */}
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((m, i) => {
              const isSelf = m.user?.name === name;
              const isSystem = m.user?.name === "系統";
              const isAI = aiAvatars[m.user?.name];
              const profile = aiProfiles[m.user?.name];

              let msgClass = "chat-message";
              if (isSystem) msgClass += " system";
              else if (isSelf) msgClass += " self";
              else if (isAI) msgClass += " ai";
              else msgClass += " other";

              const color = isSystem
                ? "#ff9900"
                : isSelf
                ? "#fff"
                : profile?.color || "#eee";

              return (
                <div
                  key={i}
                  className="message-row"
                  style={{ justifyContent: isSelf ? "flex-end" : "flex-start" }}
                >
                  {!isSelf && !isSystem && (
                    <img
                      src={aiAvatars[m.user?.name] || "/avatars/default.png"}
                      className="message-avatar"
                      style={{ width: 24, height: 24 }}
                    />
                  )}

                  <div className={msgClass} style={{ color }}>
                    <strong>
                      {m.user?.name}
                      {m.target ? ` → ${m.target}` : ""}：
                    </strong>{" "}
                    {m.message}
                  </div>
                </div>
              );
            })}

            {typing && <div className="typing">{typing}</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">全部</option>
              {userList.map((u) => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="輸入訊息..."
            />

            <button onClick={send}>發送</button>
          </div>

          <div className="video-request">
            <input
              type="text"
              placeholder="輸入 YouTube 連結"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && playVideo()}
            />
            <button onClick={playVideo} className="play-btn">🎵 點播</button>
          </div>
        </div>

        <div className="user-list">
          <strong>在線：{userList.length}</strong>
          {userList.map((u) => (
            <div
              key={u.id}
              className={`user-item ${target === u.name ? "selected" : ""}`}
              onClick={() => setTarget(u.name)}
            >
              {aiAvatars[u.name] && (
                <img src={aiAvatars[u.name]} className="user-avatar" />
              )}
              {u.name} (Lv.{u.level || 1})
            </div>
          ))}
        </div>
      </div>

      {currentVideo && extractVideoID(currentVideo.url) && (
        <div className="video-player-float">
          <YouTube
            videoId={extractVideoID(currentVideo.url)}
            onReady={onPlayerReady}
            opts={{
              width: "240",
              height: "135",
              playerVars: { autoplay: 1, playsinline: 1, muted: 1 },
            }}
          />
          <div className="video-info">
            🎧 正在播放（由 {currentVideo.user} 點播）
            <button className="close-btn" onClick={() => setCurrentVideo(null)}>✖</button>
          </div>
        </div>
      )}
    </div>
  );
}
