import { useState } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

const fmt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function SurpriseHistoryPanel({ token }) {
  const [open, setOpen]     = useState(false);
  const [logs, setLogs]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND}/admin/surprise-history?page=${p}&pageSize=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch (err) {
      console.error("查詢樂透紀錄失敗", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchLogs(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!open) {
    return (
      <button className="admin-btn" onClick={handleOpen} title="金蘋果樂透紀錄">
        🎊 樂透紀錄
      </button>
    );
  }

  return (
    <div className="apple-modal">
      <div className="apple-modal-content" style={{ width: 500, maxHeight: "80vh", overflowY: "auto" }}>
        <h3 style={{ color: "#FFD700", marginBottom: 12 }}>🎊 每日金蘋果樂透紀錄</h3>

        {loading ? (
          <div style={{ color: "#aaa" }}>讀取中...</div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #444", color: "#FFD700" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>排程時間</th>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>觸發時間</th>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>得獎者</th>
                  <th style={{ textAlign: "right", padding: "4px 8px" }}>金蘋果</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "4px 8px", color: "#ccc" }}>{fmt(r.scheduled_time)}</td>
                    <td style={{ padding: "4px 8px", color: "#ccc" }}>
                      {r.triggered_at ? fmt(r.triggered_at) : <span style={{ color: "#888" }}>待觸發</span>}
                    </td>
                    <td style={{ padding: "4px 8px", color: r.winner ? "#FFD700" : "#888", fontWeight: r.winner ? "bold" : "normal" }}>
                      {r.winner || "（無人上麥）"}
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "right", color: r.winner ? "#FFD700" : "#888" }}>
                      {r.winner ? `+${r.amount} 🍎` : "—"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#888", padding: 12 }}>尚無紀錄</td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
                <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>上一頁</button>
                <span style={{ color: "#aaa" }}>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>下一頁</button>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button onClick={() => setOpen(false)}>關閉</button>
        </div>
      </div>
    </div>
  );
}
