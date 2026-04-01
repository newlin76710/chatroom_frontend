import { useEffect, useState } from "react";
import "./AdminSettingsModal.css";
export default function AdminSettingsModal({ open, onClose, token, BACKEND }) {
  const [settings, setSettings] = useState({
    daily_login_reward: 1,
    singing_reward: 2,
    per_transfer_limit: 0,
    daily_transfer_limit: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  console.log("modal open:", open);
  /* ================= 取得設定 ================= */
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BACKEND}/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("讀取失敗", err);
      alert("讀取設定失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchSettings();
    }
  }, [open]);

  /* ================= 更新設定 ================= */
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND}/admin/set-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "更新失敗");
        return;
      }

      alert("更新成功");
      onClose(); // 關閉 modal
    } catch (err) {
      console.error(err);
      alert("更新失敗");
    } finally {
      setSaving(false);
    }
  };

  /* ================= input 處理 ================= */
  const handleChange = (key, value) => {
    if (value === "") {
      setSettings(prev => ({ ...prev, [key]: "" }));
      return;
    }

    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;

    setSettings(prev => ({
      ...prev,
      [key]: Math.floor(num),
    }));
  };

  if (!open) return null;

  return (
    <div className="apple-modal">
      <div className="apple-modal-content" style={{ width: 400 }}>
        <h3>⚙️ 金蘋果設定</h3>

        {loading ? (
          <div>讀取中...</div>
        ) : (
          <>
            <div>
              <label>每日登入獎勵</label>
              <input
                type="number"
                value={settings.daily_login_reward}
                onChange={(e) =>
                  handleChange("daily_login_reward", e.target.value)
                }
              />
            </div>

            <div>
              <label>唱歌獎勵</label>
              <input
                type="number"
                value={settings.singing_reward}
                onChange={(e) =>
                  handleChange("singing_reward", e.target.value)
                }
              />
            </div>

            <div>
              <label>單筆轉帳上限</label>
              <input
                type="number"
                value={settings.per_transfer_limit}
                onChange={(e) =>
                  handleChange("per_transfer_limit", e.target.value)
                }
              />
            </div>

            <div>
              <label>每日轉帳上限</label>
              <input
                type="number"
                value={settings.daily_transfer_limit}
                onChange={(e) =>
                  handleChange("daily_transfer_limit", e.target.value)
                }
              />
            </div>

            <div style={{ marginTop: 15 }}>
              <button onClick={handleSave} disabled={saving}>
                {saving ? "儲存中..." : "儲存"}
              </button>
              <button onClick={onClose} style={{ marginLeft: 10 }}>
                關閉
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}