import { useState, useEffect } from "react";
import "./Leaderboard.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

export default function Leaderboard({ room, token }) {
  const [open, setOpen] = useState(false);
  const [rankData, setRankData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState("gold_apples"); // gold_apples / charm / firework / exp
  const [range, setRange] = useState("total");   // monthly / lastMonth / total
  const CHARM_TYPES = ["rose", "chocolate", "cake"];

  const loadLeaderboard = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      let url;
      if (type === "exp") {
        url = new URL(`${BACKEND}/api/exp-leaderboard`);
        url.searchParams.append("top", "10");
      } else {
        url = new URL(`${BACKEND}/api/gold-apple-leaderboard`);
        url.searchParams.append("top", "10");
        // 魅力榜：用 rose 代表三合一查詢（後端統一處理）
        url.searchParams.append("type", type === "charm" ? "rose" : type);
        url.searchParams.append("range", range);
      }
      url.searchParams.append("room", room);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取得排行榜失敗");

      const rows = data.leaderboard?.map(u => ({
        username: u.username,
        amount: u.amount ?? u.gold_apples ?? u.exp ?? 0,
        level: u.level ?? null,
        // 魅力榜專用
        rose:      u.rose ?? null,
        chocolate: u.chocolate ?? null,
        cake:      u.cake ?? null,
        total:     u.total ?? null,
      })) || [];

      setRankData(rows);
    } catch (err) {
      console.error(err);
      alert("取得排行榜失敗：" + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (type === "exp") setRange("total");
    if (open) loadLeaderboard();
  }, [type, range, open]);

  const handleOpen = () => {
    setOpen(true);
    loadLeaderboard();
  };

  // 標題依 type 動態改
  const isCharm = type === "charm";

  const getTitle = () => {
    switch (type) {
      case "gold_apples": return "財富榜";
      case "charm":       return "魅力榜";
      case "firework":    return "煙火榜";
      case "exp":         return "積分榜";
      default:            return "排行榜";
    }
  };

  return (
    <>
      <button className="announce-btn" onClick={handleOpen}>
        🏆 排行榜
      </button>

      {open && (
        <div className="gold-overlay" onClick={() => setOpen(false)}>
          <div className="gold-modal" onClick={e => e.stopPropagation()}>
            <div className="gold-header">
              <h3>{getTitle()}</h3>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select value={type} onChange={e => setType(e.target.value)}>
                  <option value="gold_apples">金蘋果</option>
                  <option value="charm">魅力(玫瑰+巧克力+蛋糕)</option>
                  <option value="firework">煙火</option>
                  <option value="exp">積分</option>
                </select>
                {type !== "exp" && (
                  <select value={range} onChange={e => setRange(e.target.value)}>
                    <option value="total">總量</option>
                    <option value="monthly">本月</option>
                    <option value="lastMonth">上月</option>
                  </select>
                )}
                <button className="gold-btn" onClick={loadLeaderboard} disabled={refreshing}>
                  {refreshing ? "更新中..." : "刷新榜單"}
                </button>
              </div>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            <div className="gold-table-wrapper">
              <table className="gold-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>暱稱</th>
                    {isCharm ? (
                      <>
                        <th>🌹 玫瑰</th>
                        <th>🍫 巧克力</th>
                        <th>🎂 蛋糕</th>
                        <th>魅力總計</th>
                      </>
                    ) : (
                      <th>
                        {type === "gold_apples" ? "金蘋果數量" :
                         type === "firework" ? "煙火數量" :
                         "等級(積分)"}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rankData.length > 0 ? (
                    rankData.map((u, idx) => (
                      <tr key={u.username}>
                        <td>{idx + 1}</td>
                        <td>{u.username}</td>
                        {isCharm ? (
                          <>
                            <td>{u.rose ?? 0}</td>
                            <td>{u.chocolate ?? 0}</td>
                            <td>{u.cake ?? 0}</td>
                            <td><strong>{u.total ?? 0}</strong></td>
                          </>
                        ) : (
                          <td>
                            {type === "exp" ? `等級 ${u.level} (${u.amount})` : u.amount}
                            {type === "gold_apples" && <img src="/gifts/gold_apple.gif" alt="金蘋果" style={{ width: 20, height: 20, marginTop: -5 }} />}
                            {type === "firework" && "🎆"}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isCharm ? 6 : 3} style={{ textAlign: "center" }}>無資料</td>
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