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
                        .slice() // 複製陣列避免改變 state
                        .reverse() // 最新在最上面
                        .map((m) => {
                            const isPrivate = m.is_private;
                            const isAuthor = m.author_name === myName;
                            const canDelete = isAdmin || isAuthor;

                            let contentDisplay;
                            if (isPrivate) {
                                if (isAuthor) {
                                    contentDisplay = `這是給版主的悄悄話\n${m.content}`; // 留言者本人看到完整內容
                                } else if (isAdmin) {
                                    contentDisplay = `這是給版主的悄悄話\n${m.content}`; // 版主看到標記與內容
                                } else {
                                    contentDisplay = "這是給版主的悄悄話"; // 其他人只看到標記
                                }
                            } else {
                                contentDisplay = m.content; // 公開留言
                            }

                            return (
                                <div key={m.id} className={`message-item ${isPrivate ? "private" : ""}`}>
                                    <div className="message-content">{contentDisplay}</div>
                                    <div className="message-meta">
                                        <span className="username">{m.author_name}</span>
                                        <span className="timestamp">{new Date(m.created_at).toLocaleString()}</span>
                                        {canDelete && (
                                            <button className="delete-btn" onClick={() => deleteMessage(m.id)}>
                                                刪除
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
