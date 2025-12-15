import { aiAvatars, aiProfiles } from "./aiConfig";

export default function MessageList({ messages, name, typing, messagesEndRef }) {
  return (
    <div className="chat-messages">
      {messages
        .filter(m => {
          // 系統訊息全部顯示
          if (!m.user || m.user.name === "系統") return true;
          // 公開訊息全部顯示
          if (!m.target) return true;
          // 私聊訊息只給自己與對方看
          return m.user.name === name || m.target === name;
        })
        .map((m, i) => {
          const isSelf = m.user?.name === name;
          const isSystem = m.user?.name === "系統";
          const isAI = aiAvatars[m.user?.name];
          const profile = aiProfiles[m.user?.name];

          const msgClass = isSystem
            ? "chat-message system"
            : isSelf
            ? "chat-message self"
            : isAI
            ? "chat-message ai"
            : "chat-message other";

          const color = isSystem ? "#ff9900" : isSelf ? "#fff" : profile?.color || "#eee";

          return (
            <div
              key={i}
              className="message-row"
              style={{ justifyContent: isSelf ? "flex-end" : "flex-start" }}
            >
              {!isSelf && !isSystem && (
                <img
                  src={aiAvatars[m.user?.name] || "/avatars/default.png"}
                  className="message-avatar"
                  style={{ width: 24, height: 24 }}
                />
              )}
              <div className={`${msgClass} ${m.target ? "private-msg" : ""}`} style={{ color }}>
                <strong>
                  {m.user?.name}
                  {m.target ? ` → ${m.target}` : ""}：
                </strong>{" "}
                {m.message}
                {m.target && <span className="private-tag">私聊</span>}
              </div>
            </div>
          );
        })}
      {typing && <div className="typing">{typing}</div>}
      <div ref={messagesEndRef} />
    </div>
  );
}
