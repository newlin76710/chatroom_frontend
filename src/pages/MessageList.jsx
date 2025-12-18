import { aiAvatars, aiProfiles } from "./aiConfig";
import "./ChatApp.css";

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

export default function MessageList({ messages = [], name = "", typing = "", messagesEndRef }) {
  return (
    <div className="message-list" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {messages
        .filter(m => m && (m.mode !== "private" || m.user?.name === name || m.target === name))
        .map((m, i) => {
          const userName = safeText(m.user?.name);
          const targetName = safeText(m.target);
          const messageText = safeText(m.message);
          const isSelf = userName === name;
          const isSystem = userName === "系統";
          const isAI = !!aiAvatars[userName];
          const profile = aiProfiles[userName];

          let msgClass = "chat-message fade-in";
          if (isSystem) msgClass += " system";
          else if (isSelf) msgClass += " self";
          else if (isAI) msgClass += " ai";
          else msgClass += " other";

          let color = "#eee";
          if (isSystem) color = "#ff9900";
          else if (isSelf) color = "#fff";
          else if (profile?.gender === "male") color = "#006633";
          else if (profile?.gender === "female") color = "#ff66aa";
          else if (profile?.color) color = profile.color;

          return (
            <div key={i} className="message-row" style={{ justifyContent: isSelf ? "flex-end" : "flex-start" }}>
              {!isSelf && !isSystem && (
                <img
                  src={aiAvatars[userName] || "/avatars/default.png"}
                  className="message-avatar"
                  alt={userName}
                />
              )}

              <div className={msgClass} style={{ color, position: "relative", fontSize: "0.8rem" }}>
                {(m.mode === "private" || m.mode === "publicTarget") && targetName && (
                  <div style={{ fontSize: "0.7rem", color: "#ffd36a", marginBottom: "2px", textAlign: isSelf ? "right" : "left" }}>
                    {m.mode === "private" ? "私聊" : "公開對象"}
                  </div>
                )}

                <strong>{userName}{targetName ? ` → ${targetName}` : ""}：</strong> {messageText}
              </div>
            </div>
          );
        })}

      {typing && (
        <div className="typing fade-in" style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "4px" }}>
          {safeText(typing)}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
