import { useLayoutEffect, useRef } from "react";
import { aiAvatars } from "./aiConfig";
import "./MessageList.css";

const safeText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (v.text) return String(v.text);
    if (v.message) return String(v.message);
    if (v.name) return String(v.name);
    return JSON.stringify(v);
  }
  return String(v);
};

export default function MessageList({
  messages = [],
  name = "",
  level = 1,
  typing = "",
  messagesEndRef,
  onSelectTarget,
  userList = [],
}) {
  const AML = import.meta.env.VITE_ADMIN_MAX_LEVEL || 99;
  const containerRef = useRef(null);

  /* ===============================
     ⭐ 核心滾動（穩定版）
  =============================== */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !messages.length) return;

    const lastMsg = messages[messages.length - 1];
    const isSelf = lastMsg?.user?.name === name;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    const NEAR_BOTTOM = 120;

    requestAnimationFrame(() => {
      if (isSelf) {
        el.scrollTop = el.scrollHeight;
        return;
      }

      if (distanceFromBottom < NEAR_BOTTOM) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [messages, name]);

  const handleSelectUser = (selectedName) => {
    if (onSelectTarget && selectedName && selectedName !== name) {
      onSelectTarget(selectedName);
    }
  };

  const getUserColor = (userName) => {
    if (!userName) return "#00aa00";
    const user = userList.find((u) => u.name === userName);
    if (!user) return "#00aa00";
    if (user.gender === "男") return "#A7C7E7"; // 淺藍
    if (user.gender === "女") return "#F8C8DC"; // 淺粉紅
    return "#00aa00";
  };

  return (
    <div ref={containerRef} className="message-list">
      {messages
        .filter(
          (m) =>
            m &&
            (m.mode !== "private" ||
              m.user?.name === name ||
              m.target === name ||
              m.monitored)
        )
        .map((m, i) => {
          const userName = safeText(m.user?.name);
          const targetName = safeText(m.target);
          const messageText = safeText(m.message);
          const timestamp = m.timestamp || new Date().toLocaleTimeString();

          const isSelf = userName === name;
          const isSystem = userName === "系統";

          const isRelatedToMe =
            isSelf ||
            (m.mode === "private" &&
              (m.user?.name === name || m.target === name)) ||
            (m.mode === "publicTarget" &&
              (m.user?.name === name || m.target === name)) ||
            (isSystem && messageText?.includes(name));

          // 系統進入聊天室匹配
          const enteringUserMatch = isSystem
            ? messageText.match(/^(.+) 進入聊天室$/)
            : null;
          const enteringUser = enteringUserMatch ? enteringUserMatch[1] : null;

          // 預設顏色
          let color = "#eee";
          if (m.color) color = m.color;
          else if (isSystem && enteringUser) color = "#ff9900";
          else if (isSystem) color = "#BBECE2"; // 其他系統訊息
          else if (isSelf) color = "#fff";

          const bgColor = isRelatedToMe ? "#004477" : "transparent";
          const tag = m.mode === "private" ? "(私聊)" : "";

          return (
            <div
              key={i}
              className="message-row"
              style={{
                display: "flex",
                justifyContent: isSelf ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                marginBottom: "6px",
              }}
            >
              {!isSelf && !isSystem && (
                <img
                  src={
                    m.user?.avatar && m.user?.avatar !== ""
                      ? m.user?.avatar
                      : aiAvatars[userName] || "/avatars/g01.gif"
                  }
                  alt={userName}
                  className="message-avatar"
                />
              )}

              <div
                style={{
                  maxWidth: "75%",
                  color,
                  background: bgColor,
                  padding: isRelatedToMe ? "6px 10px" : "0",
                  borderRadius: isRelatedToMe ? "8px" : "0",
                  fontSize: "1rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: "1.4",
                }}
              >
                {tag && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "#e60909",
                      marginRight: "4px",
                    }}
                  >
                    {tag}
                  </span>
                )}

                {enteringUser ? (
                  <>
                    <span>系統：</span>
                    <span
                      style={{
                        fontWeight: "bold",
                        cursor: "pointer",
                        color: getUserColor(enteringUser),
                      }}
                      onClick={() => handleSelectUser(enteringUser)}
                    >
                      {enteringUser}
                    </span>
                    <span style={{ color: "#ff9900" }}> 進入聊天室</span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontWeight: "bold",
                        cursor: isSystem ? "default" : "pointer",
                        color: isSystem ? color : getUserColor(userName),
                      }}
                      onClick={() => !isSystem && handleSelectUser(userName)}
                    >
                      {userName}
                    </span>

                    {targetName && (
                      <>
                        <span> → </span>
                        <span
                          style={{
                            fontWeight: "bold",
                            cursor: "pointer",
                            color: getUserColor(targetName),
                          }}
                          onClick={() => handleSelectUser(targetName)}
                        >
                          {targetName}
                        </span>
                      </>
                    )}
                    <span>：{messageText}</span>
                  </>
                )}

                {Number(level) === Number(AML) && m.ip && (
                  <span style={{ color: "#B84A4A", marginLeft: "4px" }}>
                    (IP: {m.ip})
                  </span>
                )}

                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#888",
                    marginLeft: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {timestamp}
                </span>
              </div>
            </div>
          );
        })}

      {typing && (
        <div
          className="typing fade-in"
          style={{ fontSize: "0.9rem", color: "#aaa", marginTop: "4px" }}
        >
          {safeText(typing)}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}