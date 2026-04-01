// AppErrorBoundary.jsx
// 通用錯誤邊界，防止局部元件錯誤炸掉整個頁面
// 用法：<AppErrorBoundary label="管理面板"><AdminToolPanel /></AppErrorBoundary>
import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[AppErrorBoundary] ${this.props.label || "區塊"}錯誤:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "8px 12px", color: "#f88", fontSize: 13, background: "#1a1a1a", borderRadius: 4 }}>
          ⚠️ {this.props.label || "此區塊"}發生錯誤，請重新整理頁面
        </div>
      );
    }
    return this.props.children;
  }
}
