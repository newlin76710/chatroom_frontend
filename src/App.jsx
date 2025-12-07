import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

const aiPersonalities = [
  "林怡君", "張雅婷", "陳思妤", "黃彥廷",
  "王子涵", "劉家瑋", "李佩珊", "蔡承翰",
  "許婉婷", "周俊宏", "何詩涵", "鄭宇翔",
  "郭心怡", "江柏翰", "曾雅雯", "施俊傑"
];

export default function App() {
  const [room, setRoom] = useState("public");
  const [name, setName] = useState("訪客" + Math.floor(Math.random() * 999));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [targetAI, setTargetAI] = useState("");
  const [autoLeaveTime, setAutoLeaveTime] = useState(0); // 秒，0 表示不自動離開

  const messagesEndRef = useRef(null);
  const autoLeaveTimeoutRef = useRef(null);

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

  const join = () => {
    socket.emit("joinRoom", { room, user: { name } });
    setJoined(true);
    setMessages((s) => [...s, { user: { name: '系統' }, message: `${name} 加入房間` }]);

    // 如果設定自動離開
    if (autoLeaveTime > 0) {
      autoLeaveTimeoutRef.current = setTimeout(() => {
        leave();
      }, autoLeaveTime * 1000);
    }
  };

  const leave = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);
    setMessages((s) => [...s, { user: { name: '系統' }, message: `${name} 離開房間` }]);
    
    // 清掉自動離開計時
    if (autoLeaveTimeoutRef.current) {
      clearTimeout(autoLeaveTimeoutRef.current);
      autoLeaveTimeoutRef.current = null;
    }
  };

  const send = () => {
    if (!text || !joined) return;
    socket.emit("message", {
      room,
      message: text,
      user: { name },
      targetAI
    });
    setText("");
  };

  return (
    <div style={{ maxWidth: "800px", margin: "30px auto", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>尋夢園聊天室</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label>暱稱：</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "5px", width: "150px" }} />
        </div>

        <div>
          <label>房間：</label>
          <select value={room} onChange={(e) => setRoom(e.target.value)} style={{ padding: "5px" }}>
            <option value="public">大廳</option>
          </select>
        </div>

        <button
          onClick={joined ? leave : join}
          style={{ padding: "5px 15px", cursor: "pointer" }}
        >
          {joined ? "離開" : "加入"}
        </button>

        <div>
          <label>指定 聊天對象：</label>
          <select value={targetAI} onChange={(e) => setTargetAI(e.target.value)} style={{ padding: "5px", width: "150px" }}>
            <option value="">全部</option>
            {aiPersonalities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label>自動離開秒數：</label>
          <input
            type="number"
            min="0"
            value={autoLeaveTime}
            onChange={(e) => setAutoLeaveTime(Number(e.target.value))}
            style={{ width: "80px", padding: "5px" }}
          />
        </div>
      </div>

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
            {m.targetAI && <em style={{ color: "#888", marginLeft: "5px" }}>→ {m.targetAI}</em>}
          </div>
        ))}
        {!messages.length && <div style={{ color: '#888', textAlign: "center" }}>還沒有人發話，打個招呼吧！</div>}
        <div ref={messagesEndRef} />
      </div>

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
