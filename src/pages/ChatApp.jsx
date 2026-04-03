// ChatApp.optimized.jsx — 優化版本（供參考）
//
// 主要優化：
//  1. [訊息上限]     訊息超過 MAX_MESSAGES(500) 自動截斷最舊的，防止記憶體洩漏
//  2. [穩定的 Socket handlers]
//     使用 "ref 轉發" 模式：每個 socket handler 只在 socket 變動時重新綁定一次，
//     內部透過 ref 讀取最新的 userList / closedVideoId 等值，完全避免 stale closure
//  3. [useMemo]      visibleMessages 依賴 messages + filteredUsers，不在每次 render 重算
//  4. [自訂 Hooks]   useMessages / useUserState 拆出核心狀態邏輯，主元件更清晰
//  5. [AppErrorBoundary] 管理面板 / UserList 包上錯誤邊界，局部錯誤不炸全頁
//  6. [常數集中]     所有魔術數字從 constants.js 引入

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import socketInstance from "./socket";
import "./ChatApp.css";
import MessageList from "./MessageList";
import VideoPlayer from "./VideoPlayer";
import VideoSafeBoundary from "./VideoSafeBoundary";
import SongRoom from "./SongRoom";
import Listener from "./Listener";
import UserList from "./UserList";
import AdminSettingsModal from "./AdminSettingsModal";
import SurpriseHistoryPanel from "./SurpriseHistoryPanel";
import AdminToolPanel from "./AdminToolPanel";
import QuickPhrasePanel from "./QuickPhrasePanel";
import AnnouncementPanel from "./AnnouncementPanel";
import ShopPanel from "./ShopPanel";
import MessageBoard from "./MessageBoard";
import MyMessageLogPanel from "./MyMessageLogPanel";
import Leaderboard from "./Leaderboard";
import AppErrorBoundary from "./AppErrorBoundary";
import { aiAvatars } from "./aiConfig";
import { expForNextLevel } from "./utils";
import { useMessages } from "./hooks/useMessages";
import { useUserState } from "./hooks/useUserState";
import { HEARTBEAT_INTERVAL, COOLDOWN_MS, GENDER_COLORS } from "./constants";
import * as OpenCC from "opencc-js";

// ─── 環境設定 ────────────────────────────────────────────────────────────────
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const RN      = import.meta.env.VITE_ROOM_NAME || "windsong";
const CN      = import.meta.env.VITE_CHATROOM_NAME || "聽風的歌";
const AML     = Number(import.meta.env.VITE_ADMIN_MAX_LEVEL) || 99;
const ANL     = Number(import.meta.env.VITE_ADMIN_MIN_LEVEL) || 91;
const OPENAI  = import.meta.env.VITE_OPENAI === "true";
const NF      = import.meta.env.VITE_NEW_FUNCTION === "true";

// ─── 純函式工具 ──────────────────────────────────────────────────────────────
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

// ✅ 模組層級建立（原本在 render 內建立，每次 render 都重新 new）
const converter = OpenCC.Converter({ from: "cn", to: "tw" });
const toTraditional = (text) => (text ? converter(text) : "");

const formatLv = (lv) => String(lv).padStart(2, "0");

const extractVideoID = (url) => {
  if (!url) return null;
  const match =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/shorts\/([\w-]{11})/) ||
    url.match(/live\/([\w-]{11})/);
  return match ? match[1] : null;
};

const getUserColorByGender = (g) => GENDER_COLORS[g] ?? GENDER_COLORS.default;

