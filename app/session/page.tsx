"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function SessionPage() {
  // ===== 基本狀態 =====
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [micReady, setMicReady] = useState(false);
  const [rtcConnected, setRtcConnected] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const sessionTimerRef = useRef<number | null>(null);

  function log(msg: string) {
    setLogLines((prev) => {
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
      return [line, ...prev].slice(0, 80);
    });
  }

  // ===== 啟用麥克風 =====
  async function enableMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicReady(true);
      log("Mic ready ✅");
    } catch {
      alert("麥克風啟用失敗，請確認瀏覽器權限");
    }
  }

  function stopAll() {
    sessionTimerRef.current && clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = null;

    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;

    setRtcConnected(false);
    setMicReady(false);
    log("Session ended ⛔");
  }

  // ===== 啟動 Realtime =====
  async function startRealtime() {
    if (!streamRef.current) {
      alert("請先啟用麥克風");
      return;
    }

    log("Starting realtime…");

    // 6 分鐘自動結束
    sessionTimerRef.current = window.setTimeout(() => {
      log("⏱ 6 分鐘到，系統自動結束");
      stopAll();
    }, 6 * 60 * 1000);

    const tokenRes = await fetch("/api/session/demo/ephemeral", { method: "POST" });
    const tokenJson = await tokenRes.json();
    const clientSecret = tokenJson?.client_secret?.value;

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;

    dc.onopen = () => {
      log("DataChannel open ✅");

      // ===== System Persona（重點）=====
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio"],
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            instructions: `
你是台灣的保險客戶。
基本設定：
- 性別：隨機
- 年齡：35～50 歲
- 職業：上班族 / 自營
- 對保險態度：理性但防備，不喜歡被推銷

互動規則（非常重要）：
- 每次回覆只能 1～2 句
- 每句不超過 20 個繁體中文字
- 口語、自然、像真人
- 不解釋、不教學、不說大道理

人格姿態（隨機切換）：
- 責備型：質疑業務動機
- 討好型：不敢拒絕但不答應
- 超理智型：只要數據與邏輯
- 打岔型：轉移話題、敷衍

禁止事項：
- 不得鼓勵購買
- 不得保證任何結果
- 不得講課或長篇分析
`,
          },
        })
      );
    };

    dc.onmessage = () => {}; // 不處理 transcript，省 token

    // ===== Audio output =====
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audioRef.current = audio;

    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
      audio.play();
      log("AI audio playing 🔊");
    };

    // ===== 加入麥克風 track =====
    streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      }
    );

    const answer = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });

    setRtcConnected(true);
    log("Realtime connected ✅");
  }

  // ===== Push-to-Talk =====
  function pushStart() {
    if (!dcRef.current) return;
    dcRef.current.send(JSON.stringify({ type: "input_audio_buffer.start" }));
    log("🎙 開始說話");
  }

  function pushEnd() {
    if (!dcRef.current) return;
    dcRef.current.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    dcRef.current.send(JSON.stringify({ type: "response.create" }));
    log("📡 傳送給 AI");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <Link href="/">← 回首頁</Link>

      <h1>語音模擬對話（MVP）</h1>

      {!micReady && (
        <button onClick={enableMic} style={{ padding: 12 }}>
          啟用麥克風
        </button>
      )}

      {micReady && !rtcConnected && (
        <button onClick={startRealtime} style={{ padding: 12 }}>
          開始練習
        </button>
      )}

      {rtcConnected && (
        <>
          <button
            onMouseDown={pushStart}
            onMouseUp={pushEnd}
            onTouchStart={pushStart}
            onTouchEnd={pushEnd}
            style={{
              marginTop: 24,
              padding: "20px 40px",
              borderRadius: 999,
              background: "#7c3aed",
              color: "white",
              fontSize: 18,
            }}
          >
            按住說話
          </button>

          <button onClick={stopAll} style={{ marginTop: 12 }}>
            結束練習
          </button>
        </>
      )}

      <pre
        style={{
          marginTop: 24,
          background: "#0f172a",
          color: "#e5e7eb",
          padding: 12,
          borderRadius: 12,
          fontSize: 12,
          maxHeight: 240,
          overflow: "auto",
        }}
      >
        {logLines.join("\n")}
      </pre>
    </main>
  );
}
