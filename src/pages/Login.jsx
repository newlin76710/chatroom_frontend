import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aiAvatars } from "./aiConfig";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const CN = import.meta.env.VITE_CHATROOM_NAME || "聽風的歌";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  borderRadius: 6,
  border: "1px solid #333",
  background: "#121212",
  color: "#fff",
  fontSize: "0.95rem",
};

const buttonStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: 6,
  border: "none",
  background: "#ff66aa",
  color: "#000",
  fontWeight: "bold",
  cursor: "pointer",
};

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("guest"); // guest | login | register | edit | forgot
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("女");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("/avatars/g01.gif");
  const [editLoggedIn, setEditLoggedIn] = useState(false);

  useEffect(() => {
    const type = sessionStorage.getItem("type");
    if (type) {
      const name = sessionStorage.getItem("name") || "";
      const g = sessionStorage.getItem("gender") || "女";
      const a = sessionStorage.getItem("avatar") || "";
      setUsername(name);
      setGender(g);
      setAvatar(a);
    }
  }, []);

  const handleUsernameChange = (e) => setUsername(e.target.value);

  // ----- API 行為 -----
  const guestLogin = async () => {
    if (!username) return alert("請輸入暱稱");
    try {
      const res = await fetch(`${BACKEND}/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "訪客登入失敗");

      sessionStorage.setItem("guestToken", data.guestToken);
      sessionStorage.setItem("name", data.name);
      sessionStorage.setItem("gender", data.gender);
      sessionStorage.setItem("last_login", data.last_login);
      sessionStorage.setItem("type", "guest");
      navigate("/chat");
    } catch (e) {
      alert("訪客登入失敗：" + e.message);
    }
  };

  const accountLogin = async () => {
    if (!username || !password) return alert("請輸入帳號與密碼");
    try {
      const res = await fetch(`${BACKEND}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登入失敗");

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("name", data.name);
      sessionStorage.setItem("gender", data.gender);
      sessionStorage.setItem("avatar", data.avatar || "");
      sessionStorage.setItem("last_login", data.last_login);
      sessionStorage.setItem("type", "account");

      setUsername(data.name);
      setGender(data.gender);
      setAvatar(data.avatar || "");
      navigate("/chat");
    } catch (e) {
      alert("登入失敗：" + e.message);
    }
  };

  const registerAccount = async () => {
    if (!username || !password || !confirmPassword || !phone || !email)
      return alert("請填寫完整資料");
    if (password !== confirmPassword) return alert("兩次密碼輸入不一致");
    try {
      const res = await fetch(`${BACKEND}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, gender, phone, email, avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "註冊失敗");
      alert("註冊成功，請登入");
      setMode("login");
    } catch (e) {
      alert("註冊失敗：" + e.message);
    }
  };

  const updateProfile = async () => {
    if (!username || !phone || !email) return alert("暱稱、手機、Email 為必填");
    if (password && password !== confirmPassword) return alert("兩次密碼輸入不一致");
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return alert("請先登入");

      const res = await fetch(`${BACKEND}/auth/updateProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password, gender, avatar, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失敗");

      alert("資料更新成功！");
      sessionStorage.setItem("name", username);
      sessionStorage.setItem("gender", gender);
      sessionStorage.setItem("avatar", avatar);
    } catch (e) {
      alert("修改失敗：" + e.message);
    }
  };

  const forgotPassword = async () => {
    if (!username || !phone || !email) return alert("請填寫帳號、手機與 Email");
    try {
      const res = await fetch(`${BACKEND}/auth/forgotPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "忘記密碼失敗");
      alert(`密碼已重置！新密碼：${data.newPassword}`);
      setMode("login");
    } catch (e) {
      alert("忘記密碼失敗：" + e.message);
    }
  };

  // ----- JSX -----
  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 10 }}>{CN}聊天室</h2>
      <div style={{ textAlign: "center", color: "#aaa", fontSize: 14 }}>
        聊天越多，等級越高（最高 Lv.90）
      </div>

      {/* 模式切換 */}
      <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
        {["guest", "login", "register", "edit", "forgot"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: "1px solid #333",
              background: mode === m ? "#ff66aa" : "#1e1e1e",
              color: mode === m ? "#000" : "#aaa",
              cursor: "pointer",
            }}
          >
            {m === "guest"
              ? "訪客"
              : m === "login"
                ? "登入"
                : m === "register"
                  ? "註冊"
                  : m === "edit"
                    ? "修改資料"
                    : "忘記密碼"}
          </button>
        ))}
      </div>

      {/* edit 模式需要先登入 */}
      {mode === "edit" && !editLoggedIn && (
        <>
          <h3>請先登入帳號以修改資料</h3>
          <input style={inputStyle} placeholder="帳號" value={username} onChange={handleUsernameChange} />
          <input style={inputStyle} type="password" placeholder="密碼" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={buttonStyle} onClick={async () => {
            if (!username || !password) return alert("請輸入帳號與密碼");
            try {
              const res = await fetch(`${BACKEND}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, allowProfileIncomplete: true }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "登入失敗");

              sessionStorage.setItem("token", data.token);
              sessionStorage.setItem("name", data.name);
              sessionStorage.setItem("gender", data.gender);
              sessionStorage.setItem("avatar", data.avatar || "");
              sessionStorage.setItem("type", "account");

              setUsername(data.name);
              setGender(data.gender);
              setAvatar(data.avatar || "");
              setEditLoggedIn(true);
            } catch (e) {
              alert("登入失敗：" + e.message);
            }
          }}>登入</button>
        </>
      )}

      {/* 表單 */}
      {(mode !== "edit" || editLoggedIn) && (
        <>
          {(mode === "register" || (mode === "edit" && editLoggedIn) || mode === "guest") && (
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[
                { v: "女", label: "♀ 女生", color: "#ff4d6d" },
                { v: "男", label: "♂ 男生", color: "#4da6ff" },
              ].map((g) => {
                const active = gender === g.v;
                return (
                  <label
                    key={g.v}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "10px 0",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: "bold",
                      color: active ? "#000" : "#aaa",
                      background: active ? g.color : "#1e1e1e",
                      border: `1px solid ${active ? g.color : "#333"}`,
                      transition: "all .2s ease",
                    }}
                  >
                    <input
                      type="radio"
                      value={g.v}
                      checked={gender === g.v}
                      onChange={() => setGender(g.v)}
                      style={{ display: "none" }}
                    />
                    <span style={{ fontSize: 18, marginRight: 6 }}>
                      {g.v === "女" ? "♀" : "♂"}
                    </span>
                    {g.v === "女" ? "女生" : "男生"}
                  </label>
                );
              })}
            </div>
          )}
          {(mode === "guest" || mode === "login" || mode === "register" || (mode === "edit" && editLoggedIn) || mode === "forgot") && (
            <input style={inputStyle} placeholder="暱稱 / 帳號" value={username} onChange={handleUsernameChange} />
          )}
          {(mode === "login" || mode === "register" || (mode === "edit" && editLoggedIn)) && (
            <>
              <input style={inputStyle} type="password" placeholder={mode === "edit" ? "密碼（不改可留空）" : "密碼"} value={password} onChange={(e) => setPassword(e.target.value)} />
              {(mode === "register" || (mode === "edit" && editLoggedIn)) && (
                <input style={inputStyle} type="password" placeholder="再次輸入密碼" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              )}
            </>
          )}
          {(mode === "register" || (mode === "edit" && editLoggedIn) || mode === "forgot") && (
            <>
              <input style={inputStyle} placeholder="手機（必填）" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input style={inputStyle} placeholder="Email（必填）" value={email} onChange={(e) => setEmail(e.target.value)} />
            </>
          )}

          {/* 頭像選擇 */}
          {(mode === "register" || (mode === "edit" && editLoggedIn)) && (
            <div style={{ margin: "10px 0" }}>
              <div style={{ marginBottom: 6, color: "#aaa" }}>選擇頭像：</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(aiAvatars).map(([name, url]) => (
                  <img
                    key={name}
                    src={url}
                    alt={name}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      border: avatar === url ? "2px solid #ff66aa" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setAvatar(url)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 按鈕 */}
          {mode === "guest" && <button style={buttonStyle} onClick={guestLogin}>以訪客進入</button>}
          {mode === "login" && <button style={buttonStyle} onClick={accountLogin}>登入聊天室</button>}
          {mode === "register" && <button style={buttonStyle} onClick={registerAccount}>建立帳號</button>}
          {mode === "edit" && editLoggedIn && <button style={buttonStyle} onClick={updateProfile}>儲存修改</button>}
          {mode === "forgot" && <button style={buttonStyle} onClick={forgotPassword}>重置密碼</button>}
          {mode === "edit" && editLoggedIn && (
            <button
              style={{ ...buttonStyle, background: "#555", marginTop: 8 }}
              onClick={async () => {
                const token = sessionStorage.getItem("token");
                try {
                  if (token) {
                    await fetch(`${BACKEND}/auth/logout`, {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({ username: sessionStorage.getItem("name") })
                    });
                  }
                } catch (e) {
                  console.warn("登出失敗，但仍清掉前端狀態", e);
                } finally {
                  // 清掉前端登入狀態
                  sessionStorage.clear();
                  setEditLoggedIn(false);
                  setUsername("");
                  setPassword("");
                  setConfirmPassword("");
                  setPhone("");
                  setEmail("");
                  setGender("女");
                  setAvatar("/avatars/g01.gif");
                }
              }}
            >
              登出 / 切換帳號
            </button>
          )}
        </>
      )}
    </div>
  );
}