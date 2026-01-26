import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <section
        style={{
          background: "white",
          padding: 32,
          borderRadius: 24,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>
          保險銷售練習
        </div>

        <h1 style={{ margin: 0, fontSize: 44, letterSpacing: -0.5 }}>
          Insurance Voice Training
        </h1>

        <p style={{ color: "#475569", lineHeight: 1.8, fontSize: 18, marginTop: 14 }}>
          這是一個簡單的話音練習工具，協助你用更自然的口吻介紹保險方案，
          並在模擬通話中獲得引導。
        </p>

        <Link
          href="/session"
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "12px 18px",
            borderRadius: 999,
            background: "#2563eb",
            color: "white",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          進入模擬對話
        </Link>
      </section>

      <h2 style={{ marginTop: 28, marginBottom: 12 }}>快速上手</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div
          style={{
            background: "white",
            borderRadius: 18,
            padding: 18,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>準備好麥克風</div>
          <div style={{ color: "#475569", lineHeight: 1.7 }}>
            確保你的手機/電腦有麥克風，並允許瀏覽器使用麥克風。
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 18,
            padding: 18,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>選擇人設</div>
          <div style={{ color: "#475569", lineHeight: 1.7 }}>
            先選擇「客戶性別/年齡/職業/態度/姿態」，再開始模擬對話。
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 18,
            padding: 18,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>按住說話（省錢）</div>
          <div style={{ color: "#475569", lineHeight: 1.7 }}>
            用「按住說話 / 放開送出」，AI 會用短句回覆，更接近真實對話也更省費用。
          </div>
        </div>
      </div>
    </main>
  );
}
