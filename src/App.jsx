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
      if (m.user && aiAvatars[m.user.name] && m.to) {
        setTyping(""); // AI 回覆後清除正在輸入
      }
    });

    socket.on("systemMessage", (m) => setMessages(s => [...s, { user: { name: "系統" }, message: m }]));
    socket.on("typing", (n) => {
      setTyping(n + " 正在輸入...");
      setTimeout(() => setTyping(""), 1500);
    });
    socket.on("updateUsers", (list) => setUserList(list));

    return () => {
      socket.off("message");
      socket.off("systemMessage");
      socket.off("typing");
      socket.off("updateUsers");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

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

    // 如果選擇了 AI 作為目標，延遲 2 秒顯示「正在輸入」
    let typingTimeout;
    if (target && aiAvatars[target]) {
      typingTimeout = setTimeout(() => {
        setTyping(`${target} 正在輸入...`);
      }, 2000);
    }

    socket.emit("message", { room, message: text, user: { name }, target });
    setText("");

    // 監聽 AI 回覆事件，收到後清除 typing
    const clearTyping = (m) => {
      if (m.user?.name === target) {
        setTyping("");
        socket.off("message", clearTyping); // 清掉監聽
        if (typingTimeout) clearTimeout(typingTimeout); // 如果還沒顯示也取消
      }
    };

    socket.on("message", clearTyping);
  };


  return (
    <div className="container mt-3">
      <h2 className="text-center mb-3">尋夢園聊天室</h2>

      {/* 控制面板 */}
      <div className="row g-2 mb-3">
        <div className="col-6 col-md-3">
          <label className="form-label">暱稱</label>
          <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">房間</label>
          <select className="form-select" value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="public">大廳</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">自動離開秒數</label>
          <input type="number" min="0" className="form-control" value={autoLeaveTime} onChange={(e) => setAutoLeaveTime(Number(e.target.value))} />
        </div>
        <div className="col-6 col-md-2 d-flex align-items-end">
          <button className="btn btn-primary w-100" onClick={joined ? leave : join}>{joined ? "離開" : "加入"}</button>
        </div>
      </div>

      <div className="row">
        {/* 在線使用者列表 */}
        <div className={`col-12 col-md-3 mb-2`}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <strong>在線人數: {userList.length}</strong>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowUserList(!showUserList)}>
              {showUserList ? "▼" : "▲"}
            </button>
          </div>
          {showUserList && (
            <div className="card" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <ul className="list-group list-group-flush">
                {userList.map(u => (
                  <li key={u.id} className="list-group-item">
                    {u.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 聊天區 */}
        <div className="col-12 col-md-9">
          <div className="card mb-2" style={{ height: "400px", overflowY: "auto", padding: "10px" }}>
            {messages.map((m, i) => {
              const isSelf = m.user?.name === name;
              const isAI = aiAvatars[m.user?.name];
              const alignClass = isSelf ? "justify-content-end text-end" : "justify-content-start text-start";

              return (
                <div key={i} className={`d-flex ${alignClass} mb-2`}>
                  {!isSelf && isAI && (
                    <img src={aiAvatars[m.user?.name]} alt={m.user.name} className="rounded-circle me-2" style={{ width: "38px", height: "38px", border: "2px solid #ddd" }} />
                  )}
                  <div className={`p-2 rounded`} style={{
                    background: isSelf ? "#d6e8ff" : isAI ? "#e8d6ff" : m.user?.name === "系統" ? "#ffe5e5" : "#fff",
                    color: m.user?.name === "系統" ? "#d00" : isAI ? "purple" : isSelf ? "#004c99" : "#333",
                    maxWidth: "75%",
                    wordBreak: "break-word",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.18)"
                  }}>
                    <strong>{m.user?.name}{m.target ? ` 對 ${m.target} 說` : ""}：</strong> {m.message}
                  </div>
                </div>
              );
            })}
            {typing && <div className="text-muted fst-italic">{typing}</div>}
            {!messages.length && <div className="text-center text-muted">還沒有人發話，打個招呼吧！</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* 輸入區 */}
          <div className="input-group mb-3">
            <select className="form-select" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="">發送給全部</option>
              {userList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
            <input type="text" className="form-control" placeholder={joined ? "輸入訊息後按 Enter 發送" : "請先加入房間"} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} disabled={!joined} />
            <button className="btn btn-primary" onClick={send} disabled={!joined}>發送</button>
          </div>
        </div>
      </div>
    </div>
  );
}
