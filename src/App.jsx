import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

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

const aiProfiles = {
  "林怡君": {
    color: "purple",
    phrases: ["哈哈～", "真的嗎？", "好有趣！"],
    templates: [
      "我覺得 {lastUser} 說的很有趣！",
      "你們知道嗎？我最近發現了……",
      "對啊～我也這麼想！"
    ]
  },
  "黃彥廷": {
    color: "green",
    phrases: ["XD", "這不錯！", "你說什麼？"],
    templates: [
      "{lastUser} 的意思是……？哈哈",
      "我也想說同樣的事！",
      "真的嗎？我沒想到這點！"
    ]
  },
  "曾雅雯": {
    color: "pink",
    phrases: ["嗯嗯～", "好耶！", "哈哈～"],
    templates: [
      "我剛剛在想 {lastUser} 說的事",
      "你們覺得呢？",
      "這個話題好有趣啊！"
    ]
  },
  // 可以增加其他 AI
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
  const aiLoopRef = useRef(null);

  // --- Socket 事件 ---
  useEffect(() => {
    socket.on("message", (m) => {
      setMessages(s => [...s, m]);
      if (m.user && aiAvatars[m.user.name] && m.target) setTyping("");
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

  // --- 自動滾動訊息 ---
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
    if (aiLoopRef.current) clearTimeout(aiLoopRef.current);
    aiLoopRef.current = null;
  };

  const send = () => {
    if (!text || !joined) return;

    let typingTimeout;
    if (target && aiAvatars[target]) {
      typingTimeout = setTimeout(() => setTyping(`${target} 正在輸入...`), 2000);
    }

    socket.emit("message", { room, message: text, user: { name }, target });
    setText("");

    const clearTyping = (m) => {
      if (m.user?.name === target) {
        setTyping("");
        socket.off("message", clearTyping);
        if (typingTimeout) clearTimeout(typingTimeout);
      }
    };

    socket.on("message", clearTyping);
  };

  // --- AI 自動對話 ---
  useEffect(() => {
    if (!joined) return;

    const activeAILoop = {};

    const loop = async () => {
      const ais = userList.filter(u => aiAvatars[u.name]);
      const humanUsers = userList.filter(u => !aiAvatars[u.name]);
      if (!ais.length) return;

      for (let speaker of ais) {
        if (activeAILoop[speaker.name]) continue; // AI 正在回覆則跳過

        activeAILoop[speaker.name] = true;

        const typingDelay = 1000 + Math.random() * 2000;
        setTimeout(() => setTyping(`${speaker.name} 正在輸入...`), typingDelay);

        const lastMessage = messages.slice(-1)[0];
        const lastUser = lastMessage?.user?.name || "大家";
        const targetUser = humanUsers.length && Math.random() < 0.7
          ? humanUsers[Math.floor(Math.random() * humanUsers.length)].name
          : "";

        const profile = aiProfiles[speaker.name] || { templates: ["嗯嗯～"], phrases: ["嗯嗯～"], color: "purple" };
        const template = profile.templates[Math.floor(Math.random() * profile.templates.length)];
        const suffix = profile.phrases[Math.floor(Math.random() * profile.phrases.length)];
        const aiReply = template.replace("{lastUser}", lastUser) + " " + suffix;

        socket.emit("message", {
          room,
          message: aiReply,
          user: { name: speaker.name },
          target: targetUser
        });

        setTimeout(() => setTyping(""), 2000);
        setTimeout(() => activeAILoop[speaker.name] = false, 15000 + Math.random() * 10000);
      }

      aiLoopRef.current = setTimeout(loop, 15000 + Math.random() * 10000);
    };

    loop();

    return () => {
      if (aiLoopRef.current) clearTimeout(aiLoopRef.current);
      aiLoopRef.current = null;
    };
  }, [userList, joined, messages]);

  // --- JSX 渲染 ---
  return (
    <div className="container mt-3">
      <h2 className="text-center mb-3">尋夢園聊天室</h2>

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
                  <li key={u.id} className="list-group-item" style={{ cursor: 'pointer' }} onClick={() => setTarget(u.name)}>
                    {u.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col-12 col-md-9">
          <div className="card mb-2" style={{ height: "400px", overflowY: "auto", padding: "10px" }}>
            {messages.map((m, i) => {
              const isSelf = m.user?.name === name;
              const isAI = aiAvatars[m.user?.name];
              const profile = aiProfiles[m.user?.name] || { color: isAI ? "purple" : "#333" };
              const alignClass = isSelf ? "justify-content-end text-end" : "justify-content-start text-start";

              return (
                <div key={i} className={`d-flex ${alignClass} mb-2`}>
                  {!isSelf && isAI && (
                    <img src={aiAvatars[m.user?.name]} alt={m.user.name} className="rounded-circle me-2" style={{ width: "38px", height: "38px", border: "2px solid #ddd" }} />
                  )}
                  <div className={`p-2 rounded`} style={{
                    background: isSelf ? "#d6e8ff" : isAI ? "#e8d6ff" : m.user?.name === "系統" ? "#ffe5e5" : "#fff",
                    color: m.user?.name === "系統" ? "#d00" : profile.color,
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
