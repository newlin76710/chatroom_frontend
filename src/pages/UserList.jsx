// UserList.jsx
import React from "react";
import { aiAvatars } from "./aiConfig";

export default function UserList({
  userList = [],
  target,
  setTarget,
  setChatMode,
  userListCollapsed,
  setUserListCollapsed,
  kickUser,
  myLevel,
  myName,
  filteredUsers = [],
  setFilteredUsers,
  focusInput
}) {
  const formatLv = (lv) => String(lv).padStart(2, "0");
  const AML = import.meta.env.VITE_ADMIN_MIN_LEVEL || 91;
  const OPENAI = import.meta.env.VITE_OPENAI === "true";

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
        在線：{visibleUsers.length}
      </div>

      {!userListCollapsed &&
        visibleUsers.map((u, idx) => {
          const avatarUrl = u.avatar || aiAvatars[u.name];

          const canKick =
            myLevel >= AML &&
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
              {u.type === "guest" ? 1 : u.level} {u.type === "AI" && "(AI)"}

              {canKick && (
                <button
                  className="kick-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    kickUser(u.name);
                  }}
                >
                  踢出
                </button>
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
