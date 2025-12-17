import { aiAvatars, aiProfiles } from "./aiConfig";
import "./ChatApp.css";

export default function MessageList({ messages, name, typing, messagesEndRef }) {
  return (
    <div className="chat-messages">
      {messages
        .filter(m => {
          if (m.mode === "private") return m.user?.name === name || m.target === name;
          return true;
        })
        .map((m, i) => {
          const isSelf = m.user?.name === name;
          const isSystem = m.user?.name === "系統";
          const isAI = aiAvatars[m.user?.name];
          const profile = aiProfiles[m.user?.name];

          let msgClass = "chat-message fade-in";
          if (isSystem) msgClass += " system";
          else if (isSelf) msgClass += " self";
          else if (isAI) msgClass += " ai";
          else msgClass += " other";

          let color = "#eee";
          if (!isSystem && !isSelf) {
            if (profile?.gender === "male") color = "#006633";
            else if (profile?.gender === "female") color = "#ff66aa";
            else color = profile?.color || "#eee";
          } else if (isSelf) color = "#fff";
          else if (isSystem) color = "#ff9900";

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
                />
              )}

              {/* 核心：改成 column 排版 */}
              <div
                className="message-column"
                style={{ alignItems: isSelf ? "flex-end" : "flex-start" }}
              >
                {(m.mode === "private" || m.mode === "publicTarget") && m.target && (
                  <div className="message-tag">
                    {m.mode === "private" ? "私聊" : "公開對象"}
                  </div>
                )}

                <div className={msgClass} style={{ color }}>
                  <strong>
                    {m.user?.name}
                    {m.target ? ` → ${m.target}` : ""}：
                  </strong>{" "}
                  {m.message}
                </div>
              </div>
            </div>
          );
        })}

      {typing && (
        <div className="typing fade-in">
          {typing}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
