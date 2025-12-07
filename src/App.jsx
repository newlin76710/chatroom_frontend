import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

const aiAvatars = {
  "林怡君": "/avatars/g01.gif",
  "張雅婷": "/avatars/g02.gif",
  "陳思妤": "/avatars/g03.gif",
  "黃彥廷": "/avatars/b01.gif",
  "王子涵": "/avatars/b02.gif",
  "劉家瑋": "/avatars/b03.gif",
  "李佩珊": "/avatars/g04.gif",
  "蔡承翰": "/avatars/b04.gif",
  "許婉婷": "/avatars/g05.gif",
  "周俊宏": "/avatars/b05.gif",
  "何詩涵": "/avatars/g06.gif",
  "鄭宇翔": "/avatars/b06.gif",
  "郭心怡": "/avatars/g07.gif",
  "江柏翰": "/avatars/b07.gif",
  "曾雅雯": "/avatars/g08.gif",
  "施俊傑": "/avatars/b08.gif",
};

const aiPersonalities = Object.keys(aiAvatars);

export default function App() {
  const [room, setRoom] = useState("public");
  const [name, setName] = useState("訪客" + Math.floor(Math.random() * 999));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [targetAI, setTargetAI] = useState("");
  const [autoLeaveTime, setAutoLeaveTime] = useState(0);
  const [typingAI, setTypingAI] = useState("");

  const messagesEndRef = useRef(null);
  const autoLeaveTimeoutRef = useRef(null);

  useEffect(() => {
    socket.on("message", (m) => setMessages((s) => [...s, m]));

    socket.on("systemMessage", (m) =>
      setMessages((s) => [...s, { user: { name: "系統" }, message: m }])
    );

    socket.on("typing", (name) => {
      setTypingAI(name + " 正在輸入...");
      setTimeout(() => setTypingAI(""), 1500);
    });

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("typing");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingAI]);

  const join = () => {
    socket.emit("joinRoom", { room, user: { name } });
    setJoined(true);
    setMessages((s) => [
      ...s,
      { user: { name: "系統" }, message: `${name} 加入房間` },
    ]);

    if (autoLeaveTime > 0)
      autoLeaveTimeoutRef.current = setTimeout(() => leave(), autoLeaveTime * 1000);
  };

  const leave = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    setJoined(false);
    setMessages((s) => [
      ...s,
      { user: { name: "系統" }, message: `${name} 離開房間` },
    ]);

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
      targetAI,
      to: targetAI || "",
    });

    setText("");
  };

  return (
    <div className="container" style={{ maxWidth: "800px", marginTop: "20px" }}>
      <h2 className="text-center mb-3">尋夢園聊天室</h2>

      {/* 控制面板 */}
      <div className="row g-3 mb-3">
        {/* 暱稱 */}
        <div className="col-6 col-md-3">
          <label className="form-label">暱稱</label>
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* 房間 */}
        <div className="col-6 col-md-2">
          <label className="form-label">房間</label>
          <select
            className="form-select"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="public">大廳</option>
          </select>
        </div>

        {/* 自動離開秒數 */}
        <div className="col-6 col-md-2">
          <label className="form-label">自動離開秒數</label>
          <input
            type="number"
            min="0"
            className="form-control"
            value={autoLeaveTime}
            onChange={(e) => setAutoLeaveTime(Number(e.target.value))}
          />
        </div>

        {/* 加入 / 離開按鈕 */}
        <div className="col-6 col-md-2 d-flex align-items-end">
          <button
            className={`btn ${joined ? "btn-danger" : "btn-primary"} w-100`}
            onClick={joined ? leave : join}
          >
            {joined ? "離開" : "加入"}
          </button>
        </div>
      </div>

      {/* 聊天區 */}
      <div className="card mb-3 shadow-sm">
        <div
          className="card-body overflow-auto"
          style={{ height: "400px", display: "flex", flexDirection: "column", gap: "6px" }}
        >
          {messages.map((m, i) => {
            const isSelf = m.user?.name === name;
            const isAI = aiPersonalities.includes(m.user?.name);
            const isSystem = m.user?.name === "系統";

            return (
              <div
                key={i}
                className={`d-flex mb-2 ${isSelf ? "justify-content-end" : "justify-content-start"}`}
              >
                {/* AI 頭像 */}
                {!isSelf && isAI && (
                  <img
                    src={aiAvatars[m.user?.name]}
                    className="rounded-circle border me-2"
                    style={{ width: "38px", height: "38px" }}
                  />
                )}

                <div
                  className="p-2 rounded shadow-sm"
                  style={{
                    maxWidth: "70%",
                    backgroundColor: isSystem
                      ? "#ffe5e5"
                      : isAI
                        ? "#f1e0ff"
                        : isSelf
                          ? "#d7eafe"
                          : "#ffffff",
                    color: isSystem
                      ? "#bb0000"
                      : isAI
                        ? "purple"
                        : isSelf
                          ? "#003366"
                          : "#333"
                  }}
                >
                  <strong>
                    {m.user?.name} {m.to ? `對 ${m.to} 說` : ""}：
                  </strong>
                  <br />
                  {m.message}
                </div>
              </div>
            );
          })}

          {/* 正在輸入 */}
          {typingAI && (
            <div className="text-muted fst-italic small ms-1">{typingAI}</div>
          )}

          {!messages.length && (
            <div className="text-center text-muted">還沒有人發話，打個招呼吧！</div>
          )}

          <div ref={messagesEndRef}></div>
        </div>
      </div>

      {/* 輸入框 + 指定聊天對象 */}
      <div className="input-group mb-3">
        <select
          className="form-select"
          value={targetAI}
          onChange={(e) => setTargetAI(e.target.value)}
          style={{ maxWidth: "150px" }}
        >
          <option value="">全部</option>
          {aiPersonalities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <input
          className="form-control"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={joined ? "輸入訊息後按 Enter 發送" : "請先加入房間才能發言"}
          disabled={!joined}
        />

        <button
          className="btn btn-success"
          onClick={send}
          disabled={!joined}
        >
          發送
        </button>
      </div>
    </div>
  );

}
