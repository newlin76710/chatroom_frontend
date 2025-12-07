import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');
const aiAvatars = {
  "林怡君": "https://i.imgur.com/WPmBv8J.png",
  "張雅婷": "https://i.imgur.com/mEtU0lH.png",
  "陳思妤": "https://i.imgur.com/d3gaYqI.png",
  "黃彥廷": "https://i.imgur.com/LXnSoe5.png",
  "王子涵": "https://i.imgur.com/fMuC9NW.png",
  "劉家瑋": "https://i.imgur.com/1aDHx7j.png",
  "李佩珊": "https://i.imgur.com/mAD0cHj.png",
  "蔡承翰": "https://i.imgur.com/gvgkZ1M.png",
  "許婉婷": "https://i.imgur.com/UrI4asX.png",
  "周俊宏": "https://i.imgur.com/E9Xgywn.png",
  "何詩涵": "https://i.imgur.com/hTzFV8Y.png",
  "鄭宇翔": "https://i.imgur.com/Fz3FhXQ.png",
  "郭心怡": "https://i.imgur.com/YHCMe7j.png",
  "江柏翰": "https://i.imgur.com/W4QkJtI.png",
  "曾雅雯": "https://i.imgur.com/2hEQHaE.png",
  "施俊傑": "https://i.imgur.com/svubm7Y.png",
};

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
          const isSelf = m.user?.name === name;
          const isAI = aiPersonalities.includes(m.user?.name);
          const isSystem = m.user?.name === "系統";

          const align = isSelf ? "flex-end" : "flex-start";

          const bubbleStyle = {
            padding: "10px 14px",
            borderRadius: "14px",
            maxWidth: "75%",
            lineHeight: "1.4",
            wordBreak: "break-word",
            margin: "5px 0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
            animation: "fadeIn 0.25s ease",
            background: isSystem
              ? "#ffe5e5"
              : isAI
                ? "#e8d6ff"
                : isSelf
                  ? "#d6e8ff"
                  : "#ffffff",
            color: isSystem
              ? "#d00"
              : isAI
                ? "purple"
                : isSelf
                  ? "#004c99"
                  : "#333",
          };

          const avatar = isAI ? aiAvatars[m.user?.name] : null;

          return (
            <div key={i} style={{ display: "flex", justifyContent: align }}>
              {!isSelf && avatar && (
                <img
                  src={avatar}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    marginRight: "8px",
                    border: "2px solid #ddd",
                  }}
                />
              )}

              <div style={bubbleStyle}>
                <strong>
                  {m.user?.name} {m.to ? `對 ${m.to} 說` : ""}：
                </strong>
                <br />
                {m.message}
              </div>
            </div>
          );
        })}

        {/* AI 正在輸入動畫 */}
        {typingAI && (
          <div style={{ color: "#888", margin: "5px 0", fontStyle: "italic" }}>
            {typingAI}
          </div>
        )}

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
