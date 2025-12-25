export const ICE_CONFIG = {
  iceServers: [
    // 🔹 STUN（優先）
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },

    // 🔹 TURN（跨網路穩定關鍵）
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "8377acb6c166cbf568e9e013",
      credential: "v+uDnYMJ5YIejFhv",
    },
    {
      urls: "turn:global.relay.metered.ca:443?transport=tcp",
      username: "8377acb6c166cbf568e9e013",
      credential: "v+uDnYMJ5YIejFhv",
    },
    {
      urls: "turns:global.relay.metered.ca:443",
      username: "8377acb6c166cbf568e9e013",
      credential: "v+uDnYMJ5YIejFhv",
    },
  ],

  // ❗重要：避免 ICE 一直重連抖動
  iceCandidatePoolSize: 10,
};
