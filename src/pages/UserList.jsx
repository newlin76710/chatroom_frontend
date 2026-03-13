// UserList.jsx
import React from "react";
import { aiAvatars } from "./aiConfig";
import "./UserList.css";

export default function UserList({
  userList = [],
  target,
  setTarget,
  setChatMode,
  userListCollapsed,
  setUserListCollapsed,
  kickUser,
  muteUser,
  myLevel,
  myName,
  filteredUsers = [],
  setFilteredUsers,
  focusInput
}) {
  const formatLv = (lv) => String(lv).padStart(2, "0");
  const ANL = import.meta.env.VITE_ADMIN_MIN_LEVEL || 91;
  const OPENAI = import.meta.env.VITE_OPENAI === "true";
  const [openMenu, setOpenMenu] = React.useState(null);

  const toggleAdminMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };
  // 依照 OPENAI 過濾 AI
  const visibleUsers = userList.filter(u => OPENAI || u.type !== "AI");

  const toggleFilter = (userName) => {
    if (!setFilteredUsers) return;

    if (filteredUsers.includes(userName)) {
      setFilteredUsers(filteredUsers.filter(u => u !== userName));
    } else {
      setFilteredUsers([...filteredUsers, userName]);
    }
  };

  const getUserColorByGender = (gender) => {
    if (gender === "男") return "#A7C7E7";
    if (gender === "女") return "#F8C8DC";
    return "#00aa00";
  };

  return (
    <div className={`user-list ${userListCollapsed ? "collapsed" : ""}`}>
      <div
        className="user-list-header"
        onClick={() => setUserListCollapsed(!userListCollapsed)}
      >
        在線：{visibleUsers.length} 人
      </div>

      {!userListCollapsed &&
        visibleUsers.map((u, idx) => {
          const avatarUrl = u.avatar || aiAvatars[u.name];

          const canKick =
            myLevel >= ANL &&
            u.level < myLevel &&
            u.name !== myName &&
            kickUser;

          const isFiltered = filteredUsers.includes(u.name);

          return (
            <div
              key={`${u.name}-${idx}`}
              className={`user-item ${u.name === target ? "selected" : ""}`}
              onClick={() => {
                setChatMode("private");
                setTarget(u.name);
                focusInput?.();
              }}
            >
              {avatarUrl && (
                <img src={avatarUrl} alt={u.name} className="user-avatar" />
              )}

              <span
                className="user-name"
                style={{ color: getUserColorByGender(u.gender) }}
              >
                {u.name}
              </span>
              &nbsp;
              {u.type === "AI" ? "AI" : u.type === "guest" ? 1 : u.level} 

              {canKick && (
                <div className="ul-admin-wrap">
                  <button
                    className="ul-admin-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAdminMenu(u.name);
                    }}
                  >
                    管理
                  </button>

                  {openMenu === u.name && (
                    <div className="ul-admin-panel">
                      <button
                        className="ul-admin-kick"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`確定踢出 ${u.name}?`)) {
                            kickUser(u.name);
                          }
                        }}
                      >
                        👢 踢出
                      </button>

                      <button
                        className="ul-admin-mute"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`禁言 ${u.name} 30秒?`)) {
                            muteUser(u.name);
                          }
                        }}
                      >
                        🔇 禁言30秒
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 過濾按鈕，不管 OPENAI */}
              {setFilteredUsers && (
                <button
                  className="filter-btn"
                  style={{
                    marginLeft: "1px", fontSize: "0.7rem",
                    backgroundColor: "#1976d2",
                    color: "white",
                    borderColor: "#1976d2"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFilter(u.name);
                  }}
                >
                  {isFiltered ? "解除" : "過濾"}
                </button>
              )
              }
            </div>
          );
        })}
    </div >
  );
}
