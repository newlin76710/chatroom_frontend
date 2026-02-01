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
  filteredUsers,       // 新增：被過濾的用戶名列表
  setFilteredUsers,    // 新增：更新過濾用戶
  focusInput       
}) {
  const formatLv = (lv) => String(lv).padStart(2, "0");
  const AML = import.meta.env.VITE_ADMIN_MIN_LEVEL || 91;

  // 切換過濾 / 解除過濾
  const toggleFilter = (userName) => {
    if (filteredUsers.includes(userName)) {
      setFilteredUsers(filteredUsers.filter(u => u !== userName));
    } else {
      setFilteredUsers([...filteredUsers, userName]);
    }
  };
  const getUserColorByGender = (gender) => {
    if (gender === "男") return "#A7C7E7"; // 天空藍
    if (gender === "女") return "#F8C8DC"; // 淺粉紅
    return "#00aa00"; // 未定
  };
  return (
    <div className={`user-list ${userListCollapsed ? "collapsed" : ""}`}>
      <div
        className="user-list-header"
        onClick={() => setUserListCollapsed(!userListCollapsed)}
      >
        在線：{userList.length}
      </div>

      {!userListCollapsed &&
        userList
          .map((u, idx) => {
            const avatarUrl = u.avatar || aiAvatars[u.name];

            const canKick =
              myLevel >= AML &&          // 自己 91 等以上
              u.level < myLevel &&      // 只能踢比自己低等
              u.name !== myName &&      // 不能踢自己
              u.type !== "AI" &&
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
                  <img
                    src={avatarUrl}
                    alt={u.name}
                    className="user-avatar"
                  />
                )}

                <span
                  className="user-name"
                  style={{ color: getUserColorByGender(u.gender) }}
                >
                  {u.name}
                </span>
                &nbsp;
                [Lv.{formatLv(u.type === "guest" ? 1 : u.level)}] {u.type === "AI" && "(AI)"}

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

                {/* 過濾按鈕 */}
                <button
                  className="filter-btn"
                  style={{ marginLeft: "4px", fontSize: "0.7rem" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFilter(u.name);
                  }}
                >
                  {isFiltered ? "解除" : "過濾"}
                </button>
              </div>
            );
          })}
    </div>
  );
}
