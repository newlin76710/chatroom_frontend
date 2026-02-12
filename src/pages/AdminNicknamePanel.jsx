import { useEffect, useState } from "react";
import "./AdminLoginLogPanel.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const AML = import.meta.env.VITE_ADMIN_MIN_LEVEL || 91;
const PAGE_SIZE = 20;

export default function AdminNicknamePanel({ myLevel, token, myName }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [nickname, setNickname] = useState("");
  const [reason, setReason] = useState("");

  if (myLevel < AML) return null;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 載入黑名單列表
  const load = async (pageNum = 1) => {
    try {
      const res = await fetch(`${BACKEND}/api/blocked-nicknames`, {
        headers,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setList(data);
      setPage(pageNum);
      setTotalCount(data.length);
    } catch (err) {
      console.error(err);
      alert("載入暱稱黑名單失敗");
    }
  };

  useEffect(() => {
    if (open) load(1);
  }, [open]);

  // 新增黑名單
  const block = async () => {
    if (!nickname.trim()) return;

    try {
      const res = await fetch(`${BACKEND}/api/blocked-nicknames/block`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          nickname: nickname.trim(),
          reason: reason.trim(),
          executor: myName || "未知管理員", // 送執行者
        }),
      });

      if (!res.ok) throw new Error();

      setNickname("");
      setReason("");
      load(1);
    } catch (err) {
      console.error(err);
      alert("新增失敗");
    }
  };

  // 解除黑名單
  const unblock = async (id) => {
    if (!confirm("確定解除？")) return;

    try {
      const res = await fetch(`${BACKEND}/api/blocked-nicknames/unblock`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error();
      load(page);
    } catch (err) {
      console.error(err);
      alert("解除失敗");
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderPageButtons = () => {
    const maxButtons = 10;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

    const btns = [];
    for (let i = start; i <= end; i++) {
      btns.push(
        <button
          key={i}
          className="admin-btn"
          style={{ backgroundColor: i === page ? "#1565c0" : "#1976d2" }}
          disabled={i === page}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }
    return btns;
  };

  return (
    <>
      <button className="admin-btn" onClick={() => setOpen(true)}>
        🚫 暱稱黑名單
      </button>

      {open && (
        <div className="admin-overlay" onClick={() => setOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-header">
              <h3>暱稱黑名單管理</h3>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            {/* 新增黑名單 */}
            <div style={{ marginBottom: 8 }}>
              <input
                placeholder="輸入暱稱"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={{ width: 140, marginRight: 4 }}
              />
              <input
                placeholder="原因"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: 120, marginRight: 4 }}
              />
              <button onClick={block}>加入黑名單</button>
            </div>

            {/* 黑名單表格 */}
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>暱稱</th>
                    <th>原因</th>
                    <th>執行者</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length > 0 ? (
                    list
                      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                      .map((row) => (
                        <tr key={row.id}>
                          <td>{row.nickname}</td>
                          <td>{row.reason || "-"}</td>
                          <td>{row.executor || "-"}</td>
                          <td>
                            <button onClick={() => unblock(row.id)}>解除</button>
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

              {/* 分頁 */}
              <div className="admin-pagination">
                <button
                  className="admin-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一頁
                </button>

                {renderPageButtons()}

                <button
                  className="admin-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
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
