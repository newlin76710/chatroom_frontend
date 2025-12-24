// Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aiAvatars } from "./aiConfig"; // AI 預設頭像列表

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

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
  const [mode, setMode] = useState("guest"); // guest | login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("女");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(""); // 頭像

  // 檢查是否被禁止登入
  useEffect(() => {
    const blockedUntil = sessionStorage.getItem("blockedUntil");
    if (blockedUntil && Date.now() < parseInt(blockedUntil)) {
      alert("你剛剛被踢出，請等待 5 秒後再登入");
    }
  }, []);

  // 訪客登入
  const guestLogin = async () => {
    const blockedUntil = sessionStorage.getItem("blockedUntil");
    if (blockedUntil && Date.now() < parseInt(blockedUntil)) {
      return alert("你剛剛被踢出，請等待 5 秒後再登入");
    }

    try {
      const res = await fetch(`${BACKEND}/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender }),
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

  // 帳號登入
  const accountLogin = async () => {
    const blockedUntil = sessionStorage.getItem("blockedUntil");
    if (blockedUntil && Date.now() < parseInt(blockedUntil)) {
      return alert("你剛剛被踢出，請等待 5 秒後再登入");
    }

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

      navigate("/chat");
    } catch (e) {
      alert("帳號登入失敗：" + e.message);
    }
  };

  // 註冊
  const registerAccount = async () => {
    if (!username || !password) return alert("請填寫帳號與密碼");

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

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 10 }}>男歡女愛聊天室</h2>
      <div style={{ textAlign: "center", color: "#aaa", fontSize: 14 }}>
        聊天越多，等級越高（最高 Lv.99）
      </div>

      {/* 模式切換 */}
      <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
        {["guest", "login", "register"].map((m) => (
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
            {m === "guest" ? "訪客" : m === "login" ? "登入" : "註冊"}
          </button>
        ))}
      </div>

      {/* 性別選擇 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[{ v: "女", label: "♀ 女生" }, { v: "男", label: "♂ 男生" }].map((g) => (
          <label
            key={g.v}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "8px 0",
              borderRadius: 6,
              cursor: "pointer",
              background: gender === g.v ? "#333" : "#1e1e1e",
              border: "1px solid #333",
            }}
          >
            <input
              type="radio"
              value={g.v}
              checked={gender === g.v}
              onChange={() => setGender(g.v)}
              style={{ display: "none" }}
            />
            {g.label}
          </label>
        ))}
      </div>

      {/* 帳號登入/註冊表單 */}
      {(mode === "login" || mode === "register") && (
        <>
          <input
            style={inputStyle}
            placeholder="帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

          {/* 頭像選擇 */}
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
        </>
      )}

      {/* 送出按鈕 */}
      {mode === "guest" && (
        <button style={buttonStyle} onClick={guestLogin}>
          以訪客身分進入
        </button>
      )}

      {mode === "login" && (
        <button style={buttonStyle} onClick={accountLogin}>
          登入聊天室
        </button>
      )}

      {mode === "register" && (
        <button style={buttonStyle} onClick={registerAccount}>
          建立帳號
        </button>
      )}
    </div>
  );
}
