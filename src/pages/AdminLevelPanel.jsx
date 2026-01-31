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

    // 載入使用者清單
    const loadUsers = async (pageNum = 1, search = keyword) => {
        try {
            const res = await fetch(`${BACKEND}/admin/user-levels`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ page: pageNum, pageSize: PAGE_SIZE, keyword: search }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "查詢使用者清單失敗");
                return;
            }

            const data = await res.json();

            // 不用再過濾 account_type，因為 API 已經過濾過
            const filtered = data.users || [];

            setUsers(filtered.map(u => ({ ...u, editLevel: u.level })));
            setPage(pageNum);
            setTotalCount(data.total || (filtered.length * 10 || 200));
        } catch (err) {
            console.error(err);
            alert("查詢使用者清單失敗");
        }
    };

    const handleOpen = () => {
        setOpen(true);
        loadUsers(1);
    };

    const handlePage = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        loadUsers(newPage);
    };

    const handleSearch = () => {
        loadUsers(1, keyword);
    };

    const handleInputChange = (id, value) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, editLevel: value } : u));
    };

    const handleLevelChange = async (username, newLevel) => {
        if (!window.confirm(`確定將 ${username} 的等級設為 ${newLevel} 嗎？`)) return;

        try {
            const res = await fetch(`${BACKEND}/admin/set-user-level`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username, level: Number(newLevel) }),
            });

            const data = await res.json();
            if (data.success) {
                alert("更新成功");
                // 更新前端 state
                setUsers(prev =>
                    prev.map(u =>
                        u.username === username ? { ...u, level: Number(newLevel), editLevel: Number(newLevel) } : u
                    )
                );
            } else {
                alert(data.error || "更新失敗");
            }
        } catch (err) {
            console.error(err);
            alert("更新失敗");
        }
    };

    const renderPageButtons = () => {
        const maxButtons = 10;
        let start = Math.max(1, page - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

        return Array.from({ length: end - start + 1 }, (_, i) => {
            const p = start + i;
            return (
                <button
                    key={p}
                    className="admin-btn"
                    style={{ backgroundColor: p === page ? "#1565c0" : "#1976d2" }}
                    onClick={() => handlePage(p)}
                    disabled={p === page}
                >
                    {p}
                </button>
            );
        });
    };

    return (
        <>
            <button className="admin-btn" onClick={handleOpen}>
                🛡 管理使用者等級
            </button>

            {open && (
                <div className="admin-overlay" onClick={() => setOpen(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-header">
                            <h3>使用者等級管理</h3>
                            <button onClick={() => setOpen(false)}>✖</button>
                        </div>

                        {/* 搜尋 */}
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                type="text"
                                placeholder="搜尋使用者名稱"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                style={{ marginRight: "10px", padding: "4px" }}
                            />
                            <button className="admin-btn" onClick={handleSearch}>搜尋</button>
                        </div>

                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>帳號</th>
                                        <th>等級</th>
                                        <th>創建時間</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? (
                                        users.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.username}</td>
                                                <td>{u.level}</td>
                                                <td>{new Date(u.created_at).toLocaleString()}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={myLevel}
                                                        value={u.editLevel}
                                                        style={{ width: "50px", marginRight: "5px" }}
                                                        onChange={(e) => handleInputChange(u.id, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleLevelChange(u.username, u.editLevel);
                                                        }}
                                                    />
                                                    <button
                                                        className="admin-btn"
                                                        onClick={() => handleLevelChange(u.username, u.editLevel)}
                                                    >
                                                        修改
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: "center" }}>無資料</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* 分頁 */}
                            <div className="admin-pagination">
                                <button className="admin-btn" onClick={() => handlePage(page - 1)} disabled={page <= 1}>
                                    上一頁
                                </button>
                                {renderPageButtons()}
                                <button className="admin-btn" onClick={() => handlePage(page + 1)} disabled={page >= totalPages}>
                                    下一頁
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
