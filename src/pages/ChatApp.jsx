// ChatApp.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import MessageList from "./MessageList";
import VideoPlayer from "./VideoPlayer";
import VideoSafeBoundary from "./VideoSafeBoundary";
import SongRoom from "./SongRoom";
import Listener from "./Listener";
import UserList from "./UserList";
import AdminToolPanel from "./AdminToolPanel";
import QuickPhrasePanel from "./QuickPhrasePanel";
import AnnouncementPanel from "./AnnouncementPanel";
import MessageBoard from "./MessageBoard";
import MyMessageLogPanel from "./MyMessageLogPanel";
import { aiAvatars } from "./aiConfig";
import "./ChatApp.css";


const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const RN = import.meta.env.VITE_ROOM_NAME || "windsong";
const CN = import.meta.env.VITE_CHATROOM_NAME || "聽風的歌";
const AML = import.meta.env.VITE_ADMIN_MAX_LEVEL || 99;
const ANL = import.meta.env.VITE_ADMIN_MIN_LEVEL || 91;
const OPENAI = import.meta.env.VITE_OPENAI === "true";

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
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

}

export default function ChatApp() {
  const navigate = useNavigate();
  const [room] = useState(RN);
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [gender, setGender] = useState("女");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(false);
  const [offline, setOffline] = useState(false);
  const [target, setTarget] = useState("");
  const [typing, setTyping] = useState("");
  const [userList, setUserList] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [closedVideoId, setClosedVideoId] = useState(null);
  const [chatMode, setChatMode] = useState("public");
  const [userListCollapsed, setUserListCollapsed] = useState(false);
  const [showSongPanel, setShowSongPanel] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [placeholder, setPlaceholder] = useState("輸入訊息...");
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const socket = globalSocket;
  const [expTips, setExpTips] = useState([]);
  const [levelUpTips, setLevelUpTips] = useState([]);
  const [chatColor, setChatColor] = useState(
    sessionStorage.getItem("chatColor") || "#ffffff"
  );
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showMessageBoard, setShowMessageBoard] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]); // 過濾用戶名
  const inputRef = useRef(null);
  const userType = sessionStorage.getItem("type") || "guest";
  const isMember = userType === "account";
  const [currentSinger, setCurrentSinger] = useState(null);
  const pendingLeaves = useRef(new Map());
  const initializedRef = useRef(false);

  // --- 初始化 sessionStorage ---
  useEffect(() => {
    const storedName = sessionStorage.getItem("name");
    const storedLevel = parseInt(sessionStorage.getItem("level")) || 1;
    const storedExp = parseInt(sessionStorage.getItem("exp")) || 0;
    const storedGender = sessionStorage.getItem("gender") || "女";

    if (storedName) setName(safeText(storedName));
    setLevel(storedLevel);
    setExp(storedExp);
    setGender(storedGender);
  }, []);

  const [token, setToken] = useState("");
  // 初始化 token
  useEffect(() => {
    const storedToken = sessionStorage.getItem("token") || sessionStorage.getItem("guestToken") || null;
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    // 心跳 10 秒一次
    const heartbeatInterval = setInterval(() => {
      socket.emit("heartbeat");
    }, 10000);

    return () => clearInterval(heartbeatInterval);
  }, [socket]);

  // --- updateUsers 處理 ---
  useEffect(() => {
    const handleUpdateUsers = (list = []) => {
      if (!Array.isArray(list)) return;
      const filtered = OPENAI
        ? list
        : list.filter(u => u?.type !== "AI");
      setUserList(
        filtered
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
            if (a.type === "account" && b.type !== "account") return -1;
            if (a.type !== "account" && b.type === "account") return 1;
            return b.level - a.level;
          })
      );

      const me = list.find(
        (u) =>
          safeText(u.name || u.user) === name &&
          (u.type || "guest") === (sessionStorage.getItem("type") || "guest")
      );
      if (!me) return;
      const myType = sessionStorage.getItem("type") || "guest";

      // 🔒 訪客等級固定 1
      if (myType === "guest") {
        if (level !== 1) {
          setLevel(1);
          setExp(0);
          sessionStorage.setItem("level", 1);
          sessionStorage.setItem("exp", 0);
        }
        return; // ❗訪客直接不吃後面的升級邏輯
      }

      // 等級變化
      if (me.level !== level) {
        if (initializedRef.current && me.level > level) {
          setLevelUpTips(s => [...s, { id: Date.now(), value: "升級!" }]);
        }
        setLevel(me.level || 1);
        sessionStorage.setItem("level", me.level || 1);
      }

      // EXP 變化（⭐ 重點）
      if (me.exp !== exp) {
        const diff = me.exp - exp;
        if (diff > 0 && me.level > 1 && me.level < ANL) {
          setExpTips(s => [...s, { id: Date.now(), value: `+${diff}` }]);
        }
        setExp(me.exp || 0);
        sessionStorage.setItem("exp", me.exp || 0);
      }

      if (me.gender && me.gender !== gender) {
        setGender(me.gender);
        sessionStorage.setItem("gender", me.gender);
      }

      // ⭐ 第一次 update 完成
      initializedRef.current = true;
    };

    socket.on("updateUsers", handleUpdateUsers);
    return () => socket.off("updateUsers", handleUpdateUsers);
  }, [socket, name, level, exp, gender]);

  useEffect(() => {
    const onDisconnect = (reason) => {
      console.log("🔴 socket disconnected:", reason);
      setOffline(true);
    };

    const onReconnect = () => {
      console.log("🟢 socket reconnected");
      setOffline(false);

      // ⭐⭐⭐⭐⭐ 重新 join 房間（極重要）
      socket.emit("joinRoom", {
        room,
        user: {
          name,
          type: sessionStorage.getItem("type") || "guest",
          token: sessionStorage.getItem("token")
        }
      });
    };

    const onConnectError = (err) => {
      console.log("connect_error:", err.message);
      setOffline(true);
    };

    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect", onReconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect", onReconnect);
      socket.off("connect_error", onConnectError);
    };

  }, [socket, room, name]);

  // --- 飄字 ---
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

  // --- Socket 事件 ---
  useEffect(() => {
    const handleMessage = (m) => {
      if (!m) return;

      // 補完整 user
      const fullUser = userList.find((u) => u.name === m.user?.name) || {};

      setMessages((s) => [
        ...s,
        {
          ...m,
          message: safeText(m.message),
          user: {
            ...m.user,
            ...fullUser,
            name: safeText(m.user?.name),
          },
          target: safeText(m.target),
          mode: safeText(m.mode),
          timestamp: m.timestamp || new Date().toLocaleTimeString(),
        },
      ]);
    };

    const handleSystemMessage = (m) => {
      if (!m) return;

      // ===== 判斷離開 =====
      if (m.includes("離開聊天室")) {
        const user = m.replace(" 離開聊天室", "");

        const timer = setTimeout(() => {
          setMessages((s) => [
            ...s,
            {
              user: {
                name: "系統",
                avatar: "/avatars/system.png",
                type: "system",
              },
              message: m,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);

          pendingLeaves.current.delete(user);
        }, 3000); // ⭐ 可改 3~6 秒

        pendingLeaves.current.set(user, timer);
        return;
      }

      // ===== 判斷重新加入 =====
      if (m.includes("進入聊天室")) {
        const user = m.replace(" 進入聊天室", "");

        const timer = pendingLeaves.current.get(user);

        if (timer) {
          // ⭐⭐⭐ reconnect！
          clearTimeout(timer);
          pendingLeaves.current.delete(user);

          // 👉 不顯示 join
          return;
        }
      }

      // 正常顯示
      setMessages((s) => [
        ...s,
        {
          user: {
            name: "系統",
            avatar: "/avatars/system.png",
            type: "system",
          },
          message: m,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    };

    const handleVideoUpdate = (v) => {
      if (!v) {
        setCurrentVideo(null);
        return;
      }
      const id = extractVideoID(v.url);
      // ⭐ 如果這首被關掉 → 永遠不要再打開
      if (closedVideoId === id) return;
      setCurrentVideo(v);
    };


    socket.on("message", handleMessage);
    socket.on("systemMessage", handleSystemMessage);
    socket.on("videoUpdate", handleVideoUpdate);

    return () => {
      socket.off("message", handleMessage);
      socket.off("systemMessage", handleSystemMessage);
      socket.off("videoUpdate", handleVideoUpdate);
    };
  }, [socket, userList]); // ⚠ 一定要有 userList


  // --- 自動 joinRoom 帶 token ---
  useEffect(() => {
    if (joined || !name) return;
    const token = sessionStorage.getItem("token") || sessionStorage.getItem("guestToken");
    const type = sessionStorage.getItem("type") || "guest";

    socket.emit("joinRoom", { room, user: { name, type, token } });
    setJoined(true);
  }, [room, socket, joined, name]);

  // --- 訪客登入 ---
  const loginGuest = async () => {
    try {
      sessionStorage.clear();
      const guestName = `訪客${Math.floor(Math.random() * 9999)}`;

      const res = await fetch(`${BACKEND}/auth/guest`, { method: "POST" });
      const data = await res.json();
      const safeName = safeText(data.name || guestName);

      sessionStorage.setItem("guestToken", data.guestToken);
      sessionStorage.setItem("token", data.guestToken);
      sessionStorage.setItem("name", safeName);
      sessionStorage.setItem("type", "guest");
      sessionStorage.setItem("level", data.level || 1);
      sessionStorage.setItem("exp", data.exp || 0);
      sessionStorage.setItem("gender", data.gender || "女");

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

  // --- 離開房間 / 斷線 ---
  const leaveRoom = async () => {
    try {
      socket.emit("stop-listening", { room, listenerId: name });
      socket.emit("leaveRoom", { room, user: { name } });

      // 不論 guest 或 account 都登出
      await fetch(`${BACKEND}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name })
      });

      sessionStorage.clear();
      socket.disconnect();
      window.location.href = "/login";
    } catch (e) {
      console.error("離開房間失敗", e);
      window.location.href = "/login";
    }
  };

  // --- 自動處理刷新 / 關閉瀏覽器 ---
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        socket.emit("stop-listening", { room, listenerId: name });
        socket.emit("leaveRoom", { room, user: { name } });

        // 不論 guest 或 account 都登出
        await fetch(`${BACKEND}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name })
        });

        socket.disconnect();
      } catch (err) {
        console.error("自動登出失敗", err);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket, room, name]);


  useEffect(() => {
    if (!cooldown) {
      // 等瀏覽器完成 re-render 再 focus（保險）
      focusInput?.();
    }
  }, [cooldown]);

  // --- 發訊息 ---
  const send = () => {
    if (!socket.connected) {
      alert("你目前離線中，請重新連線");
      return;
    }
    if (cooldown || !text.trim() || (chatMode !== "public" && !target)) return;
    const timestamp = new Date().toLocaleTimeString();

    socket.emit("message", {
      room,
      message: text,
      color: chatColor,     // ⭐ 關鍵
      user: { name },
      target: target || "",
      mode: chatMode,
      timestamp,
    });

    setText("");
    setCooldown(true);
    setPlaceholder("請等待 1 秒後再發送…");
    setTimeout(() => {
      setCooldown(false);
      setPlaceholder("輸入訊息...");
    }, 1000);
  };

  const extractVideoID = (url) => {
    if (!url) return null;
    const match =
      url.match(/[?&]v=([\w-]{11})/) ||        // 一般 watch / live watch
      url.match(/youtu\.be\/([\w-]{11})/) ||   // youtu.be
      url.match(/shorts\/([\w-]{11})/) ||      // shorts
      url.match(/live\/([\w-]{11})/);          // live
    return match ? match[1] : null;
  };

  const playVideo = () => {
    const id = extractVideoID(videoUrl);
    if (!id) return alert("無法解析 YouTube 連結");
    socket.emit("playVideo", { room, url: `https://www.youtube.com/watch?v=${id}`, user: { name } });
    setVideoUrl("");
  };

  // --- 監聽 forceLogout ---
  useEffect(() => {
    socket.on("forceLogout", ({ by }) => {
      sessionStorage.setItem("forceLogoutBy", by);
      sessionStorage.setItem("blockedUntil", Date.now() + 5000); // 5 秒
      window.location.href = "/login";
    });
    socket.on("kickFailed", ({ reason }) => window.alert(reason));

    return () => {
      socket.off("forceLogout");
      socket.off("kickFailed");
    };
  }, [socket, navigate]);

  const clearAllMessages = () => {
    setMessages([]);
  };
  const focusInput = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };
  const getUserColorByGender = (gender) => {
    if (gender === "男") return "#A7C7E7"; // 天空藍
    if (gender === "女") return "#F8C8DC"; // 淺粉紅
    return "#00aa00"; // 未定
  };

  return (
    <div className="chat-layout">
      {/* 左側聊天區 */}
      <div className="chat-left">
        <div className="chat-title-bar">
          <div className="chat-title">
            尋夢園{CN}聊天室
            <button
              className="announce-btn"
              title="聊天室公告"
              onClick={() => setShowAnnouncement(true)}
            >
              📢公告
            </button>
            <button
              className="announce-btn"
              onClick={() => setShowMessageBoard(true)}
              title="聊天室留言板"
            >
              💬 留言板
            </button>
            {/* ⭐ 我的發言紀錄（會員限定） */}
            {isMember && (
              <MyMessageLogPanel token={token} />
            )}
            {offline && (
              <div className="offline-banner">
                ⚠️ 網路不穩，重新連線中...
              </div>
            )}
          </div>
        </div>
        <AnnouncementPanel
          open={showAnnouncement}
          onClose={() => setShowAnnouncement(false)}
          myLevel={level}
          token={token}
        />
        <MessageBoard
          token={token}
          myName={name}
          myLevel={level}
          open={showMessageBoard}
          onClose={() => setShowMessageBoard(false)}
        />
        {!joined ? (
          <button onClick={loginGuest}>訪客登入</button>
        ) : (
          <>
            <div className="chat-toolbar">
              <span>
                Hi &nbsp;
                <span
                  className="chat-username"
                  style={{ color: getUserColorByGender(gender) }}
                >
                  {name}
                </span>&nbsp;等級:{formatLv(level)}
                {sessionStorage.getItem("type") !== "guest" && initializedRef.current && level < ANL - 1 ? ` 積分:${exp}` : ""}
                <span className="exp-tip-inline">
                  {expTips.map((tip) => <span key={tip.id} className="exp-tip">{tip.value}</span>)}
                </span>
                <span className="levelup-tip-inline">
                  {levelUpTips.map((tip) => <span key={tip.id} className="levelup-tip">{tip.value}</span>)}
                </span>
              </span>
              <button onClick={leaveRoom}>離開</button>
              {isMember ? (
                <>
                  <div className="video-request">
                    <input style={{ width: 130 }} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="貼上YouTube連結" />
                    <button onClick={playVideo}>🎵 點播</button>
                  </div>
                  <button
                    onClick={() => setShowSongPanel(!showSongPanel)}
                  >
                    🎤 唱歌
                  </button>
                  {showSongPanel && (
                    <SongRoom room={room} name={name} socket={socket} currentSinger={currentSinger} />
                  )}
                </>
              ) : (
                <>
                  <div className="video-request">
                    <button
                      disabled
                      title="登入會員即可使用點播功能"
                      style={{ opacity: 0.5, cursor: "not-allowed" }}
                    >
                      🎵 點播（限會員）
                    </button>
                  </div>
                  <button
                    disabled
                    title="登入會員即可使用唱歌功能"
                    style={{ opacity: 0.5, cursor: "not-allowed" }}
                  >
                    🎤 唱歌（限會員）
                  </button>
                </>
              )}
              <Listener room={room} name={name} socket={socket} onSingerChange={(singer) => setCurrentSinger(singer)} />
            </div>

            <MessageList
              messages={messages.filter(msg => !filteredUsers.includes(msg.user?.name))}
              name={name}
              level={level}
              typing={typing}
              messagesEndRef={messagesEndRef}
              onSelectTarget={(targetName) => {
                if (!targetName) return;
                setTarget(targetName);
                // 自動切換到私聊模式，如果之前是 public
                if (chatMode === "public") setChatMode("private");
                focusInput();
              }}
              userList={userList}
            />

            <div className="chat-input">
              <button
                onClick={clearAllMessages}
                style={{
                  fontSize: "0.7rem",
                  padding: "4px 6px",
                  marginRight: "6px",
                  borderRadius: "6px",
                  border: "1px solid #444",
                  background: "#1a1a1a",
                  color: "#aaa",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🧹清空畫面
              </button>
              {/* 🛡 管理按鈕（小） */}
              <AdminToolPanel
                myName={name}
                myLevel={level}
                token={token}
              />
              <label><input type="radio" checked={chatMode === "public"} onChange={() => { setChatMode("public"); setTarget(""); }} /> 公開</label>
              <label><input type="radio" checked={chatMode === "publicTarget"} onChange={() => setChatMode("publicTarget")} /> 公開對象</label>
              <label><input type="radio" checked={chatMode === "private"} onChange={() => setChatMode("private")} /> 私聊</label>
              {chatMode !== "public" && (
                <select
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    focusInput?.();
                  }}
                >
                  <option value="">選擇對象</option>
                  {userList
                    .filter(u => u.name !== name)
                    .map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                </select>
              )}

              <input
                type="color"
                value={chatColor}
                title="選擇聊天顏色"
                onChange={(e) => {
                  setChatColor(e.target.value);
                  sessionStorage.setItem("chatColor", e.target.value);
                }}
                style={{
                  width: "24px",     // 調小寬度
                  height: "24px",    // 調小高度
                  padding: "0",      // 移除內邊距
                  marginLeft: "6px", // 和文字間距
                  border: "1px solid #ccc", // 可選邊框
                  borderRadius: "4px",      // 圓角
                  verticalAlign: "middle"   // 對齊輸入框
                }}
              />
              <QuickPhrasePanel
                token={token}
                onSelect={(content) => {
                  setText((prev) => (prev ? prev + " " : "") + content);
                }}
              />
              <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={placeholder} disabled={cooldown} />
              <button onClick={send} disabled={cooldown}>發送</button>
            </div>

          </>
        )}
      </div>

      {/* 右側使用者列表 & 影片 */}
      <div className="chat-right">
        <div className="youtube-container">
          <VideoSafeBoundary>
            <VideoPlayer
              video={currentVideo}
              extractVideoID={extractVideoID}
              onClose={() => {
                const id = extractVideoID(currentVideo?.url);
                setClosedVideoId(id);
                setCurrentVideo(null);
              }}
            />
          </VideoSafeBoundary>
        </div>
        <UserList
          userList={userList}
          target={target}
          setTarget={setTarget}
          setChatMode={setChatMode}
          userListCollapsed={userListCollapsed}
          setUserListCollapsed={setUserListCollapsed}
          kickUser={(targetName) => socket.emit("kickUser", { room, targetName })}
          myLevel={level}
          myName={name}
          filteredUsers={filteredUsers}
          setFilteredUsers={setFilteredUsers}
          focusInput={focusInput}
        />
      </div>

    </div>
  );
}
