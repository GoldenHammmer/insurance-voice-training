"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const prompts = [
  "用一句話向客戶自我介紹，說明你是專業保險顧問。",
  "詢問客戶目前最在意的保障需求是什麼。",
  "簡短說明這份保單能解決的風險與保障特色。",
];

export default function SessionPage() {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [note, setNote] = useState("");

  // === 麥克風測試：狀態 & 錯誤訊息 ===
  const [micStatus, setMicStatus] = useState<
    "idle" | "requesting" | "ready" | "denied" | "error"
  >("idle");
  const [micError, setMicError] = useState<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  const nextPrompt = () => {
    setCurrentPrompt((prev) => (prev + 1) % prompts.length);
  };

  // === 啟用麥克風：會觸發瀏覽器跳出授權視窗 ===
  async function enableMic() {
    setMicError("");
    setMicStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      setMicStatus("ready");
    } catch (err: any) {
      const name = err?.name || "UnknownError";
      setMicStatus(name === "NotAllowedError" ? "denied" : "error");
      setMicError(`${name}: ${err?.message || String(err)}`);
    }
  }

  // === 停止麥克風：釋放音軌（避免一直佔用） ===
  function stopMic() {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setMicStatus("idle");
    setMicError("");
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
        ← 回到首頁
      </Link>

      <section
        style={{
          marginTop: 24,
          background: "white",
          padding: 32,
          borderRadius: 24,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>模擬通話練習</h1>
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          點擊「下一句提示」切換練習主題。請對著麥克風朗讀，完成後可以在下方留下
          自我回饋。
        </p>

        {/* ✅ 麥克風測試模組：先確保瀏覽器會跳出授權 */}
        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        >
          <strong>麥克風狀態</strong>
          <p style={{ marginTop: 8, fontSize: 14 }}>
            {micStatus === "idle" && "尚未啟用，按下按鈕後會要求瀏覽器授權"}
            {micStatus === "requesting" && "正在請求麥克風權限…（請留意瀏覽器彈窗）"}
            {micStatus === "ready" && "✅ 麥克風已啟用（下一步才能做語音對話）"}
            {micStatus === "denied" &&
              "❌ 你拒絕了麥克風權限（可在網址列左側🔒改成允許後重新整理）"}
            {micStatus === "error" && "⚠️ 啟用失敗（請看下方錯誤訊息）"}
          </p>

          {micError && (
            <pre
              style={{
                marginTop: 8,
                padding: 8,
                fontSize: 12,
                background: "#f1f5f9",
                borderRadius: 8,
                whiteSpace: "pre-wrap",
                border: "1px solid #e2e8f0",
              }}
            >
              {micError}
            </pre>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={enableMic}
              disabled={micStatus === "requesting" || micStatus === "ready"}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "#16a34a",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                opacity:
                  micStatus === "requesting" || micStatus === "ready" ? 0.6 : 1,
              }}
            >
              啟用麥克風
            </button>

            <button
              onClick={stopMic}
              disabled={micStatus !== "ready"}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: "white",
                cursor: "pointer",
                opacity: micStatus !== "ready" ? 0.6 : 1,
              }}
            >
              停止麥克風
            </button>
          </div>
        </div>

        {/* 既有提示區塊 */}
        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 16,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <strong>目前提示</strong>
          <p style={{ margin: "8px 0 0", fontSize: 18 }}>
            {prompts[currentPrompt]}
          </p>
        </div>

        <button
          type="button"
          onClick={nextPrompt}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 999,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          下一句提示
        </button>

        <div style={{ marginTop: 24 }}>
          <label htmlFor="note" style={{ display: "block", marginBottom: 8 }}>
            今日自我回饋
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例：語速要再放慢一點、先詢問需求再介紹保單"
            rows={5}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #cbd5f5",
              fontFamily: "inherit",
            }}
          />
        </div>
      </section>
    </main>
  );
}
