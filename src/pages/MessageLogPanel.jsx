// MessageLogPanel.jsx
import { useState } from "react";
import "./MessageLogPanel.css";

const BACKEND =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const AML = import.meta.env.VITE_ADMIN_MAX_LEVEL || 99;
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

export default function MessageLogPanel({
  myName,
  myLevel,
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

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!token || myLevel < AML) return null;

  const loadLogs = async (pageNum = 1) => {
    try {
      const body = {
        page: pageNum,
        pageSize: PAGE_SIZE,
      };

      if (searchUsername) body.username = searchUsername;
      if (searchTarget) body.target = searchTarget;
      if (searchKeyword) body.keyword = searchKeyword;

      const fromUtc = toUtc(fromDate);
      const toUtcDate = toUtc(toDate);

      if (fromUtc) body.from = fromUtc;
      if (toUtcDate) body.to = toUtcDate;

      const res = await fetch(`${BACKEND}/admin/message-logs`, {
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
      alert("查詢發言紀錄失敗");
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setPage(1);
    //loadLogs(1); // 打開時直接查詢
  };

  const handlePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    loadLogs(newPage);
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
      <button className="admin-btn" onClick={handleOpen}>
        💬 管理發言紀錄
      </button>

      {open && (
        <div className="admin-overlay" onClick={() => setOpen(false)}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-header">
              <h3>發言紀錄</h3>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            {/* 搜尋區 */}
            <div className="admin-search">
              <input
                type="text"
                placeholder="使用者"
                value={searchUsername}
                onChange={(e) =>
                  setSearchUsername(e.target.value)
                }
              />

              <select
                value={searchTarget}
                onChange={(e) =>
                  setSearchTarget(e.target.value)
                }
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
                onChange={(e) =>
                  setSearchKeyword(e.target.value)
                }
              />

              {/* datetime-local */}
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
              />

              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
              />

              <button
                className="admin-btn"
                onClick={() => loadLogs(1)}
              >
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

                        <td>
                          {l.mode === "private"
                            ? "私聊"
                            : "公開"}
                        </td>

                        <td>{l.ip || "-"}</td>

                        <td>
                          {new Date(l.created_at).toLocaleString("zh-TW", {hour12: false,})}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center" }}
                      >
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
