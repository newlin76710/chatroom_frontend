import { useLayoutEffect, useRef } from "react";
import { aiAvatars } from "./aiConfig";
import "./MessageList.css";

const safeText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") return v.text || v.message || v.name || JSON.stringify(v);
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
  const isNearBottomRef = useRef(true);

  // 追蹤使用者是否在底部附近
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // 手機鍵盤彈出/收起時（visualViewport resize），若原本在底部就補捲
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleResize = () => {
      if (isNearBottomRef.current) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    };
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handleResize);
      return () => vv.removeEventListener("resize", handleResize);
    } else {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !messages.length) return;

    const lastMsg = messages[messages.length - 1];
    const isSelf = lastMsg?.user?.name === name;

    requestAnimationFrame(() => {
      // 自己發的訊息一律捲到底；其他人的訊息只有在「已在底部」時才跟著捲
      if (isSelf || isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [messages, name]);

  const handleSelectUser = (user) => {
    if (onSelectTarget && user && user !== name) onSelectTarget(user);
  };

  const getUserColor = (userName) => {
    const user = userList.find((u) => u.name === userName);
    if (!user) return "#00aa00";
    return user.gender === "男" ? "#A7C7E7" : user.gender === "女" ? "#F8C8DC" : "#00aa00";
  };

  return (
    <div ref={containerRef} className="message-list">
      {messages
        .filter((m) => m && (m.mode !== "private" || m.user?.name === name || m.target === name || m.monitored))
        .map((m, i) => {
          const userName = safeText(m.user?.name);
          const targetName = safeText(m.target);
          let messageText = safeText(m.message);
          const timestamp = m.timestamp || new Date().toLocaleTimeString();
          const isSelf = userName === name;
          const isSystem = userName === "系統";
          const isTransaction = m.type === "transaction";
          const isGift = m.type === "gift";
          const isSurprise = m.type === "surprise";
          // 處理系統訊息：進入 & 升級卡
          let relatedUser = null;
          if (isSystem && messageText) {
            const patterns = [
              { regex: /^(.+?) 進入聊天室$/, type: "enter" },
              { regex: /^(.+?) 使用升級卡/, type: "levelUp" },
              { regex: /^(.+?) 使用積分球/, type: "exp" },
              { regex: /^(.+?) 在線獎勵/, type: "exp" },
              { regex: /^(.+?) 施放煙花/, type: "firework" },
              { regex: /^(.+?) 唱歌時間/, type: "time" }
            ];

            for (const p of patterns) {
              const match = messageText.match(p.regex);
              if (match) {
                relatedUser = match[1];
                // 只移除使用者名稱，不刪前面的文字
                const startIndex = match.index;           // 匹配起始位置
                const endIndex = startIndex + match[1].length; // 使用者名稱結束位置
                messageText = messageText.slice(0, startIndex) + messageText.slice(endIndex);
                messageText = messageText.trim();         // 去掉前後多餘空白
                break; // 找到第一個就停
              }
            }
          }

          const isRelatedToMe =
            isSelf ||
            (m.mode === "private" && (userName === name || targetName === name)) ||
            (m.mode === "publicTarget" && (userName === name || targetName === name)) ||
            (isSystem && relatedUser === name) ||
            ((isTransaction || isGift) && (userName === name || targetName === name));

          // 顏色
          let color = "#eee";
          if (m.color) color = m.color;
          else if (isSystem && relatedUser) color = "#ff9900";
          else if (isTransaction || isGift) color = "#ff9900";
          else if (isSystem) color = "#BBECE2";
          else if (isSelf) color = "#fff";

          // AI 私聊文字顏色依性別覆蓋
          if (m.mode === "private") {
            const senderUser = userList.find((u) => u.name === userName);
            if (senderUser?.type === "AI") {
              color = senderUser.gender === "男" ? "#00CED1" : "#F8C8DC";
            }
          }

          const bgColor = isRelatedToMe ? "#004477" : "transparent";
          const tag = m.mode === "private" ? "(私聊)" : "";

          if (isSurprise) {
            return (
              <div key={i} className="message-row surprise-message" style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <div className="surprise-banner">
                  <span className="surprise-icon">🎊</span>
                  <span className="surprise-text">{messageText}</span>
                  <span className="surprise-icon">🎊</span>
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="message-row" style={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", marginBottom: 6 }}>
              {!isSelf && !isSystem && !isTransaction && !isGift && (
                <img
                  src={m.user?.avatar || aiAvatars[userName] || "/avatars/g01.gif"}
                  alt={userName}
                  className="message-avatar"
                />
              )}

              <div style={{ maxWidth: "75%", color, background: bgColor, padding: isRelatedToMe ? "6px 10px" : 0, borderRadius: isRelatedToMe ? 8 : 0, fontSize: "1rem", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.4 }}>
                {tag && <span style={{ fontSize: "0.7rem", color: "#e60909", marginRight: 4 }}>{tag}</span>}

                {(isTransaction || isGift) ? (
                  <>
                    <span>🎁 </span>
                    <span style={{ fontWeight: "bold", cursor: "pointer", color: getUserColor(userName) }} onClick={() => handleSelectUser(userName)}>
                      {userName}
                    </span>
                    {isTransaction ? (<span> 贈送 </span>) : (<span> 向 </span>)}
                    <span style={{ fontWeight: "bold", cursor: "pointer", color: getUserColor(targetName) }} onClick={() => handleSelectUser(targetName)}>
                      {targetName}
                    </span>

                    {isGift && <div className="gift-poem">{messageText}</div>}
                    {m.imageUrl && <div >
                      <img
                        src={m.imageUrl}
                        alt="gift"
                        className="gift-big-image"
                        onLoad={() => {
                          const el = containerRef.current;
                          if (el) el.scrollTop = el.scrollHeight;
                        }}
                      />
                    </div>}
                    {isTransaction && <span> {messageText}</span>}
                  </>
                ) : isSystem && relatedUser ? (
                  <>
                    <span>系統：</span>
                    {relatedUser && (
                      <span style={{ fontWeight: "bold", cursor: "pointer", color: getUserColor(relatedUser) }} onClick={() => handleSelectUser(relatedUser)}>
                        {relatedUser}
                      </span>
                    )}
                    <span style={{ color: "#ff9900" }}> {messageText}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: "bold", cursor: isSystem ? "default" : "pointer", color: isSystem ? color : getUserColor(userName) }} onClick={() => !isSystem && handleSelectUser(userName)}>
                      {userName}
                    </span>
                    {targetName && (
                      <>
                        <span> → </span>
                        <span style={{ fontWeight: "bold", cursor: "pointer", color: getUserColor(targetName) }} onClick={() => handleSelectUser(targetName)}>
                          {targetName}
                        </span>
                      </>
                    )}
                    <span>：{messageText}</span>
                  </>
                )}

                {Number(level) === Number(AML) && m.ip && <span style={{ color: "#B84A4A", marginLeft: 4 }}>(IP: {m.ip})</span>}
                <span style={{ fontSize: "0.7rem", color: "#888", marginLeft: 6, whiteSpace: "nowrap" }}>{timestamp}</span>
              </div>
            </div>
          );
        })}

      {typing && <div className="typing fade-in" style={{ fontSize: "0.9rem", color: "#aaa", marginTop: 4 }}>{safeText(typing)}</div>}

      <div ref={messagesEndRef} />
    </div>
  );
}