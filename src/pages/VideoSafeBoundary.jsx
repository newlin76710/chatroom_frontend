import React from "react";

export default class VideoSafeBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("🎥 VideoPlayer 崩潰（已攔截）", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="video-player-float"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#aaa",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ 影片載入失敗（瀏覽器擴充套件造成）
        </div>
      );
    }

    return this.props.children;
  }
}
