// useUserState.js
// 管理目前登入使用者的所有狀態：
//   - 從 sessionStorage 初始化
//   - 從後端 /auth/me 取得最新資料
//   - 處理 updateUsers socket 事件中「自己」的欄位變化
//   - 使用 refs 避免 socket handler 重複綁定（stale closure 問題）
import { useState, useRef, useEffect, useCallback } from "react";
import { EXP_TIP_DURATION, LEVEL_UP_TIP_DURATION } from "../constants";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
const ANL = Number(import.meta.env.VITE_ADMIN_MIN_LEVEL) || 91;

const safeText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (v.name) return String(v.name);
    if (v.user) return String(v.user);
    return JSON.stringify(v);
  }
  return String(v);
};

export function useUserState(socket) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [gender, setGender] = useState("女");
  const [apples, setApples] = useState(
    () => parseInt(sessionStorage.getItem("apples")) || 0
  );
  const [token, setToken] = useState("");
  const [expTips, setExpTips] = useState([]);
  const [levelUpTips, setLevelUpTips] = useState([]);

  // initializedRef: 第一次 updateUsers 完成後才顯示升級/EXP 飄字
  const initializedRef = useRef(false);

  // 用 refs 保存最新值，讓 socket handler 不需要重新綁定也能讀到最新狀態
  const nameRef = useRef(name);
  const levelRef = useRef(level);
  const expRef = useRef(exp);
  const genderRef = useRef(gender);
  const applesRef = useRef(apples);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { expRef.current = exp; }, [exp]);
  useEffect(() => { genderRef.current = gender; }, [gender]);
  useEffect(() => { applesRef.current = apples; }, [apples]);

  // EXP 飄字計時器
  useEffect(() => {
    if (expTips.length === 0) return;
    const t = setTimeout(() => setExpTips((s) => s.slice(1)), EXP_TIP_DURATION);
    return () => clearTimeout(t);
  }, [expTips]);

  // 升級提示計時器
  useEffect(() => {
    if (levelUpTips.length === 0) return;
    const t = setTimeout(() => setLevelUpTips((s) => s.slice(1)), LEVEL_UP_TIP_DURATION);
    return () => clearTimeout(t);
  }, [levelUpTips]);

  // --- initUser: 從 sessionStorage 讀取初始值 ---
  const initUser = useCallback(() => {
    const storedToken =
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("guestToken") ||
      null;
    if (!storedToken) {
      sessionStorage.clear();
      socket.disconnect();
      window.location.href = "/login";
      return null;
    }
    setToken(storedToken);
    const storedName = sessionStorage.getItem("name");
    if (storedName) setName(safeText(storedName));
    setLevel(parseInt(sessionStorage.getItem("level")) || 1);
    setExp(parseInt(sessionStorage.getItem("exp")) || 0);
    setGender(sessionStorage.getItem("gender") || "女");
    return storedToken;
  }, [socket]);

  // --- fetchUserData: 從後端取得最新資料 ---
  const fetchUserData = useCallback(async (t) => {
    try {
      const res = await fetch(`${BACKEND}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("無法取得使用者資料");
      const data = await res.json();
      setName(safeText(data.username));
      setLevel(data.level || 1);
      setExp(data.exp || 0);
      setApples(data.gold_apples || 0);
      setGender(data.gender || "女");
      sessionStorage.setItem("name", data.username);
      sessionStorage.setItem("level", data.level);
      sessionStorage.setItem("exp", data.exp);
      sessionStorage.setItem("apples", data.gold_apples || 0);
      sessionStorage.setItem("gender", data.gender);
      if (data.account_type === "account") {
        sessionStorage.setItem("token", t);
      } else {
        sessionStorage.setItem("guestToken", t);
      }
      setToken(t);
    } catch (err) {
      console.error(err);
      sessionStorage.clear();
      socket.disconnect();
      window.location.href = "/login";
    }
  }, [socket]);

  // --- handleUpdateUsersForSelf: 從 updateUsers 中找到自己並同步狀態 ---
  // ✅ 不依賴任何 state，全部透過 refs 讀取最新值，所以不需要重新綁定
  const handleUpdateUsersForSelf = useCallback((list = []) => {
    if (!Array.isArray(list)) return;
    const myType = sessionStorage.getItem("type") || "guest";
    const me = list.find(
      (u) =>
        safeText(u.name || u.user) === nameRef.current &&
        (u.type || "guest") === myType
    );
    if (!me) return;

    // 訪客等級固定 1，不吃後面升級邏輯
    if (myType === "guest") {
      if (levelRef.current !== 1) {
        setLevel(1);
        setExp(0);
        sessionStorage.setItem("level", 1);
        sessionStorage.setItem("exp", 0);
      }
      return;
    }

    if (me.level !== levelRef.current) {
      if (initializedRef.current && me.level > levelRef.current) {
        setLevelUpTips((s) => [...s, { id: Date.now(), value: "升級!" }]);
      }
      setLevel(me.level || 1);
      sessionStorage.setItem("level", me.level || 1);
    }

    if (me.exp !== expRef.current) {
      const diff = me.exp - expRef.current;
      if (diff > 0 && me.level > 1 && me.level < ANL) {
        setExpTips((s) => [...s, { id: Date.now(), value: `+${diff}` }]);
      }
      setExp(me.exp || 0);
      sessionStorage.setItem("exp", me.exp || 0);
    }

    if (me.gold_apples !== applesRef.current) {
      setApples(me.gold_apples);
      sessionStorage.setItem("apples", me.gold_apples);
    }

    if (me.gender && me.gender !== genderRef.current) {
      setGender(me.gender);
      sessionStorage.setItem("gender", me.gender);
    }

    initializedRef.current = true;
  }, []); // ✅ 空依賴陣列，handler 只建立一次

  return {
    name, level, exp, gender, apples, token, expTips, levelUpTips, initializedRef,
    setApples,
    initUser,
    fetchUserData,
    handleUpdateUsersForSelf,
  };
}
