import { useState } from "react";

export default function SongRating({ socket, room, singer }) {
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const submitScore = (s) => {
    if (submitted) return;
    setScore(s);
    setSubmitted(true);

    socket.emit("scoreSong", {
      room,
      score: s
    });
  };

  return (
    <div className="song-rating">
      <div className="rating-title">
        🎤 正在演唱：<strong>{singer}</strong>
      </div>

      <div className="stars">
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            className={`star ${n <= score ? "active" : ""} ${submitted ? "locked" : ""}`}
            onClick={() => submitScore(n)}
          >
            ★
          </span>
        ))}
      </div>

      {submitted && <div className="rated">已評分：{score} 星</div>}
    </div>
  );
}
