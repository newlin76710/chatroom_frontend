// Leaderboard.jsx
import { useState } from "react";
import "./Leaderboard.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

export default function Leaderboard({ room, token }) {
  const [open, setOpen] = useState(false);
  const [rankData, setRankData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      // GET 請求，帶 room query
      const url = new URL(`${BACKEND}/api/gold-apple-leaderboard`);
      url.searchParams.append("room", room);
      url.searchParams.append("top", "10"); // 取前 10 名
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取得排行榜失敗");
      setRankData(data.leaderboard || []);
    } catch (err) {
      console.error(err);
      alert("取得排行榜失敗：" + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadLeaderboard();
  };

  return (
    <>
      <button className="announce-btn" onClick={handleOpen}>
        🏆 排行榜
      </button>

      {open && (
        <div className="gold-overlay" onClick={() => setOpen(false)}>
          <div className="gold-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gold-header">
              <h3>排行榜</h3>
              <button
                className="gold-btn"
                onClick={loadLeaderboard}
                disabled={refreshing}
              >
                {refreshing ? "更新中..." : "刷新榜單"}
              </button>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            <div className="gold-table-wrapper">
              <table className="gold-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>暱稱</th>
                    <th>金蘋果數量</th>
                  </tr>
                </thead>
                <tbody>
                  {rankData.length > 0 ? (
                    rankData.map((u, idx) => (
                      <tr key={u.username}>
                        <td>{idx + 1}</td>
                        <td>{u.username}</td>
                        <td>{u.gold_apples} <img src="/gifts/gold_apple.gif" alt="金蘋果" style={{ width: 20, height: 20, marginTop: -5 }} /> </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center" }}>
                        無資料
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}