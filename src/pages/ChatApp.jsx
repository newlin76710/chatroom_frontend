// ChatApp.jsx
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { aiAvatars, aiProfiles } from "./aiConfig";
import './ChatApp.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const socket = io(BACKEND);

export default function ChatApp() {
  const [room, setRoom] = useState("public");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");      // 帳號 token
  const [guestToken, setGuestToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [target, setTarget] = useState("");
  const [typing, setTyping] = useState("");
  const [userList, setUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(true);

  // 點歌相關
  const [songText, setSongText] = useState("");
  const [songList, setSongList] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);

  const messagesEndRef = useRef(null);

  // 自動滾動到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket 事件
  useEffect(() => {
    socket.on("message", (m) => {
      setMessages(s => [...s, m]);
      if (m.user && aiAvatars[m.user.name] && m.target) setTyping("");
    });
    socket.on("systemMessage", (m) => setMessages(s => [...s, { user: { name: "系統" }, message: m }]));
    socket.on("updateUsers", (list) => setUserList(list));

    // 點歌事件
    socket.on("songListUpdate", (list) => setSongList(list));
    socket.on("songPlay", (song) => setCurrentSong(song));

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("updateUsers");
      socket.off("songListUpdate");
      socket.off("songPlay");
    };
  }, []);

  // 頁面進入時自動登入（訪客或帳號）
  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedToken = localStorage.getItem("token") || localStorage.getItem("guestToken");
    const type = localStorage.getItem("type");

    if (!storedName) return; // 沒登入就不 join

    setName(storedName);
    setToken(localStorage.getItem("token") || "");
    setGuestToken(localStorage.getItem("guestToken") || "");

    socket.emit("joinRoom", {
      room,
      user: { name: storedName, type: type || "guest", token: storedToken }
    });
    setJoined(true);
  }, []);

  // 訪客登入
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
      alert("訪客登入失敗：" + err.message);
      console.error(err);
    }
  };

  // 帳號登入
  const loginAccount = async (username, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("name", username);
    localStorage.setItem("type", "account");

    setName(username);
    setToken(token);
    joinRoom(username, "account", token);
  };

  // 加入聊天室
  const joinRoom = (username, type = "guest", t = "") => {
    socket.emit("joinRoom", { room, user: { name: username, type, token: t } });
    setJoined(true);
  };

  // 離開聊天室
  const leaveRoom = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);
    setMessages(s => [...s, { user: { name: "系統" }, message: `${name} 離開房間` }]);

    localStorage.removeItem("guestToken");
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("type");

    window.location.href = "/login";
  };

  // 發送訊息
  const send = () => {
    if (!text || !joined) return;
    socket.emit("message", { room, message: text, user: { name }, target });
    setText("");
  };

  // 點歌
  const addSong = () => {
    if (!songText.trim() || !joined) return;
    socket.emit("songRequest", { user: name, text: songText });
    setSongText("");
  };

  return (
    <div className="chat-container">
      <h2>尋夢園聊天室</h2>

      {/* 登入 / 登出 */}
      {!joined ? (
        <div style={{ marginBottom: "1rem" }}>
          <button onClick={loginGuest}>訪客登入</button>
        </div>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          <strong>Hi, {name}</strong> <button onClick={leaveRoom}>離開聊天室</button>
        </div>
      )}

      <div className="chat-main">
        {/* 聊天區 */}
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((m, i) => {
              const isSelf = m.user?.name === name;
              const isAI = aiAvatars[m.user?.name];
              const profile = aiProfiles[m.user?.name] || { color: isAI ? "#fff" : "#000" };
              return (
                <div key={i} className="message-row" style={{ justifyContent: isSelf ? "flex-end" : "flex-start" }}>
                  {!isSelf && isAI && <img src={aiAvatars[m.user?.name]} alt={m.user.name} className="message-avatar" />}
                  <div
                    className={`chat-message${isSelf ? " self" : isAI ? " ai" : ""}${m.user?.name === "系統" ? " system" : ""}`}
                    style={{ color: m.user?.name === "系統" ? "#ff5555" : profile.color }}
                  >
                    <strong>{m.user?.name}{m.target ? ` 對 ${m.target} 說` : ""}：</strong> {m.message}
                  </div>
                </div>
              );
            })}
            {typing && <div className="typing">{typing}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* 輸入區 */}
          <div className="chat-input">
            <select value={target} onChange={e => setTarget(e.target.value)}>
              <option value="">發送給全部</option>
              {userList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              disabled={!joined}
              placeholder={joined ? "輸入訊息後按 Enter 發送" : "請先登入"}
            />
            <button onClick={send} disabled={!joined}>發送</button>
          </div>

          {/* 點歌區 */}
          <div className="song-box">
            <h3>點歌 / 播放 YouTube</h3>
            <input
              type="text"
              value={songText}
              onChange={e => setSongText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSong()}
              placeholder="輸入 YouTube 連結或歌曲名稱"
              disabled={!joined}
            />
            <button onClick={addSong} disabled={!joined}>加入播放清單</button>

            {currentSong && (
              <div className="current-song">
                <strong>正在播放:</strong> {currentSong.text} (由 {currentSong.user} 點)
              </div>
            )}

            <div className="song-list">
              <strong>播放清單:</strong>
              <ul>
                {songList.map((s, i) => (
                  <li key={i}>{s.text} (由 {s.user} 點)</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 使用者列表 */}
        <div className="user-list">
          <div className="user-list-header">
            <strong>在線人數: {userList.length}</strong>
            <button onClick={() => setShowUserList(!showUserList)}>
              {showUserList ? "▼" : "▲"}
            </button>
          </div>
          {showUserList && (
            <div className="user-list-content">
              {userList.map(u => {
                const isSelected = u.name === target;
                const avatar = aiAvatars[u.name];
                // 取得等級：AI 從 aiProfiles，訪客或帳號預設 1
                const level = aiProfiles[u.name]?.level || u.level || 1;

                return (
                  <div
                    key={u.id}
                    className={`user-item${isSelected ? " selected" : ""}`}
                    onClick={() => setTarget(u.name)}
                  >
                    {avatar && <img src={avatar} alt={u.name} className="user-avatar" />}
                    <span>{u.name} (Lv.{level})</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
