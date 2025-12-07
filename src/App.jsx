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
  const [autoLeaveTime, setAutoLeaveTime] = useState(0);

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
    if (autoLeaveTime > 0) autoLeaveTimeoutRef.current = setTimeout(() => leave(), autoLeaveTime * 1000);
  };

  const leave = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);
    setMessages((s) => [...s, { user: { name: '系統' }, message: `${name} 離開房間` }]);
    if (autoLeaveTimeoutRef.current) {
      clearTimeout(autoLeaveTimeoutRef.current);
      autoLeaveTimeoutRef.current = null;
    }
  };

  const send = () => {
    if (!text || !joined) return;
    const to = targetAI || "";
    socket.emit("message", { room, message: text, user: { name }, targetAI, to });
    setText("");
  };

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", fontFamily: "Arial, sans-serif", padding: "0 10px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "15px" }}>尋夢園聊天室</h2>

      {/* 控制面板 */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        marginBottom: "10px",
        justifyContent: "space-between"
      }}>
        <div style={{ flex: "1 1 150px" }}>
          <label>暱稱：</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "5px" }} />
        </div>

        <div style={{ flex: "1 1 100px" }}>
          <label>房間：</label>
          <select value={room} onChange={(e) => setRoom(e.target.value)} style={{ width: "100%", padding: "5px" }}>
            <option value="public">大廳</option>
          </select>
        </div>

        <div style={{ flex: "1 1 100px", display: "flex", alignItems: "flex-end" }}>
          <button onClick={joined ? leave : join} style={{ width: "100%", padding: "6px", cursor: "pointer" }}>
            {joined ? "離開" : "加入"}
          </button>
        </div>

        <div style={{ flex: "1 1 150px" }}>
          <label>指定聊天對象：</label>
          <select value={targetAI} onChange={(e) => setTargetAI(e.target.value)} style={{ width: "100%", padding: "5px" }}>
            <option value="">全部</option>
            {aiPersonalities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ flex: "1 1 100px" }}>
          <label>自動離開秒數：</label>
          <input
            type="number"
            min="0"
            value={autoLeaveTime}
            onChange={(e) => setAutoLeaveTime(Number(e.target.value))}
            style={{ width: "100%", padding: "5px" }}
          />
        </div>
      </div>

      {/* 聊天訊息 */}
      <div style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        background: "#fafafa",
        height: "400px",
        overflowY: "auto",
        padding: "10px",
        marginBottom: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px"
      }}>
        {messages.map((m, i) => {
          let bubbleStyle = {
            padding: "8px 12px",
            borderRadius: "12px",
            maxWidth: "80%",
            wordBreak: "break-word",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.3s"
          };
          let align = "flex-start";
          if (m.user?.name === "系統") {
            bubbleStyle.backgroundColor = "#ffe5e5";
            bubbleStyle.color = "#f00";
          } else if (aiPersonalities.includes(m.user?.name)) {
            bubbleStyle.backgroundColor = "#e5d4ff";
            bubbleStyle.color = "purple";
            align = "flex-start";
          } else {
            bubbleStyle.backgroundColor = "#d4e5ff";
            bubbleStyle.color = "blue";
            align = "flex-end";
          }

          return (
            <div key={i} style={{ display: "flex", justifyContent: align }}>
              <div style={bubbleStyle}>
                <strong>{m.user?.name} {m.to ? `對 ${m.to} 說` : ""}：</strong> {m.message}
              </div>
            </div>
          );
        })}
        {!messages.length && <div style={{ color: '#888', textAlign: "center" }}>還沒有人發話，打個招呼吧！</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入欄位 */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ flex: "1 1 70%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
          placeholder={joined ? "輸入訊息後按 Enter 發送" : "請先加入房間才能發言"}
          disabled={!joined}
        />
        <button
          onClick={send}
          style={{ flex: "1 1 25%", padding: "8px", borderRadius: "5px", cursor: "pointer" }}
          disabled={!joined}
        >
          發送
        </button>
      </div>

      {/* 簡單 fadeIn 動畫 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