// ─── 主元件 ──────────────────────────────────────────────────────────────────
export default function ChatApp() {
  useNavigate(); // 保留 navigate（forceLogout 跳頁用）
  const socket = socketInstance;
  const [room] = useState(RN);

  // ── 自訂 Hooks ──
  const {
    name, level, exp, gender, apples, token,
    expTips, levelUpTips, initializedRef,
    setApples,
    initUser, fetchUserData, handleUpdateUsersForSelf,
  } = useUserState(socket);

  const {
    messages,
    addMessage, addSystemMessage, addTransactionMessage, addGiftMessage,
    addSurpriseMessage,
    clearMessages,
  } = useMessages();

  // ── UI state ──
  const [offline, setOffline]               = useState(false);
  const [target, setTarget]                 = useState("");
  const [typing]                            = useState("");
  const [userList, setUserList]             = useState([]);
  const [currentVideo, setCurrentVideo]     = useState(null);
  const [videoUrl, setVideoUrl]             = useState("");
  const [closedVideoId, setClosedVideoId]   = useState(null);
  const [chatMode, setChatMode]             = useState("public");
  const [userListCollapsed, setUserListCollapsed] = useState(false);
  const [text, setText]                     = useState("");
  const [cooldown, setCooldown]             = useState(false);
  const [placeholder, setPlaceholder]       = useState("輸入訊息...");
  const [chatColor, setChatColor]           = useState(
    () => sessionStorage.getItem("chatColor") || "#ffffff"
  );
  const [showAnnouncement, setShowAnnouncement]   = useState(false);
  const [showMessageBoard, setShowMessageBoard]   = useState(false);
  const [showShop, setShowShop]                   = useState(false);
  const [filteredUsers, setFilteredUsers]         = useState([]);
  const [currentSinger, setCurrentSinger]         = useState(null);
  const [convertTC, setConvertTC]                 = useState(true);
  const [appleAmount, setAppleAmount]             = useState(1);
  const [sendingApple, setSendingApple]           = useState(false);
  const [showAppleSetting, setShowAppleSetting]   = useState(false);

  const joinedRef     = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef      = useRef(null);

  const userType = sessionStorage.getItem("type") || "guest";
  const isMember = userType === "account";

  // ─── 「最新值」refs（給 socket handlers 讀取，避免 stale closure 同時不重新綁定）
  const userListRef      = useRef(userList);
  const closedVideoIdRef = useRef(closedVideoId);
  const roomRef          = useRef(room);
  const nameRef          = useRef(name);
  useEffect(() => { userListRef.current = userList; },      [userList]);
  useEffect(() => { closedVideoIdRef.current = closedVideoId; }, [closedVideoId]);
  useEffect(() => { roomRef.current = room; },              [room]);
  useEffect(() => { nameRef.current = name; },              [name]);

  // ✅ 過濾訊息用 useMemo，只在 messages / filteredUsers 改變時重算
  const visibleMessages = useMemo(
    () => messages.filter((msg) => !filteredUsers.includes(msg.user?.name)),
    [messages, filteredUsers]
  );

  // ─── 初始化 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = initUser();
    if (t) fetchUserData(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 心跳 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => socket.emit("heartbeat"), HEARTBEAT_INTERVAL);
    return () => clearInterval(id);
  }, [socket]);

  // ─── updateUsers ─────────────────────────────────────────────────────────
  useEffect(() => {
    // 這個 handler 用兩個職責分開：
    //  1. 更新 userList（由 ChatApp 自己管）
    //  2. 同步自己的 level/exp/apples（委派給 useUserState hook）
    const handler = (list = []) => {
      if (!Array.isArray(list)) return;
      const filtered = OPENAI ? list : list.filter((u) => u?.type !== "AI");

      setUserList(
        filtered
          .map((u, i) => ({
            id: u?.id || i,
            name: safeText(u?.name || u?.user),
            level: u?.level || 1,
            exp: u?.exp || 0,
            gold_apples: u.gold_apples || 0,
            gender: u?.gender || "女",
            type: u?.type || "guest",
            avatar:
              u?.avatar && u.avatar !== ""
                ? u.avatar
                : aiAvatars[u?.name] || "/avatars/g01.gif",
          }))
          .sort((a, b) => {
            if (a.type === "account" && b.type !== "account") return -1;
            if (a.type !== "account" && b.type === "account") return 1;
            return b.level - a.level;
          })
      );

      // 只有自己的狀態同步交給 hook 處理（handler 內部透過 ref 讀最新值）
      handleUpdateUsersForSelf(list);
    };

    socket.on("updateUsers", handler);
    return () => socket.off("updateUsers", handler);
  }, [socket, handleUpdateUsersForSelf]);
  // ✅ handleUpdateUsersForSelf 本身是穩定的（deps=[]），所以這個 effect 只綁定一次

  // ─── 斷線 / 重連 ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onDisconnect = (reason) => {
      console.log("🔴 socket disconnected:", reason);
      setOffline(true);
    };

    const onReconnect = () => {
      console.log("🟢 socket reconnected");
      setOffline(false);
      if (!joinedRef.current) return;
      socket.emit("joinRoom", {
        room: roomRef.current,
        user: {
          name: nameRef.current,
          type: sessionStorage.getItem("type") || "guest",
          token: sessionStorage.getItem("token"),
        },
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
  }, [socket]);
  // ✅ 不依賴 room / name，改用 ref，不會因為 name 改變就重新綁定

  // ─── 聊天 / 系統 / 影片 / 交易 socket 事件 ────────────────────────────────
  useEffect(() => {
    // ✅ 關鍵：handler 本身在 closure 裡讀的是 ref，不是 state，
    //    所以整個 effect 只在 socket 改變時重新執行（綁定一次）
    const handleMessage       = (m)   => addMessage(m, userListRef.current);
    const handleSystemMessage = (m)   => addSystemMessage(m);
    const handleVideoUpdate   = (v)   => {
      if (!v) { setCurrentVideo(null); return; }
      const id = extractVideoID(v.url);
      if (closedVideoIdRef.current === id) return;
      setCurrentVideo(v);
    };
    const handleTransfer      = (msg) => addTransactionMessage(msg, userListRef.current);
    const handleGift          = (msg) => addGiftMessage(msg);

    socket.on("message",         handleMessage);
    socket.on("systemMessage",   handleSystemMessage);
    socket.on("videoUpdate",     handleVideoUpdate);
    socket.on("transferMessage", handleTransfer);
    socket.on("giftMessage",     handleGift);

    return () => {
      socket.off("message",         handleMessage);
      socket.off("systemMessage",   handleSystemMessage);
      socket.off("videoUpdate",     handleVideoUpdate);
      socket.off("transferMessage", handleTransfer);
      socket.off("giftMessage",     handleGift);
    };
  }, [socket, addMessage, addSystemMessage, addTransactionMessage, addGiftMessage]);
  // addMessage 等函式全部是穩定的（useCallback deps=[]），所以等同只依賴 socket

  // ─── 每日金蘋果樂透 ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleSurprise = (data) => {
      addSurpriseMessage(data);
      // 若自己是得獎者，立即更新金蘋果數量
      if (data.winner && data.winner === nameRef.current) {
        setApples((prev) => prev + data.amount);
      }
    };
    socket.on("goldenAppleSurprise", handleSurprise);
    return () => socket.off("goldenAppleSurprise", handleSurprise);
  }, [socket, addSurpriseMessage]);

  // ─── joinFailed / firework ────────────────────────────────────────────────
  useEffect(() => {
    const handleJoinFail = ({ reason }) => {
      alert(`⚠️ 加入房間失敗: ${reason}`);
      sessionStorage.clear();
      socket.disconnect();
      window.location.href = "/login";
    };

    const handleFirework = (data) => {
      const container = document.createElement("div");
      container.className = "firework-container";
      container.innerHTML = `
        <img src="${data.imageUrl}" class="firework-gif" />
        <div class="firework-message">${data.message}</div>
      `;
      document.body.appendChild(container);
      setTimeout(() => container.remove(), 5000);
    };

    socket.on("joinFailed",   handleJoinFail);
    socket.on("fireworkShow", handleFirework);
    return () => {
      socket.off("joinFailed",   handleJoinFail);
      socket.off("fireworkShow", handleFirework);
    };
  }, [socket]);

  // ─── forceLogout / kickFailed ─────────────────────────────────────────────
  useEffect(() => {
    const handleForceLogout = ({ by }) => {
      sessionStorage.setItem("forceLogoutBy", by);
      sessionStorage.setItem("blockedUntil", Date.now() + 5000);
      window.location.href = "/login";
    };
    const handleKickFailed = ({ reason }) => window.alert(reason);

    socket.on("forceLogout", handleForceLogout);
    socket.on("kickFailed",  handleKickFailed);
    return () => {
      socket.off("forceLogout", handleForceLogout);
      socket.off("kickFailed",  handleKickFailed);
    };
  }, [socket]);

  // ─── 自動 joinRoom ────────────────────────────────────────────────────────
  useEffect(() => {
    if (joinedRef.current || !name) return;
    socket.emit("joinRoom", {
      room,
      user: {
        name,
        type: sessionStorage.getItem("type") || "guest",
        token: sessionStorage.getItem("token") || sessionStorage.getItem("guestToken"),
      },
    });
    joinedRef.current = true;
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── beforeunload 登出 ────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("stop-listening", { room: roomRef.current, listenerId: nameRef.current });
      fetch(`${BACKEND}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: nameRef.current }),
        keepalive: true, // ✅ keepalive 確保瀏覽器關閉時請求還能送出
      }).catch(() => {});
      socket.disconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket]);
  // ✅ 不依賴 room / name，改用 ref，避免每次打字都重新綁定

  // ─── cooldown 結束後 focus 輸入框 ────────────────────────────────────────
  useEffect(() => {
    if (!cooldown) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [cooldown]);

  // ─── 離開房間 ─────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    try {
      socket.emit("stop-listening", { room, listenerId: name });
      socket.emit("leaveRoom", { room, user: { name } });
      await fetch(`${BACKEND}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
    } catch (e) {
      console.error("離開房間失敗", e);
    } finally {
      sessionStorage.clear();
      socket.disconnect();
      window.location.href = "/login";
    }
  }, [socket, room, name]);

  // ─── 發訊息 ───────────────────────────────────────────────────────────────
  const send = useCallback(() => {
    if (!socket.connected) { alert("你目前離線中，請重新連線"); return; }
    if (cooldown || !text.trim() || (chatMode !== "public" && !target)) return;

    socket.emit("message", {
      room,
      message: convertTC ? toTraditional(text) : text,
      color: chatColor,
      user: { name },
      target: target || "",
      mode: chatMode,
      timestamp: new Date().toLocaleTimeString(),
    });

    setText("");
    setCooldown(true);
    setPlaceholder("請等待 1 秒後再發送…");
    setTimeout(() => {
      setCooldown(false);
      setPlaceholder("輸入訊息...");
    }, COOLDOWN_MS);
  }, [socket, cooldown, text, chatMode, target, room, convertTC, chatColor, name]);

  // ─── 點播影片 ─────────────────────────────────────────────────────────────
  const playVideo = useCallback(() => {
    const id = extractVideoID(videoUrl);
    if (!id) { alert("無法解析 YouTube 連結"); return; }
    socket.emit("playVideo", {
      room,
      url: `https://www.youtube.com/watch?v=${id}`,
      user: { name },
    });
    setVideoUrl("");
  }, [socket, room, videoUrl, name]);

  // ─── 送金蘋果 ─────────────────────────────────────────────────────────────
  const transferApple = useCallback(async () => {
    if (!target) { alert("請選擇對象"); return; }
    setSendingApple(true);
    try {
      const res = await fetch(`${BACKEND}/api/transfer-gold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUsername: target, amount: appleAmount }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.reason || data.error || "送出失敗");
      }
      setAppleAmount(1);
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingApple(false);
    }
  }, [target, appleAmount, token]);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="chat-layout">
        {/* 左側聊天區 */}
        <div className="chat-left">
          <div className="chat-title-bar">
            <div className="chat-title">
              尋夢園{CN}聊天室
              <button className="announce-btn" title="聊天室公告" onClick={() => setShowAnnouncement(true)}>
                📢公告
              </button>
              <button className="announce-btn" onClick={() => setShowMessageBoard(true)} title="聊天室留言板">
                💬 留言板
              </button>
              {isMember && <MyMessageLogPanel token={token} />}
              {NF && <Leaderboard room={room} token={token} />}
              {NF && isMember && (
                <button className="announce-btn" title="商城" onClick={() => setShowShop(true)}>
                  <img src="/gifts/gold_apple.gif" alt="金蘋果" style={{ width: 20, height: 20, marginTop: -5 }} /> 商城
                </button>
              )}
              {offline && <div className="offline-banner">⚠️ 網路不穩，重新連線中...</div>}
            </div>
          </div>

          <AnnouncementPanel open={showAnnouncement} onClose={() => setShowAnnouncement(false)} myLevel={level} token={token} />
          <MessageBoard token={token} myName={name} myLevel={level} open={showMessageBoard} onClose={() => setShowMessageBoard(false)} />
          <ShopPanel token={token} myName={name} myLevel={level} targetName={target} open={showShop} onClose={() => setShowShop(false)} />

          {name && (
            <>
              <div className="chat-toolbar">
                <span>
                  Hi &nbsp;
                  <span className="chat-username" style={{ color: getUserColorByGender(gender) }}>
                    {name}
                  </span>
                  &nbsp;等級:{formatLv(level)}
                  {isMember && initializedRef.current && level < ANL - 1
                    ? ` 積分: ${exp} / ${expForNextLevel(level)}`
                    : ""}
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
                      <input
                        style={{ width: 130 }}
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="貼上YouTube連結"
                      />
                      <button onClick={playVideo}>🎵 點播</button>
                    </div>
                    <SongRoom room={room} name={name} socket={socket} currentSinger={currentSinger} myLevel={level} />
                  </>
                ) : (
                  <>
                    <div className="video-request">
                      <button disabled title="登入會員即可使用點播功能" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                        🎵 點播（限會員）
                      </button>
                    </div>
                    <button disabled title="登入會員即可使用唱歌功能" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                      🎤 唱歌（限會員）
                    </button>
                  </>
                )}

                <Listener room={room} name={name} socket={socket} onSingerChange={setCurrentSinger} />
              </div>

              {/* ✅ visibleMessages 是 memoized，不會每次 render 重新過濾 */}
              <MessageList
                messages={visibleMessages}
                name={name}
                level={level}
                typing={typing}
                messagesEndRef={messagesEndRef}
                onSelectTarget={(targetName) => {
                  if (!targetName) return;
                  setTarget(targetName);
                  if (chatMode === "public") setChatMode("private");
                  focusInput();
                }}
                userList={userList}
              />

              <div className="chat-input">
                <button className="clear-btn" onClick={clearMessages}>🧹清空畫面</button>

                {/* ✅ 管理工具包 AppErrorBoundary，防止管理面板錯誤炸掉整個聊天室 */}
                <AppErrorBoundary label="管理工具">
                  <AdminToolPanel myName={name} myLevel={level} token={token} userList={userList} />
                </AppErrorBoundary>

                <label><input type="radio" checked={chatMode === "public"}       onChange={() => { setChatMode("public"); setTarget(""); }} /> 公開</label>
                <label><input type="radio" checked={chatMode === "publicTarget"} onChange={() => setChatMode("publicTarget")} /> 公開對象</label>
                <label><input type="radio" checked={chatMode === "private"}      onChange={() => setChatMode("private")} /> 私聊</label>

                {chatMode !== "public" && (
                  <select value={target} onChange={(e) => { setTarget(e.target.value); focusInput(); }}>
                    <option value="">選擇對象</option>
                    {userList
                      .filter((u) => u.name !== name)
                      .map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
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
                />

                <QuickPhrasePanel
                  token={token}
                  onSelect={(content) => setText((prev) => (prev ? prev + " " : "") + content)}
                />

                {NF && (
                  <label>
                    <input type="checkbox" checked={convertTC} onChange={(e) => setConvertTC(e.target.checked)} />
                    簡轉繁
                  </label>
                )}

                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={placeholder}
                  disabled={cooldown}
                />
                <button onClick={send} disabled={cooldown}>發送</button>
              </div>

              {NF && isMember && (
                <div className="trade-apple">
                  <div className="trade-apple-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {level >= AML && (
                      <button className="admin-btn" onClick={() => setShowAppleSetting(true)}>⚙️ 設定</button>
                    )}
                    <SurpriseHistoryPanel token={token} />
                    金蘋果樂園{" "}
                    <img src="/gifts/gold_apple.gif" alt="金蘋果" style={{ width: 20, height: 20, marginTop: -5 }} />{" "}
                    當前金蘋果數量：{apples}
                  </div>

                  <select value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">選擇對象</option>
                    {userList
                      .filter((u) => u.name !== name && u.type === "account")
                      .map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={appleAmount}
                    onChange={(e) => setAppleAmount(Math.max(1, Number(e.target.value)))}
                    className="apple-amount-input"
                  />

                  <button disabled={sendingApple} onClick={transferApple} className="apple-send-btn">
                    送金蘋果{" "}
                    <img src="/gifts/gold_apple.gif" alt="金蘋果" style={{ width: 20, height: 20, marginTop: -5 }} />
                  </button>
                </div>
              )}
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
                  setClosedVideoId(extractVideoID(currentVideo?.url));
                  setCurrentVideo(null);
                }}
              />
            </VideoSafeBoundary>
          </div>

          {/* ✅ UserList 包 AppErrorBoundary */}
          <AppErrorBoundary label="使用者列表">
            <UserList
              userList={userList}
              target={target}
              setTarget={setTarget}
              setChatMode={setChatMode}
              userListCollapsed={userListCollapsed}
              setUserListCollapsed={setUserListCollapsed}
              kickUser={(targetName) => socket.emit("kickUser", { room, targetName })}
              muteUser={(targetName) => socket.emit("muteUser", { room, targetName })}
              myLevel={level}
              myName={name}
              filteredUsers={filteredUsers}
              setFilteredUsers={setFilteredUsers}
              focusInput={focusInput}
            />
          </AppErrorBoundary>
        </div>
      </div>

      <AdminSettingsModal
        open={showAppleSetting}
        onClose={() => setShowAppleSetting(false)}
        token={token}
        BACKEND={BACKEND}
      />
    </>
  );
}
