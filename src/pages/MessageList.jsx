import { aiAvatars, aiProfiles } from "./aiConfig";

export default function MessageList({ messages, name, typing, messagesEndRef }) {
  return (
    <div className="chat-messages">
      {messages.map((m,i) => {
        const isSelf = m.user?.name === name;
        const isSystem = m.user?.name === "系統";
        const isAI = aiAvatars[m.user?.name];
        const profile = aiProfiles[m.user?.name];
        const msgClass = isSystem ? "chat-message system" : isSelf ? "chat-message self" : isAI ? "chat-message ai" : "chat-message other";
        const color = isSystem ? "#ff9900" : isSelf ? "#fff" : profile?.color || "#eee";

        return (
          <div key={i} className="message-row" style={{ justifyContent: isSelf ? "flex-end" : "flex-start" }}>
            {!isSelf && !isSystem && <img src={aiAvatars[m.user?.name]||"/avatars/default.png"} className="message-avatar" />}
            <div className={msgClass} style={{ color }}>
              <strong>{m.user?.name}{m.target ? ` → ${m.target}` : ""}：</strong> {m.message}
            </div>
          </div>
        )
      })}
      {typing && <div className="typing">{typing}</div>}
      <div ref={messagesEndRef} />
    </div>
  );
}
