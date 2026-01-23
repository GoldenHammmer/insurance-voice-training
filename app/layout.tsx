import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insurance Voice Training",
  description: "Practice insurance call scripts with voice-assisted coaching."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#f8fafc",
          color: "#0f172a"
        }}
      >
        {children}
      </body>
    </html>
  );
}
