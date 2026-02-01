// MessageList.jsx
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

  const handleSelectUser = (selectedName) => {
    if (onSelectTarget && selectedName && selectedName !== name) {
      onSelectTarget(selectedName);
    }
  };

  // 根據 userList 的 gender 決定顏色
  const getUserColor = (userName) => {
    if (!userName) return "#00aa00";
    const user = userList.find((u) => u.name === userName);
    if (!user) return "#00aa00";
    if (user.gender === "男") return "#A7C7E7";
    if (user.gender === "女") return "#F8C8DC";
    return "#00aa00";
  };

  return (
    <div className="message-list">
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

          /* =======================
             跟自己有關的判斷（重點）
          ======================= */
          const isRelatedToMe =
            // 自己發言
            isSelf ||

            // 私聊：自己是收或發
            (m.mode === "private" &&
              (m.user?.name === name || m.target === name)) ||

            // 公開對象：自己是收或發
            (m.mode === "publicTarget" &&
              (m.user?.name === name || m.target === name)) ||

            // 系統訊息提到自己
            (isSystem && messageText?.includes(name));

          // 訊息文字顏色
          let color = "#eee";
          if (m.color) color = m.color;
          else if (isSystem && messageText?.includes("進入聊天室")) color = "#ff9900";
          else if (isSystem) color = "#BBECE2";
          else if (isSelf) color = "#fff";

          // 底色（只給跟自己有關的）
          const bgColor = isRelatedToMe
            ? "#004477"
            : "transparent";

          // 標籤
          const tag =
            m.mode === "private"
              ? "(私聊)"
              : m.mode === "publicTarget"
              ? "(公開對象)"
              : "";

          // 系統「進入聊天室」解析
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
              {/* Avatar */}
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

              {/* 訊息內容 */}
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
                {/* 標籤 */}
                {tag && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: tag === "(私聊)" ? "#B84A4A" : "#ffd36a",
                      marginRight: "4px",
                    }}
                  >
                    {tag}
                  </span>
                )}

                {/* 發言者 */}
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

                {/* 系統進入聊天室 */}
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
                    {/* 發言對象 */}
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

                {/* 管理員 IP */}
                {Number(level) === Number(AML) && m.ip && (
                  <span style={{ color: "#B84A4A", marginLeft: "4px" }}>
                    (IP: {m.ip})
                  </span>
                )}

                {/* 時間 */}
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

      {/* typing */}
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
