import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { aiAvatars, aiProfiles } from "./aiConfig";
import './ChatApp.css';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

export default function ChatApp() {
  const [room, setRoom] = useState("public");
  const [name, setName] = useState("訪客" + Math.floor(Math.random() * 999));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [target, setTarget] = useState("");
  const [autoLeaveTime, setAutoLeaveTime] = useState(0);
  const [typing, setTyping] = useState("");
  const [userList, setUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(true);

  const messagesEndRef = useRef(null);
  const autoLeaveRef = useRef(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const join = () => {
    socket.emit("joinRoom", { room, user: { name } });
    setJoined(true);
    if (autoLeaveTime > 0) autoLeaveRef.current = setTimeout(() => leave(), autoLeaveTime * 1000);
  };

  const leave = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);
    setMessages(s => [...s, { user: { name: "系統" }, message: `${name} 離開房間` }]);
    if (autoLeaveRef.current) clearTimeout(autoLeaveRef.current);
  };

  const send = () => {
    if (!text || !joined) return;
    socket.emit("message", { room, message: text, user: { name }, target });
    setText("");
  };

  return (
    <div className="chat-container">
      <h2>尋夢園聊天室</h2>

      <div className="chat-settings">
        <div className="form-group">
          <label>暱稱</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>房間</label>
          <select value={room} onChange={e => setRoom(e.target.value)}>
            <option value="public">大廳</option>
          </select>
        </div>
        <div className="form-group">
          <label>自動離開秒數</label>
          <input type="number" min="0" value={autoLeaveTime} onChange={e => setAutoLeaveTime(Number(e.target.value))} />
        </div>
        <div className="form-group">
          <button onClick={joined ? leave : join}>{joined ? "離開" : "加入"}</button>
        </div>
      </div>

      <div className="chat-main">
        {/* 聊天區 */}
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((m, i) => {
              const isSelf = m.user?.name === name;
              const isAI = aiAvatars[m.user?.name];
              const profile = aiProfiles[m.user?.name] || { color: isAI ? "#fff" : "#fff" };
              let cls = "chat-message";
              if (isSelf) cls += " self";
              else if (isAI) cls += " ai";
              else if (m.user?.name === "系統") cls += " system";
              return (
                <div key={i} className="message-row" style={{ justifyContent: isSelf ? "flex-end" : "flex-start" }}>
                  {!isSelf && isAI && <img src={aiAvatars[m.user?.name]} alt={m.user.name} className="message-avatar" />}
                  <div className={cls} style={{ color: m.user?.name === "系統" ? "#ff5555" : profile.color }}>
                    <strong>{m.user?.name}{m.target ? ` 對 ${m.target} 說` : ""}：</strong> {m.message}
                  </div>
                </div>
              );
            })}
            {typing && <div className="typing">{typing}</div>}
            <div ref={messagesEndRef} />
          </div>

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
              placeholder={joined ? "輸入訊息後按 Enter 發送" : "請先加入房間"}
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
