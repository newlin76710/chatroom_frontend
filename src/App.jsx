import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

// 性別、婚姻狀態、人格編號
const genders = ["女性", "男性"];
const maritalStatuses = ["未婚", "已婚"];
const personalityIndexes = [1, 2, 3, 4];

export default function App() {
  const [room, setRoom] = useState("public");
  const [name, setName] = useState("訪客" + Math.floor(Math.random() * 999));
  const [gender, setGender] = useState("女性");
  const [maritalStatus, setMaritalStatus] = useState("已婚");
  const [personalityIndex, setPersonalityIndex] = useState(1);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on("message", (m) => setMessages((s) => [...s, m]));
    socket.on("systemMessage", (m) => setMessages((s) => [...s, { user: { name: '系統' }, message: m }]));

    return () => {
      socket.off("message");
      socket.off("systemMessage");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const role = `${maritalStatus}${gender}-${personalityIndex}`; // 組合人格名稱

  // 加入或離開房間
  const toggleRoom = () => {
    if (!joined) {
      socket.emit("joinRoom", { room, user: { name, role } });
      setJoined(true);
      setMessages((s) => [...s, { user: { name: '系統' }, message: `${name} (${role}) 加入房間` }]);
    } else {
      socket.emit("leaveRoom");
      setJoined(false);
      setMessages((s) => [...s, { user: { name: '系統' }, message: `${name} (${role}) 離開房間` }]);
    }
  };

  // 發送訊息
  const send = () => {
    if (!text || !joined) return;
    socket.emit("message", { room, message: text, user: { name, role } });
    setText("");
  };

  return (
    <div style={{ maxWidth: "900px", margin: "30px auto", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>尋夢園聊天室</h2>

      {/* 使用者資訊區 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label>暱稱：</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "5px", width: "150px" }} />
        </div>

        <div>
          <label>性別：</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ padding: "5px", width: "100px" }}>
            {genders.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <label>婚姻狀態：</label>
          <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} style={{ padding: "5px", width: "100px" }}>
            {maritalStatuses.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label>人格編號：</label>
          <select value={personalityIndex} onChange={(e) => setPersonalityIndex(parseInt(e.target.value))} style={{ padding: "5px", width: "100px" }}>
            {personalityIndexes.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div>
          <label>房間：</label>
          <select value={room} onChange={(e) => setRoom(e.target.value)} style={{ padding: "5px" }}>
            <option value="public">大廳</option>
          </select>
        </div>

        <button onClick={toggleRoom} style={{ padding: "5px 15px", cursor: "pointer" }}>
          {joined ? "離開" : "加入"}
        </button>
      </div>

      {/* 聊天訊息區 */}
      <div style={{
        border: "1px solid #ddd",
        height: "400px",
        overflowY: "auto",
        padding: "10px",
        borderRadius: "5px",
        background: "#fafafa",
        marginBottom: "15px"
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "8px" }}>
            <strong style={{ color: m.user?.name === "系統" ? "#f00" : "#333" }}>
              {m.user?.name} {m.user?.role ? `(${m.user.role})` : ""}：
            </strong>
            <span>{m.message}</span>
          </div>
        ))}
        {!messages.length && <div style={{ color: '#888', textAlign: "center" }}>還沒有人發話，打個招呼吧！</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* 發送訊息區 */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
          placeholder={joined ? "輸入訊息後按 Enter 發送" : "請先加入房間才能發言"}
          disabled={!joined}
        />
        <button onClick={send} style={{ padding: "8px 15px", cursor: "pointer" }} disabled={!joined}>發送</button>
      </div>
    </div>
  );
}
