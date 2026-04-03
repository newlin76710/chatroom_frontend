// useMessages.js
// 管理聊天訊息清單，包含：
//   - 訊息上限（MAX_MESSAGES），防止長時間使用記憶體爆炸
//   - pendingLeaves 緩衝，讓快速重連不顯示「離開聊天室」訊息
import { useState, useRef, useCallback } from "react";
import { MAX_MESSAGES, PENDING_LEAVE_DELAY, SYSTEM_AVATAR } from "../constants";

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

// 底層 append，超過 MAX_MESSAGES 就截斷最舊的
function appendMsg(prev, msg) {
  const next = [...prev, msg];
  return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
}

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const pendingLeaves = useRef(new Map());

  // 一般聊天訊息（需傳入當前 userList 以補完頭像等資料）
  const addMessage = useCallback((m, userList = []) => {
    if (!m) return;
    const fullUser = userList.find((u) => u.name === m.user?.name) || {};
    setMessages((prev) =>
      appendMsg(prev, {
        ...m,
        message: safeText(m.message),
        user: {
          ...m.user,
          ...fullUser,
          name: safeText(m.user?.name),
        },
        target: safeText(m.target),
        mode: safeText(m.mode),
        timestamp: m.timestamp || new Date().toLocaleTimeString(),
      })
    );
  }, []);

  // 系統訊息（進入 / 離開 / 公告等）
  const addSystemMessage = useCallback((m) => {
    if (!m) return;

    // 離開：先等 PENDING_LEAVE_DELAY，讓重連有機會取消
    if (m.includes("離開聊天室")) {
      const user = m.replace(" 離開聊天室", "");
      const timer = setTimeout(() => {
        setMessages((prev) =>
          appendMsg(prev, {
            user: { name: "系統", avatar: SYSTEM_AVATAR, type: "system" },
            message: m,
            timestamp: new Date().toLocaleTimeString(),
          })
        );
        pendingLeaves.current.delete(user);
      }, PENDING_LEAVE_DELAY);
      pendingLeaves.current.set(user, timer);
      return;
    }

    // 進入：若有待處理的離開計時器，說明是快速重連，取消並靜默
    if (m.includes("進入聊天室")) {
      const user = m.replace(" 進入聊天室", "");
      const timer = pendingLeaves.current.get(user);
      if (timer) {
        clearTimeout(timer);
        pendingLeaves.current.delete(user);
        return;
      }
    }

    setMessages((prev) =>
      appendMsg(prev, {
        user: { name: "系統", avatar: SYSTEM_AVATAR, type: "system" },
        message: m,
        timestamp: new Date().toLocaleTimeString(),
      })
    );
  }, []);

  // 金蘋果轉帳訊息
  const addTransactionMessage = useCallback((msg, userList = []) => {
    if (!msg) return;
    const senderUser = userList.find((u) => u.name === msg.username) || {};
    setMessages((prev) =>
      appendMsg(prev, {
        user: {
          name: msg.username,
          avatar: senderUser.avatar || SYSTEM_AVATAR,
          type: "system",
        },
        target: msg.target,
        message: `${msg.amount} 顆${msg.item || "金蘋果"} 以示獎勵`,
        item: msg.item || "金蘋果",
        timestamp: new Date(msg.created_at).toLocaleTimeString(),
        mode: "reward",
        type: "transaction",
      })
    );
  }, []);

  // 禮物訊息
  const addGiftMessage = useCallback((msg) => {
    if (!msg) return;
    setMessages((prev) =>
      appendMsg(prev, {
        user: { name: msg.from, avatar: SYSTEM_AVATAR, type: "gift" },
        target: msg.to,
        item: msg.item,
        imageUrl: msg.imageUrl,
        message: msg.message,
        timestamp: new Date().toLocaleTimeString(),
        type: "gift",
      })
    );
  }, []);

  // 每日樂透金蘋果訊息
  const addSurpriseMessage = useCallback((data) => {
    if (!data) return;
    const { winner, amount } = data;
    const text = winner
      ? `🎊 金蘋果樂透！${winner} 正在上麥，獲得 ${amount} 顆金蘋果！`
      : `🎊 金蘋果樂透時刻到！可惜無人上麥，本次樂透未能送出。`;
    setMessages((prev) =>
      appendMsg(prev, {
        user: { name: "系統", avatar: SYSTEM_AVATAR, type: "system" },
        message: text,
        timestamp: new Date().toLocaleTimeString(),
        type: "surprise",
        winner: winner || null,
        amount: amount || 0,
      })
    );
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    addMessage,
    addSystemMessage,
    addTransactionMessage,
    addGiftMessage,
    addSurpriseMessage,
    clearMessages,
  };
}
