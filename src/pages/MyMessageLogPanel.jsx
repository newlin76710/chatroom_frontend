// MyMessageLogPanel.jsx
import { useState } from "react";
import "./MessageLogPanel.css";

const BACKEND =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

const PAGE_SIZE = 20;

// local → UTC
const toUtc = (localDatetime) => {
    if (!localDatetime) return undefined;

    const normalized =
        localDatetime.length === 16
            ? localDatetime + ":00"
            : localDatetime;

    return new Date(normalized).toISOString();
};

export default function MyMessageLogPanel({ token }) {
    const [logs, setLogs] = useState([]);
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [keyword, setKeyword] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (!token) return null;

    const loadLogs = async (pageNum = 1) => {
        try {
            const body = {
                page: pageNum,
                pageSize: PAGE_SIZE,
            };

            if (keyword) body.keyword = keyword;

            const fromUtc = toUtc(fromDate);
            const toUtcDate = toUtc(toDate);

            if (fromUtc) body.from = fromUtc;
            if (toUtcDate) body.to = toUtcDate;

            const res = await fetch(`${BACKEND}/admin/my-message-logs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "查詢失敗");
                return;
            }

            setLogs(data.logs || []);
            setPage(data.page || 1);
            setTotalCount(data.total || 0);
        } catch (err) {
            console.error(err);
            alert("查詢失敗");
        }
    };

    const handleOpen = () => {
        setOpen(true);
        setPage(1);
        loadLogs(1);
    };

    const handlePage = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        loadLogs(newPage);
    };

    const renderPageButtons = () => {
        const maxButtons = 7;

        let start = Math.max(1, page - 3);
        let end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start < maxButtons - 1)
            start = Math.max(1, end - maxButtons + 1);

        const buttons = [];

        for (let i = start; i <= end; i++) {
            buttons.push(
                <button
                    key={i}
                    className="admin-btn"
                    style={{
                        backgroundColor: i === page ? "#1565c0" : "#1976d2",
                    }}
                    onClick={() => handlePage(i)}
                    disabled={i === page}
                >
                    {i}
                </button>
            );
        }

        return buttons;
    };

    return (
        <>
            <button className="announce-btn" onClick={handleOpen}>
                🧾 發言紀錄
            </button>

            {open && (
                <div className="admin-overlay" onClick={() => setOpen(false)}>
                    <div
                        className="admin-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-header">
                            <h3>我的發言紀錄</h3>
                            <button onClick={() => setOpen(false)}>✖</button>
                        </div>

                        {/* 搜尋 */}
                        <div className="admin-search">
                            <input
                                type="text"
                                placeholder="關鍵字"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />

                            <input
                                type="datetime-local"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />

                            <input
                                type="datetime-local"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />

                            <button className="admin-btn" onClick={() => loadLogs(1)}>
                                搜尋
                            </button>
                        </div>

                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>發言者</th>
                                        <th>對象</th>
                                        <th>內容</th>
                                        <th>類型</th>
                                        <th>時間</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {logs.length > 0 ? (
                                        logs.map((l) => (
                                            <tr key={l.id}>
                                                <td>{l.username}</td>
                                                <td>{l.target || "公開"}</td>

                                                <td
                                                    style={{
                                                        maxWidth: 320,
                                                        whiteSpace: "pre-wrap",
                                                    }}
                                                >
                                                    {l.message}
                                                </td>

                                                <td>
                                                    {l.mode === "private"
                                                        ? "私聊"
                                                        : "公開"}
                                                </td>

                                                <td>
                                                    {new Date(l.created_at).toLocaleString(
                                                        "zh-TW",
                                                        { hour12: false }
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: "center" }}>
                                                無資料
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="admin-pagination">
                                <button
                                    className="admin-btn"
                                    onClick={() => handlePage(page - 1)}
                                    disabled={page <= 1}
                                >
                                    上一頁
                                </button>

                                {renderPageButtons()}

                                <button
                                    className="admin-btn"
                                    onClick={() => handlePage(page + 1)}
                                    disabled={page >= totalPages}
                                >
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
