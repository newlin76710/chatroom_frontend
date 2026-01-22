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
  kickUser, // 新增 kickUser prop
  myLevel, // 新增自己等級
  myName   // 新增自己名字
}) {
  const formatLv = (lv) => String(lv).padStart(2, "0");
  //console.log("userList:", userList);
  return (
    <div className={`user-list ${userListCollapsed ? "collapsed" : ""}`}>
      <div
        className="user-list-header"
        onClick={() => setUserListCollapsed(!userListCollapsed)}
      >
        在線：{userList.length}
      </div>

      {!userListCollapsed &&
        userList.map((u, idx) => {
          const avatarUrl = u.avatar || aiAvatars[u.name];
          //console.log(userList)
          return (
            <div
              key={`${u.name}-${idx}`} // 修正 key 問題
              className={`user-item ${u.name === target ? "selected" : ""}`}
              onClick={() => {
                setChatMode("private");
                setTarget(u.name);
              }}
            >
              {avatarUrl && (
                <img src={avatarUrl} alt={u.name} className="user-avatar" />
              )}
              {u.name} [Lv.{formatLv(u.level)}] ({u.gender})

              {/* 如果自己是 99 等，才顯示踢人按鈕 */}
              {myLevel === 99 && u.name !== myName && u.type !== "AI" && kickUser && (
                <button
                  className="kick-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // 防止觸發選擇私聊
                    console.log("kickUser clicked:", u.name);
                    kickUser(u.name);
                  }}
                >
                  踢出
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}
