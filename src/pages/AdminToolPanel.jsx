import { useState } from "react";
import AdminLoginLogPanel from "./AdminLoginLogPanel";
import MessageLogPanel from "./MessageLogPanel";
import AdminLevelPanel from "./AdminLevelPanel"; // ⭐ 新增
import AdminIPPanel from "./AdminIPPanel";   // ⭐ 新增
import "./AdminToolPanel.css";

export default function AdminToolPanel({ myLevel, minLevel, token }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("login"); // login | message | level | ip

  if (myLevel < minLevel) return null;

  return (
    <div className="admin-tool">
      <button className="admin-btn" onClick={() => setOpen(o => !o)}>
        🛡 管理
      </button>

      {open && (
        <div className="admin-popup">
          {/* Tabs */}
          <div className="admin-tabs">
            <button
              className={tab === "login" ? "active" : ""}
              onClick={() => setTab("login")}
            >
              登入紀錄
            </button>
            <button
              className={tab === "message" ? "active" : ""}
              onClick={() => setTab("message")}
            >
              發言紀錄
            </button>
            <button
              className={tab === "level" ? "active" : ""}
              onClick={() => setTab("level")}
            >
              等級管理
            </button>
            <button
              className={tab === "ip" ? "active" : ""}
              onClick={() => setTab("ip")}
            >
              IP 管制
            </button>
          </div>

          {/* Content */}
          <div className="admin-content">
            {tab === "login" && <AdminLoginLogPanel token={token} />}
            {tab === "message" && <MessageLogPanel token={token} />}
            {tab === "level" && <AdminLevelPanel token={token} myLevel={myLevel} />}
            {tab === "ip" && <AdminIPPanel token={token} />}
          </div>
        </div>
      )}
    </div>
  );
}
