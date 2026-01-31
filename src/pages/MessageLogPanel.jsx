// MessageLogPanel.jsx
import { useState } from "react";
import "./MessageLogPanel.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const PAGE_SIZE = 20;

/**
 * 將「台灣日期」轉成 UTC ISO 字串
 * @param {string} dateStr YYYY-MM-DD
 * @param {boolean} endOfDay 是否為當日結尾
 */
const toUtcISOString = (dateStr, endOfDay = false) => {
  if (!dateStr) return undefined;

  // 台灣時間 UTC+8
  const date = new Date(
    `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}+08:00`
  );

  return date.toISOString(); // 轉成 UTC
};

export default function MessageLogPanel({
  myName,
  myLevel,
  minLevel,
  token,
  userList = [],
}) {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchUsername, setSearchUsername] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchTarget, setSearchTarget] = useState("");

  // ⭐ 日期區間（台灣日期）
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!token || myLevel < minLevel) return null;

  const loadLogs = async (pageNum = 1) => {
    try {
      const body = {
        page: pageNum,
        pageSize: PAGE_SIZE,
        username: searchUsername || undefined,
        target: searchTarget || undefined,
        keyword: searchKeyword || undefined,
      };

      // ⭐ 關鍵：台灣時間 → UTC
      if (fromDate) body.from = toUtcISOString(fromDate);
      if (toDate) body.to = toUtcISOString(toDate, true);

      const res = await fetch(`${BACKEND}/admin/message-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "查詢失敗");
        return;
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setPage(data.page || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error(err);
      alert("查詢發言紀錄失敗");
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

  const handleSearch = () => {
    setPage(1);
    loadLogs(1);
  };

  const renderPageButtons = () => {
    const maxButtons = 10;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start < maxButtons - 1)
      start = Math.max(1, end - maxButtons + 1);

    const buttons = [];
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          className="admin-btn"
          style={{ backgroundColor: i === page ? "#1565c0" : "#1976d2" }}
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
      <button className="admin-btn" onClick={handleOpen}>
        💬 管理發言紀錄
      </button>

      {open && (
        <div className="admin-overlay" onClick={() => setOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-header">
              <h3>發言紀錄</h3>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            {/* 搜尋 + 日期區 */}
            <div className="admin-search">
              <input
                type="text"
                placeholder="使用者"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
              />

              <select
                value={searchTarget}
                onChange={(e) => setSearchTarget(e.target.value)}
              >
                <option value="">全部對象</option>
                {userList
                  .filter((u) => u.type !== "AI")
                  .map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
              </select>

              <input
                type="text"
                className="keyword"
                placeholder="關鍵字"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />

              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />

              <button className="admin-btn" onClick={handleSearch}>
                搜尋
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>使用者</th>
                    <th>對象</th>
                    <th>內容</th>
                    <th>類型</th>
                    <th>IP</th>
                    <th>時間（台灣）</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((l) => (
                      <tr key={l.id}>
                        <td>{l.username}</td>
                        <td>{l.target || "-"}</td>
                        <td
                          style={{
                            maxWidth: 300,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {l.message}
                        </td>
                        <td>{l.mode === "private" ? "私聊" : "公開"}</td>
                        <td>{l.ip || "-"}</td>
                        <td>
                          {new Date(l.created_at).toLocaleString("zh-TW", {
                            hour12: false,
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center" }}>
                        無資料
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 分頁 */}
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
