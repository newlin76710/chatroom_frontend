import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MessageList from "./MessageList";
import VideoPlayer from "./VideoPlayer";
import SongPanel from "./SongPanel";
import UserList from "./UserList";
import { aiAvatars } from "./aiConfig";
import "./ChatApp.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

const safeText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (v.name) return String(v.name);
    if (v.user) return String(v.user);
    if (v.message) return String(v.message);
    return JSON.stringify(v);
  }
  return String(v);
};

const formatLv = (lv) => String(lv).padStart(2, "0");

let globalSocket = null;
if (!globalSocket) {
  globalSocket = io(BACKEND, {
    transports: ["websocket"], // 強制使用 websocket
    withCredentials: true,     // 配合後端 cors
  });
}

export default function ChatApp() {
  const [room] = useState("public");
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [gender, setGender] = useState("女");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [target, setTarget] = useState("");
  const [typing, setTyping] = useState("");
  const [userList, setUserList] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [chatMode, setChatMode] = useState("public");
  const [userListCollapsed, setUserListCollapsed] = useState(false);
  const [showSongPanel, setShowSongPanel] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [placeholder, setPlaceholder] = useState("輸入訊息...");
  const messagesEndRef = useRef(null);
  const socket = globalSocket;
  const [expTips, setExpTips] = useState([]);
  const [levelUpTips, setLevelUpTips] = useState([]);

  // --- 初始化 localStorage ---
  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedLevel = parseInt(localStorage.getItem("level")) || 1;
    const storedExp = parseInt(localStorage.getItem("exp")) || 0;
    const storedGender = localStorage.getItem("gender") || "女";

    if (storedName) setName(safeText(storedName));
    setLevel(storedLevel);
    setExp(storedExp);
    setGender(storedGender);
  }, []);

  // --- updateUsers 處理 ---
  useEffect(() => {
    const handleUpdateUsers = (list = []) => {
      if (!Array.isArray(list)) return;

      setUserList(
        list
          .map((u, i) => ({
            id: u?.id || i,
            name: safeText(u?.name || u?.user),
            level: u?.level || 1,
            exp: u?.exp || 0,
            gender: u?.gender || "女",
            type: u?.type || "guest",
            avatar: u?.avatar && u.avatar !== "" ? u.avatar : aiAvatars[u?.name] || "/avatars/g01.gif",
          }))
          .sort((a, b) => {
            // 真人 (account) 優先，再等級排序
            if (a.type === "account" && b.type !== "account") return -1;
            if (a.type !== "account" && b.type === "account") return 1;
            return b.level - a.level;
          })
      );

      // 找自己資料，保證對應正確的 type
      const me = list.find(
        (u) =>
          safeText(u.name || u.user) === name &&
          (u.type || "guest") === (localStorage.getItem("type") || "guest")
      );
      if (!me) return;

      // 更新 LV
      if (me.level > level) {
        setLevel(me.level || 1);
        setLevelUpTips((s) => [...s, { id: Date.now(), value: "LV UP!" }]);
        localStorage.setItem("level", me.level || 1);
      }

      // 更新 EXP
      if (me.exp > exp) {
        setExp(me.exp || 0);
        setExpTips((s) => [...s, { id: Date.now(), value: `+${me.exp - exp}` }]);
        localStorage.setItem("exp", me.exp || 0);
      }

      // 更新 gender
      if (me.gender && me.gender !== gender) {
        setGender(me.gender);
        localStorage.setItem("gender", me.gender);
      }
    };

    socket.on("updateUsers", handleUpdateUsers);
    return () => socket.off("updateUsers", handleUpdateUsers);
  }, [socket, name, level, exp, gender]);

  // --- 移除飄字 ---
  useEffect(() => {
    if (expTips.length > 0) {
      const timer = setTimeout(() => setExpTips((s) => s.slice(1)), 1000);
      return () => clearTimeout(timer);
    }
  }, [expTips]);

  useEffect(() => {
    if (levelUpTips.length > 0) {
      const timer = setTimeout(() => setLevelUpTips((s) => s.slice(1)), 1200);
      return () => clearTimeout(timer);
    }
  }, [levelUpTips]);

  // --- 自動捲動 ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Socket 事件 ---
  useEffect(() => {
    const handleMessage = (m) => {
      if (!m) return;
      setMessages((s) => [
        ...s,
        {
          ...m,
          message: safeText(m.message),
          user: { name: safeText(m.user?.name) },
          target: safeText(m.target),
          mode: safeText(m.mode),
          timestamp: m.timestamp || new Date().toLocaleTimeString(),
        },
      ]);
    };

    const handleSystemMessage = (m) => {
      setMessages((s) => [...s, { user: { name: "系統" }, message: safeText(m) }]);
    };

    const handleVideoUpdate = (v) => setCurrentVideo(v || null);

    socket.on("message", handleMessage);
    socket.on("systemMessage", handleSystemMessage);
    socket.on("videoUpdate", handleVideoUpdate);

    return () => {
      socket.off("message", handleMessage);
      socket.off("systemMessage", handleSystemMessage);
      socket.off("videoUpdate", handleVideoUpdate);
    };
  }, [socket]);

  // --- 自動 joinRoom ---
  useEffect(() => {
    if (joined || !name) return;
    const token = localStorage.getItem("token") || localStorage.getItem("guestToken");
    const type = localStorage.getItem("type") || "guest";
    socket.emit("joinRoom", { room, user: { name, type, token } });
    setJoined(true);
  }, [room, socket, joined, name]);

  // --- 訪客登入 ---
  // --- 訪客登入 ---
  const loginGuest = async () => {
    try {
      // 清掉舊資料
      localStorage.removeItem("name");
      localStorage.removeItem("level");
      localStorage.removeItem("exp");
      localStorage.removeItem("gender");
      localStorage.removeItem("type");
      localStorage.removeItem("guestToken");

      // 生成唯一訪客名稱
      const guestName = `訪客${Date.now()}${Math.floor(Math.random() * 999)}`;

      const res = await fetch(`${BACKEND}/auth/guest`, { method: "POST" });
      const data = await res.json();
      const safeName = safeText(data.name || guestName);

      localStorage.setItem("guestToken", data.guestToken);
      localStorage.setItem("name", safeName);
      localStorage.setItem("type", "guest");
      localStorage.setItem("level", data.level || 1);
      localStorage.setItem("exp", data.exp || 0);
      localStorage.setItem("gender", data.gender || "女");

      setName(safeName);
      setLevel(data.level || 1);
      setExp(data.exp || 0);
      setGender(data.gender || "女");

      socket.emit("joinRoom", {
        room,
        user: { name: safeName, type: "guest", token: data.guestToken },
      });
      setJoined(true);
    } catch (err) {
      alert("訪客登入失敗：" + err.message);
    }
  };


  const leaveRoom = () => {
    socket.emit("leaveRoom", { room, user: { name } });
    localStorage.clear();
    window.location.href = "/login";
  };

  // --- 發訊息 ---
  const send = () => {
    if (cooldown || !text.trim() || (chatMode !== "public" && !target)) return;

    const timestamp = new Date().toLocaleTimeString();

    socket.emit("message", {
      room,
      message: text,
      user: { name },
      target: target || "",
      mode: chatMode,
      timestamp,
    });

    setText("");
    setCooldown(true);
    setPlaceholder("請等待 3 秒後再發送…");
    setTimeout(() => {
      setCooldown(false);
      setPlaceholder("輸入訊息...");
    }, 3000);
  };

  const extractVideoID = (url) => {
    if (!url) return null;
    const match =
      url.match(/v=([\w-]{11})/) ||
      url.match(/youtu\.be\/([\w-]{11})/) ||
      url.match(/shorts\/([\w-]{11})/);
    return match ? match[1] : null;
  };

  const playVideo = () => {
    const id = extractVideoID(videoUrl);
    if (!id) return alert("無法解析 YouTube 連結");
    socket.emit("playVideo", { room, url: `https://www.youtube.com/watch?v=${id}`, user: { name } });
    setVideoUrl("");
  };

  async function uploadSong(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64 = reader.result.split(",")[1];

          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL || "http://localhost:10000"}/song/upload`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                audioBase64: base64,
                singer: name, // ← 用目前登入者名稱
              }),
            }
          );

          if (!res.ok) {
            console.error("uploadSong http error", res.status);
            return reject("http error");
          }

          const data = await res.json();
          console.log("🎵 uploadSong success:", data.url);

          // 🔥 關鍵：一定要回傳字串
          resolve(data.url); // "/songs/xxxx.webm"
        } catch (err) {
          console.error("uploadSong failed", err);
          reject(err);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }


  return (
    <div className="chat-layout">
      <div className="chat-left">
        <div className="chat-title">尋夢園男歡女愛聊天室</div>

        {!joined ? (
          <button onClick={loginGuest}>訪客登入</button>
        ) : (
          <div className="chat-toolbar">
            <span style={{ position: "relative" }}>
              Hi [Lv.{formatLv(level)}] {name} ({gender}) EXP:{exp}
              <span className="exp-tip-inline">
                {expTips.map((tip) => <span key={tip.id} className="exp-tip">{tip.value}</span>)}
              </span>
              <span className="levelup-tip-inline">
                {levelUpTips.map((tip) => <span key={tip.id} className="levelup-tip">{tip.value}</span>)}
              </span>
            </span>
            <button onClick={leaveRoom}>離開</button>

            <div className="video-request">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="YouTube 連結"
              />
              <button onClick={playVideo}>🎵 點播</button>
            </div>

            <button onClick={() => setShowSongPanel(!showSongPanel)}>🎤 唱歌</button>
          </div>
        )}

        <MessageList messages={messages} name={name} typing={typing} messagesEndRef={messagesEndRef} />

        <div className="chat-input">
          <label>
            <input type="radio" checked={chatMode === "public"} onChange={() => { setChatMode("public"); setTarget(""); }} /> 公開
          </label>
          <label>
            <input type="radio" checked={chatMode === "publicTarget"} onChange={() => setChatMode("publicTarget")} /> 公開對象
          </label>
          <label>
            <input type="radio" checked={chatMode === "private"} onChange={() => setChatMode("private")} /> 私聊
          </label>

          {chatMode !== "public" && (
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">選擇對象</option>
              {userList.filter((u) => u.name !== name).map((u) => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={placeholder}
            disabled={cooldown}
          />
          <button onClick={send} disabled={cooldown}>發送</button>
        </div>

        {showSongPanel && (
          <SongPanel
            socket={socket}
            room={room}
            name={name}
            uploadSong={uploadSong}
            userList={userList}
            chatMode={chatMode}
            setChatMode={setChatMode}
            target={target}
            setTarget={setTarget}
            onClose={() => setShowSongPanel(false)}
            inline
          />
        )}
      </div>

      <div className="chat-right">
        <div className="youtube-container">
          <VideoPlayer video={currentVideo} extractVideoID={extractVideoID} onClose={() => setCurrentVideo(null)} />
        </div>

        <UserList
          userList={userList}
          target={target}
          setTarget={setTarget}
          setChatMode={setChatMode}
          userListCollapsed={userListCollapsed}
          setUserListCollapsed={setUserListCollapsed}
        />
      </div>
    </div>
  );
}
