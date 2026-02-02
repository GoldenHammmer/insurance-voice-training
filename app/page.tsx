"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const [testCode, setTestCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!testCode.trim()) {
      setError("請輸入測試碼");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: testCode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("testCode", testCode.trim().toUpperCase());
        localStorage.setItem("testCodeData", JSON.stringify(data.codeData));
        router.push("/session");
      } else {
        setError(data.error || "測試碼無效");
      }
    } catch (err) {
      setError("驗證失敗，請稍後再試");
      console.error("驗證錯誤:", err);
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "48px",
        maxWidth: "440px",
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: "8px"
          }}>
            🎯 保險業務模擬訓練
          </h1>
          <p style={{
            fontSize: "16px",
            color: "#666",
            lineHeight: "1.5"
          }}>
            AI 語音訓練系統
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
              marginBottom: "8px"
            }}>
              請輸入測試碼
            </label>
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="例如：VIP-001"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "16px",
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                outline: "none",
                transition: "border-color 0.2s",
                textTransform: "uppercase"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
            />
          </div>

          {error && (
            <div style={{
              padding: "12px 16px",
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "8px",
              color: "#c33",
              fontSize: "14px",
              marginBottom: "20px"
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "600",
              color: "white",
              background: isVerifying ? "#999" : "#667eea",
              border: "none",
              borderRadius: "8px",
              cursor: isVerifying ? "not-allowed" : "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => {
              if (!isVerifying) e.currentTarget.style.background = "#5568d3";
            }}
            onMouseLeave={(e) => {
              if (!isVerifying) e.currentTarget.style.background = "#667eea";
            }}
          >
            {isVerifying ? "驗證中..." : "開始訓練"}
          </button>
        </form>

        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid #eee",
          textAlign: "center"
        }}>
          <p style={{
            fontSize: "13px",
            color: "#999",
            lineHeight: "1.6"
          }}>
            還沒有測試碼？請聯繫管理員<br />
            或發送訊息至：your@email.com
          </p>
        </div>
      </div>
    </main>
  );
}
