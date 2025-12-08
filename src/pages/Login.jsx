import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("guest"); // guest / login / register

  // 訪客登入
  const guestLogin = async () => {
    try {
      const oldToken = localStorage.getItem("guestToken");
      const res = await fetch(`${BACKEND}/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "訪客登入失敗");

      localStorage.setItem("guestToken", data.guestToken);
      localStorage.setItem("name", data.name);

      navigate("/chat");
    } catch (e) {
      alert("訪客登入失敗：" + e.message);
    }
  };

  // 帳號登入
  const accountLogin = async () => {
    if (!username || !password) return alert("請輸入帳號與密碼");
    try {
      const res = await fetch(`${BACKEND}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登入失敗");

      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name);

      navigate("/chat");
    } catch (e) {
      alert("帳號登入失敗：" + e.message);
    }
  };

  // 帳號註冊
  const registerAccount = async () => {
    if (!username || !password) return alert("請輸入帳號與密碼");
    try {
      const res = await fetch(`${BACKEND}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "註冊失敗");

      alert("註冊成功！請登入");
      setMode("login");
    } catch (e) {
      alert("註冊失敗：" + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
      <h2>聊天室登入</h2>

      <div style={{ margin: "20px 0" }}>
        <button onClick={() => setMode("guest")} style={{ marginRight: 10 }}>訪客登入</button>
        <button onClick={() => setMode("login")} style={{ marginRight: 10 }}>帳號登入</button>
        <button onClick={() => setMode("register")}>註冊帳號</button>
      </div>

      {mode === "guest" && (
        <div>
          <p>以匿名訪客身份進入聊天室</p>
          <button onClick={guestLogin}>以訪客登入</button>
        </div>
      )}

      {(mode === "login" || mode === "register") && (
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ display: "block", margin: "10px auto" }}
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", margin: "10px auto" }}
          />
          {mode === "login" && <button onClick={accountLogin}>登入</button>}
          {mode === "register" && <button onClick={registerAccount}>註冊</button>}
        </div>
      )}
    </div>
  );
}
