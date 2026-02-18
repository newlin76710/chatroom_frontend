import { useState, useEffect } from "react";
import AdminLoginLogPanel from "./AdminLoginLogPanel";
import MessageLogPanel from "./MessageLogPanel";
import AdminLevelPanel from "./AdminLevelPanel";
import AdminIPPanel from "./AdminIPPanel";
import AdminNicknamePanel from "./AdminNicknamePanel";
import "./AdminToolPanel.css";

const AML = import.meta.env.VITE_ADMIN_MAX_LEVEL || 99;
const ANL = import.meta.env.VITE_ADMIN_MIN_LEVEL || 91;

export default function AdminToolPanel({ myName, myLevel, token, userList }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("login"); // default

  // ⭐ 用 useEffect 在 mount 或 myLevel 改變時設定初始 tab
  useEffect(() => {
    if (myLevel >= ANL && myLevel < AML) {
      setTab("nickname");
    } else if (myLevel >= AML) {
      setTab("login");
    }
  }, [myLevel]);

  if (myLevel < ANL) return null;

  return (
    <div className="admin-tool">
      <button className="admin-btn" onClick={() => setOpen(o => !o)}>
        🛡 管理
      </button>

      {open && (
        <div className={`admin-popup ${myLevel < AML ? "small" : ""}`}>
          {/* Tabs */}
          <div className="admin-tabs">
            {myLevel >= AML && (
              <>
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
              </>
            )}

            {myLevel >= ANL && (
              <button
                className={tab === "nickname" ? "active" : ""}
                onClick={() => setTab("nickname")}
              >
                暱稱管理
              </button>
            )}
          </div>

          {/* Content */}
          <div className="admin-content">
            {tab === "login" && <AdminLoginLogPanel token={token} />}
            {tab === "message" && <MessageLogPanel myName={myName} myLevel={myLevel} token={token} userList={userList}/>}
            {tab === "level" && <AdminLevelPanel token={token} myLevel={myLevel} />}
            {tab === "ip" && <AdminIPPanel token={token} />}
            {tab === "nickname" && <AdminNicknamePanel myLevel={myLevel} token={token} myName={myName} />}
          </div>
        </div>
      )}
    </div>
  );
}
