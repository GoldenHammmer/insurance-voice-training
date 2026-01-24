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

  // === WebRTC / Realtime：狀態 ===
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [rtcStatus, setRtcStatus] = useState<
    "idle" | "starting" | "connected" | "failed" | "ended"
  >("idle");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);

  function log(msg: string) {
    setLogLines((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  }

  const nextPrompt = () => {
    setCurrentPrompt((prev) => (prev + 1) % prompts.length);
  };

  // === 啟用麥克風：會觸發瀏覽器跳出授權視窗 ===
  async function enableMic() {
    setMicError("");
    setMicStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setMicStatus("ready");
      log("Mic ready ✅");
    } catch (err: any) {
      const name = err?.name || "UnknownError";
      setMicStatus(name === "NotAllowedError" ? "denied" : "error");
      setMicError(`${name}: ${err?.message || String(err)}`);
      log(`Mic error ❌ ${name}`);
    }
  }

  function stopMic() {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setMicStatus("idle");
    setMicError("");
    log("Mic stopped");
  }

  // === 開始 Realtime WebRTC（可用手機驗證的版本） ===
  async function startRealtime() {
    if (!streamRef.current) {
      alert("請先啟用麥克風");
      return;
    }

    setRtcStatus("starting");
    setHasRemoteAudio(false);
    log("Starting realtime…");

    try {
      // 1) 拿 ephemeral token（一定要 server 端）
      const tokenRes = await fetch("/api/session/demo/ephemeral", { method: "POST" });
      const tokenJson = await tokenRes.json();

      if (!tokenRes.ok) {
        log(`Ephemeral error: ${JSON.stringify(tokenJson).slice(0, 200)}`);
        setRtcStatus("failed");
        return;
      }

      const clientSecret = tokenJson?.client_secret?.value;
      if (!clientSecret) {
        log("Ephemeral missing client_secret.value ❌");
        setRtcStatus("failed");
        return;
      }

      log("Ephemeral OK ✅");

      // 2) 建立 RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        log(`pc.connectionState = ${pc.connectionState}`);
        if (pc.connectionState === "connected") setRtcStatus("connected");
        if (pc.connectionState === "failed") setRtcStatus("failed");
        if (pc.connectionState === "closed") setRtcStatus("ended");
      };

      pc.oniceconnectionstatechange = () => {
        log(`pc.iceConnectionState = ${pc.iceConnectionState}`);
      };

      // 3) 接收 AI 回來的 audio track（就算你聽不到，也會有 track event）
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true; // iOS 需要
      audioRef.current = audio;

      pc.ontrack = (event) => {
        setHasRemoteAudio(true);
        log("Received remote audio track ✅");
        audio.srcObject = event.streams[0];
        // 觸發播放（手機瀏覽器通常需要使用者手勢，你已經是按按鈕觸發）
        audio.play().catch((e) => log(`audio.play() blocked: ${String(e)}`));
      };

      // 4) 把你的麥克風 track 丟進去
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });
      log("Local audio tracks added");

      // 5) SDP offer/answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      log("Created SDP offer");

      const model = "gpt-4o-realtime-preview";
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        log(`Realtime SDP error: ${errText.slice(0, 200)}`);
        setRtcStatus("failed");
        return;
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      log("Set remote SDP answer ✅ (WebRTC negotiating)");

      // 這時候等待 ontrack / connectionState 變化即可
    } catch (e: any) {
      log(`Start realtime failed: ${String(e)}`);
      setRtcStatus("failed");
    }
  }

  function endRealtime() {
    try {
      pcRef.current?.close();
      pcRef.current = null;
      setRtcStatus("ended");
      log("Realtime ended");
    } catch {
      // ignore
    }
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
          點擊「下一句提示」切換練習主題。先啟用麥克風，再按「開始即時對話」嘗試連上 AI。
          下方「連線日誌」會告訴你有沒有真的連上（即使你聽不到聲音也能判斷）。
        </p>

        {/* 麥克風狀態 */}
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
            {micStatus === "ready" && "✅ 麥克風已啟用"}
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

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                opacity: micStatus === "requesting" || micStatus === "ready" ? 0.6 : 1,
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

            <button
              onClick={startRealtime}
              disabled={micStatus !== "ready" || rtcStatus === "starting" || rtcStatus === "connected"}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "#7c3aed",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                opacity:
                  micStatus !== "ready" || rtcStatus === "starting" || rtcStatus === "connected" ? 0.6 : 1,
              }}
            >
              開始即時對話
            </button>

            <button
              onClick={endRealtime}
              disabled={rtcStatus !== "connected" && rtcStatus !== "starting"}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: "white",
                cursor: "pointer",
                opacity: rtcStatus !== "connected" && rtcStatus !== "starting" ? 0.6 : 1,
              }}
            >
              結束即時對話
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 14 }}>
            <strong>Realtime 狀態：</strong> {rtcStatus}
            <span style={{ marginLeft: 12 }}>
              <strong>收到 AI 音軌：</strong> {hasRemoteAudio ? "✅" : "—"}
            </span>
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

        {/* 連線日誌（手機也能看） */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>連線日誌（Debug）</div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              background: "#0b1220",
              color: "#e2e8f0",
              fontSize: 12,
              lineHeight: 1.5,
              maxHeight: 240,
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {logLines.length ? logLines.join("\n") : "尚無日誌。請先啟用麥克風，再按「開始即時對話」。"}
          </div>
        </div>
      </section>
    </main>
  );
}
