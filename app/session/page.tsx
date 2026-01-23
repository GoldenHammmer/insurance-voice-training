"use client";

import { useState } from "react";
import Link from "next/link";

const prompts = [
  "用一句話向客戶自我介紹，說明你是專業保險顧問。",
  "詢問客戶目前最在意的保障需求是什麼。",
  "簡短說明這份保單能解決的風險與保障特色。"
];

export default function SessionPage() {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [note, setNote] = useState("");

  const nextPrompt = () => {
    setCurrentPrompt((prev) => (prev + 1) % prompts.length);
  };

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
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)"
        }}
      >
        <h1 style={{ marginTop: 0 }}>模擬通話練習</h1>
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          點擊「下一句提示」切換練習主題。請對著麥克風朗讀，完成後可以在下方留下
          自我回饋。
        </p>
        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 16,
            background: "#eff6ff",
            border: "1px solid #bfdbfe"
          }}
        >
          <strong>目前提示</strong>
          <p style={{ margin: "8px 0 0", fontSize: 18 }}>{prompts[currentPrompt]}</p>
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
            cursor: "pointer"
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
              fontFamily: "inherit"
            }}
          />
        </div>
      </section>
    </main>
  );
}
