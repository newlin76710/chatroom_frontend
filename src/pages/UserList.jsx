// UserList.jsx
import React from "react";
import { aiAvatars } from "./aiConfig";

export default function UserList({
  userList = [],
  target,
  setTarget,
  setChatMode,
  userListCollapsed,
  setUserListCollapsed
}) {
  const formatLv = (lv) => String(lv).padStart(2, "0");

  return (
    <div className={`user-list ${userListCollapsed ? "collapsed" : ""}`}>
      <div className="user-list-header" onClick={() => setUserListCollapsed(!userListCollapsed)}>
        在線：{userList.length}
      </div>
      {!userListCollapsed &&
        userList.map((u) => {
          // 先用使用者自訂 avatar，沒有才用 AI avatar
          const avatarUrl = u.avatar || aiAvatars[u.name];

          return (
            <div
              key={u.id}
              className={`user-item ${u.name === target ? "selected" : ""}`}
              onClick={() => { setChatMode("private"); setTarget(u.name); }}
            >
              {avatarUrl && <img src={avatarUrl} alt={u.name} className="user-avatar" />}
              {u.name} [Lv.{formatLv(u.level)}] ({u.gender})
            </div>
          );
        })
      }
    </div>
  );
}
