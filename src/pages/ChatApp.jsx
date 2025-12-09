// ChatApp.jsx
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { aiAvatars, aiProfiles } from "./aiConfig";
import './ChatApp.css';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

export default function ChatApp() {
  const [room, setRoom] = useState("public");
  const [name, setName] = useState("");
  const [guestToken, setGuestToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [target, setTarget] = useState("");
  const [typing, setTyping] = useState("");
  const [userList, setUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(true);

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

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("updateUsers");
    };
  }, []);

  // 訪客登入
  const loginGuest = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/auth/guest`, {
        method: "POST"
      });
      const data = await res.json();
      if (!data.guestToken) throw new Error("訪客登入失敗");
      setGuestToken(data.guestToken);
      setName(data.name);
      joinRoom(data.name);
    } catch (err) {
      alert("訪客登入失敗");
      console.error(err);
    }
  };

  // 加入聊天室
  const joinRoom = (username) => {
    socket.emit("joinRoom", { room, user: { name: username } });
    setJoined(true);
  };

  // 離開聊天室
  const leaveRoom = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);
    setMessages(s => [...s, { user: { name: "系統" }, message: `${name} 離開房間` }]);
    // 清除本地登入資料
    localStorage.removeItem("guestToken");
    localStorage.removeItem("name");
    localStorage.removeItem("authToken");

    // 導回登入頁
    navigate("/login");
  };

  // 發送訊息
  const send = () => {
    if (!text || !joined) return;
    socket.emit("message", { room, message: text, user: { name }, target });
    setText("");
  };

  return (
    <div className="chat-container">
      <h2>尋夢園聊天室</h2>

      {/* 訪客登入 / 登出 */}
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
                return (
                  <div key={u.id} className={`user-item${isSelected ? " selected" : ""}`} onClick={() => setTarget(u.name)}>
                    {avatar && <img src={avatar} alt={u.name} className="user-avatar" />}
                    {u.name}
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
