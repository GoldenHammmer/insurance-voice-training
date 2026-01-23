import Link from "next/link";

const steps = [
  {
    title: "準備好麥克風",
    description: "確保你的電腦或手機有麥克風，並允許瀏覽器使用麥克風。"
  },
  {
    title: "輸入 API 金鑰",
    description: "在 Vercel 的專案設定裡放入 OPENAI_API_KEY。"
  },
  {
    title: "開始練習",
    description: "進入模擬對話頁面，跟著提示朗讀即可。"
  }
];

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <section
        style={{
          background: "white",
          padding: 32,
          borderRadius: 24,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)"
        }}
      >
        <p style={{ fontSize: 14, letterSpacing: 2, color: "#64748b" }}>
          保險銷售練習
        </p>
        <h1 style={{ fontSize: 36, margin: "16px 0" }}>Insurance Voice Training</h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, marginBottom: 24 }}>
          這是一個簡單的語音練習工具，協助你用更自然的口吻介紹保險方案，
          並在模擬通話中獲得引導。
        </p>
        <Link
          href="/session"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            borderRadius: 999,
            background: "#2563eb",
            color: "white",
            textDecoration: "none",
            fontWeight: 600
          }}
        >
          進入模擬對話
        </Link>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>快速上手</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16
          }}
        >
          {steps.map((step) => (
            <article
              key={step.title}
              style={{
                background: "white",
                padding: 20,
                borderRadius: 16,
                border: "1px solid #e2e8f0"
              }}
            >
              <h3 style={{ margin: "0 0 8px" }}>{step.title}</h3>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
