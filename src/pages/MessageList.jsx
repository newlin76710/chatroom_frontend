import { useEffect, useRef } from "react";
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

  // ⭐⭐⭐⭐⭐ 自動滾動核心
  const containerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  /* ===============================
     判斷是否在底部
  =============================== */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 120; // ⭐ 容錯距離

      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

      shouldAutoScrollRef.current = isNearBottom;
    };

    el.addEventListener("scroll", onScroll);

    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* ===============================
     新訊息來時 → 是否滾動
  =============================== */
  useEffect(() => {
    if (!messages.length) return;

    const lastMsg = messages[messages.length - 1];
    const isSelf = lastMsg?.user?.name === name;

    // ⭐ 自己 → 強制到底
    if (isSelf) {
      messagesEndRef?.current?.scrollIntoView({
        behavior: "auto",
      });
      return;
    }

    // ⭐ 別人 → 只有接近底部才滾
    if (!shouldAutoScrollRef.current) return;

    messagesEndRef?.current?.scrollIntoView({
      behavior: "smooth",
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
    if (user.gender === "男") return "#A7C7E7";
    if (user.gender === "女") return "#F8C8DC";
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

          let color = "#eee";
          if (m.color) color = m.color;
          else if (isSystem && messageText?.includes("進入聊天室")) color = "#ff9900";
          else if (isSystem) color = "#BBECE2";
          else if (isSelf) color = "#fff";

          const bgColor = isRelatedToMe ? "#004477" : "transparent";

          const tag =
            m.mode === "private"
              ? "(私聊)"
              : m.mode === "publicTarget"
                ? ""
                : "";

          const enteringUserMatch = isSystem
            ? messageText.match(/^(.+) 進入聊天室$/)
            : null;
          const enteringUser = enteringUserMatch ? enteringUserMatch[1] : null;

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
                      color: tag === "(私聊)" ? "#e60909" : "#ffd36a",
                      marginRight: "4px",
                    }}
                  >
                    {tag}
                  </span>
                )}

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

                {enteringUser ? (
                  <>
                    ：
                    <span
                      style={{
                        fontWeight: "bold",
                        cursor: "pointer",
                        color,
                      }}
                      onClick={() => handleSelectUser(enteringUser)}
                    >
                      {enteringUser}
                    </span>
                    <span> 進入聊天室</span>
                  </>
                ) : (
                  <>
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
