// AdminUserLevelPanel.jsx
import { useEffect, useState } from "react";
import "./AdminLevelPanel.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const PAGE_SIZE = 20;

export default function AdminLevelPanel({ token, myLevel, minLevel }) {
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [keyword, setKeyword] = useState("");

    const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), 10);

    if (!token || myLevel < minLevel) return null;

    /* ================= 載入使用者 ================= */
    const loadUsers = async (pageNum = 1, search = keyword) => {
        try {
            const res = await fetch(`${BACKEND}/admin/user-levels`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    page: pageNum,
                    pageSize: PAGE_SIZE,
                    keyword: search,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "查詢使用者失敗");
                return;
            }

            setUsers((data.users || []).map(u => ({
                ...u,
                editLevel: u.level,
            })));
            setPage(pageNum);
            setTotalCount(data.total || 0);
        } catch (err) {
            console.error(err);
            alert("查詢使用者失敗");
        }
    };

    /* ================= 修改等級 ================= */
    const handleLevelChange = async (username, newLevel) => {
        if (!window.confirm(`確定將 ${username} 的等級設為 ${newLevel} 嗎？`)) return;

        try {
            const res = await fetch(`${BACKEND}/admin/set-user-level`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    username,
                    level: Number(newLevel),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "更新失敗");
                return;
            }

            alert("更新成功");
            setUsers(prev =>
                prev.map(u =>
                    u.username === username
                        ? { ...u, level: Number(newLevel), editLevel: Number(newLevel) }
                        : u
                )
            );
        } catch (err) {
            console.error(err);
            alert("更新失敗");
        }
    };

    /* ================= 刪除使用者 ================= */
    const handleDeleteUser = async (username) => {
        if (!window.confirm(`⚠️ 確定要永久刪除使用者「${username}」嗎？\n此動作無法復原！`))
            return;

        try {
            const res = await fetch(`${BACKEND}/admin/delete-user`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "刪除失敗");
                return;
            }

            alert("使用者已刪除");
            setUsers(prev => prev.filter(u => u.username !== username));
            setTotalCount(c => Math.max(0, c - 1));
        } catch (err) {
            console.error(err);
            alert("刪除失敗");
        }
    };

    /* ================= 分頁按鈕 ================= */
    const renderPageButtons = () => {
        const maxButtons = 10;
        let start = Math.max(1, page - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start < maxButtons - 1)
            start = Math.max(1, end - maxButtons + 1);

        return Array.from({ length: end - start + 1 }, (_, i) => {
            const p = start + i;
            return (
                <button
                    key={p}
                    className="admin-btn"
                    disabled={p === page}
                    onClick={() => loadUsers(p)}
                >
                    {p}
                </button>
            );
        });
    };

    return (
        <>
            <button className="admin-btn" onClick={() => { setOpen(true); loadUsers(1); }}>
                🛡 管理使用者等級
            </button>

            {open && (
                <div className="admin-overlay" onClick={() => setOpen(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-header">
                            <h3>使用者等級管理</h3>
                            <button onClick={() => setOpen(false)}>✖</button>
                        </div>

                        {/* 搜尋 */}
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                placeholder="搜尋使用者"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                            />
                            <button className="admin-btn" onClick={() => loadUsers(1, keyword)}>
                                搜尋
                            </button>
                        </div>

                        {/* 表格 + 滾動容器 */}
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>帳號</th>
                                        <th>等級</th>
                                        <th>建立時間</th>
                                        <th>最近登入</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.username}</td>
                                            <td>{u.level}</td>
                                            <td>{new Date(u.created_at).toLocaleString()}</td>
                                            <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "-"}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={myLevel}
                                                    value={u.editLevel}
                                                    style={{ width: "50px", marginRight: "6px" }}
                                                    onChange={e =>
                                                        setUsers(prev =>
                                                            prev.map(x =>
                                                                x.id === u.id
                                                                    ? { ...x, editLevel: e.target.value }
                                                                    : x
                                                            )
                                                        )
                                                    }
                                                />
                                                <button
                                                    className="admin-btn"
                                                    onClick={() => handleLevelChange(u.username, u.editLevel)}
                                                    style={{ marginRight: "6px" }}
                                                >
                                                    修改
                                                </button>
                                                <button
                                                    className="admin-btn"
                                                    style={{ background: "#c62828", color: "#fff" }}
                                                    onClick={() => handleDeleteUser(u.username)}
                                                >
                                                    刪除
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: "center" }}>無資料</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 分頁 */}
                        <div className="admin-pagination">
                            <button className="admin-btn" disabled={page <= 1} onClick={() => loadUsers(page - 1)}>
                                上一頁
                            </button>
                            {renderPageButtons()}
                            <button className="admin-btn" disabled={page >= totalPages} onClick={() => loadUsers(page + 1)}>
                                下一頁
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
