import { useEffect, useState } from "react";
import "./MessageBoard.css"; // 匯入分開的 CSS

const AML = Number(import.meta.env.VITE_ADMIN_MAX_LEVEL || 99);
const CN = import.meta.env.VITE_CHATROOM_NAME || "聽風的歌";
const BACKEND = import.meta.env.VITE_BACKEND_URL;

export default function MessageBoard({ token, myName, myLevel, open, onClose }) {
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [replyText, setReplyText] = useState({}); // 管理員回覆文字

    const isAdmin = myLevel >= AML;

    /* ===== 載入留言 ===== */
    const loadMessages = async () => {
        try {
            const res = await fetch(`${BACKEND}/api/message-board`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error("載入留言失敗");
            const data = await res.json();
            setMessages(data || []);
        } catch (err) {
            console.error("載入留言失敗", err);
        }
    };

    useEffect(() => {
        if (open) loadMessages();
    }, [open]);

    /* ===== 新增留言 ===== */
    const submitMessage = async () => {
        if (!content.trim()) return;

        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/api/message-board/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content, isPrivate }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "留言失敗");
            }

            setContent("");
            setIsPrivate(false);
            loadMessages();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ===== 刪除留言 ===== */
    const deleteMessage = async (id) => {
        if (!confirm("確定要刪除這則留言？")) return;

        try {
            const res = await fetch(`${BACKEND}/api/message-board/delete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "刪除失敗");
            }
            loadMessages();
        } catch (err) {
            alert(err.message);
        }
    };

    /* ===== 回覆留言（管理員專用） ===== */
    const submitReply = async (id) => {
        const reply = replyText[id]?.trim();
        if (!reply) return;

        try {
            const res = await fetch(`${BACKEND}/api/message-board/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ id, reply }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "回覆失敗");

            setReplyText(prev => ({ ...prev, [id]: "" }));
            loadMessages();
        } catch (err) {
            alert(err.message);
        }
    };

    if (!open) return null;

    return (
        <div className="message-board-overlay">
            <div className="message-board">
                <div className="message-board-header">
                    <h3>💬 {CN}留言板</h3>
                    <button className="close-btn" onClick={onClose}>✖</button>
                </div>

                <div className="message-input">
                    <textarea
                        rows={3}
                        placeholder="留下你的留言..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    <label>
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                        悄悄話
                    </label>
                    <button onClick={submitMessage} disabled={loading}>
                        送出
                    </button>
                </div>

                <div className="message-list">
                    {messages
                        .slice()
                        .reverse()
                        .map((m) => {
                            const isPrivateMsg = m.is_private;
                            const isAuthor = m.author_name === myName;
                            const canDelete = isAdmin || isAuthor;

                            let contentDisplay;
                            if (isPrivateMsg) {
                                if (isAuthor || isAdmin) {
                                    contentDisplay = `這是給版主的悄悄話\n${m.content}`;
                                } else {
                                    contentDisplay = "這是給版主的悄悄話";
                                }
                            } else {
                                contentDisplay = m.content;
                            }

                            return (
                                <div key={m.id} className={`message-item ${isPrivateMsg ? "private" : ""}`}>
                                    <div className="message-content">{contentDisplay}</div>

                                    {/* 回覆內容 */}
                                    {m.reply_content && (
                                        ((isPrivateMsg && (isAuthor || isAdmin)) || !isPrivateMsg) && (
                                            <div className="message-reply">
                                                <b>管理員回覆:</b> {m.reply_content}
                                            </div>
                                        )
                                    )}

                                    <div className="message-meta">
                                        <span className="username">{m.author_name}</span>
                                        <span className="timestamp">{new Date(m.created_at).toLocaleString("zh-TW", {hour12: false})}</span>
                                        {canDelete && (
                                            <button className="delete-btn" onClick={() => deleteMessage(m.id)}>
                                                刪除
                                            </button>
                                        )}
                                    </div>

                                    {/* 管理員回覆輸入框 */}
                                    {isAdmin && !m.reply_content && (
                                        <div className="message-reply-input">
                                            <input
                                                type="text"
                                                placeholder="輸入回覆..."
                                                value={replyText[m.id] || ""}
                                                onChange={(e) => setReplyText(prev => ({ ...prev, [m.id]: e.target.value }))}
                                            />
                                            <button onClick={() => submitReply(m.id)}>回覆</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
