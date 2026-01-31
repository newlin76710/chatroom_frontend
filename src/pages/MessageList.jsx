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
  userList = {}, // 這裡接 userList
}) {
  const AML = import.meta.env.VITE_ADMIN_MAX_LEVEL || 99;

  const handleSelectUser = (selectedName) => {
    if (onSelectTarget && selectedName && selectedName !== name) {
      onSelectTarget(selectedName);
    }
  };

  // 根據 userList 的 gender 決定顏色，包括自己
  const getUserColor = (userName) => {
    if (!userName) return "#00aa00"; // 未定
    const user = userList.find((u) => u.name === userName);
    if (!user) return "#00aa00"; // 未定
    if (user.gender === "男") return "#3399ff"; // 男生青藍
    if (user.gender === "女") return "#ff66aa"; // 女生粉紅
    return "#00aa00"; // 未定
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

          // 訊息顏色
          let color = "#eee";
          if (m.color) color = m.color;
          else if (isSystem && messageText?.includes("進入聊天室")) color = "#ff9900";
          else if (isSystem) color = "#BBECE2";
          else if (isSelf) color = "#fff";

          // 標籤
          const tag =
            m.mode === "private"
              ? "(私聊)"
              : m.mode === "publicTarget"
                ? "(公開對象)"
                : "";

          // 系統訊息中的使用者名稱
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

              {/* 訊息文字 */}
              <div
                style={{
                  maxWidth: "75%",
                  color,
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
                      color: tag === "(私聊)" ? "red" : "#ffd36a",
                      marginRight: "4px",
                    }}
                  >
                    {tag}
                  </span>
                )}

                {/* 發言者名稱 */}
                <span
                  style={{
                    fontWeight: "bold",
                    cursor: isSystem ? "default" : "pointer",
                    color: isSystem ? color : getUserColor(userName),
                  }}
                  onClick={() => !isSystem && handleSelectUser(userName)}
                  title={!isSystem ? "點擊與此使用者私聊" : ""}
                >
                  {userName}
                </span>

                {/* 系統訊息進入聊天室 */}
                {enteringUser ? (
                  <>
                    ：
                    <span
                      style={{
                        fontWeight: "bold",
                        cursor: "pointer",
                        color: color, // 系統訊息顏色
                      }}
                      onClick={() => handleSelectUser(enteringUser)}
                      title="點擊與此使用者私聊"
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
                          title="點擊選擇此使用者為對象"
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
                  <span style={{ color: "#ff5555", marginLeft: "4px" }}>
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

      {/* typing 提示 */}
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
