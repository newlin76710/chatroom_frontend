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
  const [mode, setMode] = useState("guest"); // guest | login | register | edit
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("女");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("/avatars/g01.gif"); // 頭像
  const [editLoggedIn, setEditLoggedIn] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const defaultAvatar = Object.values(aiAvatars)[0];

  // 讀取已登入的使用者資料
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
  useEffect(() => {
    if (mode === "register") {
      setAvatar(Object.values(aiAvatars)[0]);
    }
  }, [mode]);

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

      // 帶入修改模式資料
      setUsername(data.name);
      setGender(data.gender);
      setAvatar(data.avatar || "");

      navigate("/chat");
    } catch (e) {
      alert("帳號登入失敗：" + e.message);
    }
  };

  const registerAccount = async () => {
    if (!username || !password || !confirmPassword) return alert("請填寫帳號與密碼");
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
    try {
      const token = sessionStorage.getItem("token") || sessionStorage.getItem("guestToken");
      if (!token) return alert("請先登入");
      if (password && password !== confirmPassword) {
        return alert("兩次密碼輸入不一致");
      }
      const res = await fetch(`${BACKEND}/auth/updateProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ username, password, gender, avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失敗");

      alert("資料更新成功！");
      // 更新 sessionStorage
      sessionStorage.setItem("name", username);
      sessionStorage.setItem("gender", gender);
      sessionStorage.setItem("avatar", avatar);
    } catch (e) {
      alert("修改失敗：" + e.message);
    }
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 10 }}>{CN}聊天室</h2>
      <div style={{ textAlign: "center", color: "#aaa", fontSize: 14 }}>
        聊天越多，等級越高（最高 Lv.90）
      </div>

      {/* 模式切換 */}
      <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
        {["guest", "login", "register", "edit"].map((m) => (
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
                  : "修改資料"}
          </button>
        ))}
      </div>

      {/* 性別選擇 */}
      {(mode === "guest" || mode === "register") && (
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

      {/* 帳號登入/註冊/修改表單 */}
      {(mode === "login" || mode === "register") && (
        <>
          <input
            style={inputStyle}
            placeholder="暱稱"
            value={username}
            onChange={handleUsernameChange}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder={mode === "edit" ? "密碼（不改可留空）" : "密碼"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      )}
      {(mode === "register") && (
        <>
          <input
            style={inputStyle}
            type="password"
            placeholder="再次輸入密碼"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </>
      )}

      {mode === "register" && (
        <>
          <input
            style={inputStyle}
            placeholder="手機（選填）"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Email（選填）"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </>
      )}

      {/* 頭像選擇 */}
      {(mode === "register") && (
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

      {/* 送出按鈕 */}
      {mode === "guest" && (
        <>
          <input
            style={inputStyle}
            placeholder="輸入暱稱"
            value={username}
            onChange={handleUsernameChange}
          />
          <button style={buttonStyle} onClick={guestLogin}>
            以訪客身分進入
          </button>
        </>
      )}

      {mode === "login" && <button style={buttonStyle} onClick={accountLogin}>登入聊天室</button>}
      {mode === "register" && <button style={buttonStyle} onClick={registerAccount}>建立帳號</button>}
      {mode === "edit" && (
        <>
          {!editLoggedIn ? (
            // 尚未登入，顯示帳號登入表單
            <>
              <h3>請先登入帳號以修改資料</h3>
              <input
                style={inputStyle}
                placeholder="帳號"
                value={username}
                onChange={handleUsernameChange}
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                style={buttonStyle}
                onClick={async () => {
                  if (!username || !password) return alert("請輸入帳號與密碼");
                  try {
                    const res = await fetch(`${BACKEND}/auth/login`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ username, password, gender }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "登入失敗");

                    // 帳號登入成功
                    sessionStorage.setItem("token", data.token);
                    sessionStorage.setItem("name", data.name);
                    sessionStorage.setItem("gender", data.gender);
                    sessionStorage.setItem("avatar", data.avatar || "");
                    sessionStorage.setItem("type", "account");

                    setUsername(data.name);
                    setGender(data.gender);
                    setAvatar(data.avatar || "");

                    setEditLoggedIn(true); // 開放修改資料表單
                  } catch (e) {
                    alert("登入失敗：" + e.message);
                  }
                }}
              >
                登入
              </button>
            </>
          ) : (
            // 已登入，顯示修改表單
            <>
              <h3>修改資料</h3>
              {/* 性別選擇 */}
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
              <input
                style={inputStyle}
                placeholder="暱稱"
                value={username}
                onChange={handleUsernameChange}
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="密碼（不改可留空）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="再次輸入新密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {/* 頭像選擇 */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 6 }}>選擇頭像：</div>
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

              <button style={buttonStyle} onClick={updateProfile}>
                儲存修改
              </button>
            </>
          )}
        </>
      )}

    </div>
  );
}
