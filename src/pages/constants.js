// constants.js — 集中管理所有魔術數字與設定值

// 訊息上限（超過時自動截斷最舊的）
export const MAX_MESSAGES = 500;

// Socket 心跳間隔（毫秒）
export const HEARTBEAT_INTERVAL = 10_000;

// 發送訊息冷卻（毫秒）
export const COOLDOWN_MS = 1_000;

// 離開訊息延遲顯示（毫秒）— 讓快速重連不顯示離開訊息
export const PENDING_LEAVE_DELAY = 3_000;

// EXP 飄字顯示時間
export const EXP_TIP_DURATION = 1_000;

// 升級提示顯示時間
export const LEVEL_UP_TIP_DURATION = 1_200;

// 性別對應顏色
export const GENDER_COLORS = {
  男: "#A7C7E7",
  女: "#F8C8DC",
  default: "#00aa00",
};

// 系統頭像路徑
export const SYSTEM_AVATAR = "/avatars/system.png";
