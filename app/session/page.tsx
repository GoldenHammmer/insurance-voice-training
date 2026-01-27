"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ======================
   人設型別（不要動）
====================== */
type Gender = "male" | "female";
type Attitude = "neutral" | "skeptical" | "data_only" | "avoidant";
type Topic = "phone_invite" | "product_marketing" | "relationship";

export default function SessionPage() {
  /* ===== 人設設定 ===== */
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(38);
  const [job, setJob] = useState("工廠技術人員");
  const [attitude, setAttitude] = useState<Attitude>("neutral");
  const [topic, setTopic] = useState<Topic>("phone_invite");

  /* ===== 系統狀態 ===== */
  const [micReady, setMicReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ===== Log 工具 ===== */
  function log(msg: string) {
    setLogLines((prev) => {
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
      return [line, ...prev].slice(0, 120);
    });
  }

  /* ===== 麥克風 ===== */
  async function enableMic() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    setMicReady(true);
    log("Mic ready ✅");
  }

  /* ===== 人設指令（關鍵） ===== */
  function buildPersonaInstruction() {
    return `
你是一位【台灣一般保險客戶】，請嚴格維持以下角色，不可跳脫。

【基本資料】
- 性別：${gender === "male" ? "男性" : "女性"}
- 年齡：${age} 歲
- 職業：${job}
- 地區：台灣
- 使用語言：繁體中文（台灣口吻）

【對保險態度】
${attitude === "neutral" ? "中立，願意聽但不主動購買" : ""}
${attitude === "skeptical" ? "質疑業務動機，怕被話術" : ""}
${attitude === "data_only" ? "只接受數據與邏輯" : ""}
${attitude === "avoidant" ? "會轉移話題，想結束對話" : ""}

【模擬對話主題】
${topic === "phone_invite" ? "電話約訪" : ""}
${topic === "product_marketing" ? "行銷保險商品" : ""}
${topic === "relationship" ? "客情培養" : ""}

【回覆規則（非常重要）】
- 每次只回 1～2 句
- 每句不超過 20 個中文字
- 偏被動、不主導話題
- 不可反問「你想聊什麼」
- 不可自稱 AI
- 不可提供建議

你現在是在「接到保險業務來電」的情境中。
`;
  }

  /* ===== 啟動 Realtime ===== */
  async function startRealtime() {
    if (!streamRef.current) return;

    log("Starting realtime…");

    const tokenRes = await fetch("/api/session/demo/ephemeral", { method: "POST" });
    const tokenJson = await tokenRes.json();
    const clientSecret = tokenJson?.client_secret?.value;

    if (!clientSecret) {
      log("Ephemeral failed ❌");
      return;
    }

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audioRef.current = audio;

    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
      audio.play();
      log("AI audio playing 🔊");
    };

    streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!));

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;

    dc.onopen = () => {
      log("DataChannel open ✅");

      // ✅ 只做「人設注入」，不讓 AI 主動說話
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: { type: "server_vad" },
            instructions: buildPersonaInstruction(),
            max_output_tokens: 60,
          },
        })
      );

      log("Persona injected ✅");
    };

    dc.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "response.done") {
        log("AI responded (completed) ✅");
      }
    };

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

    setConnected(true);
    log("Realtime connected ✅");

    sessionTimerRef.current = setTimeout(endRealtime, 6 * 60 * 1000);
  }

  /* ===== Push-to-Talk ===== */
  function startTalk() {
    if (!connected || !dcRef.current) return;
    log("🎙️ 開始說話");
  }

  function stopTalk() {
    if (!connected || !dcRef.current) return;

    log("📡 傳送給 AI");

    dcRef.current.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: "請依角色，用一句話簡短回應。",
        },
      })
    );
  }

  function endRealtime() {
    dcRef.current?.close();
    pcRef.current?.close();
    sessionTimerRef.current && clearTimeout(sessionTimerRef.current);
    setConnected(false);
    log("Session ended ⛔");
  }

  /* ===== UI ===== */
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Link href="/">← 回首頁</Link>

      <h1 style={{ marginTop: 24 }}>保險語音模擬訓練</h1>

      <section style={{ marginTop: 24 }}>
        <h3>模擬對象設定</h3>

        <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
          <option value="male">男性</option>
          <option value="female">女性</option>
        </select>

        <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} />
        <input value={job} onChange={(e) => setJob(e.target.value)} />

        <select value={attitude} onChange={(e) => setAttitude(e.target.value as Attitude)}>
          <option value="neutral">中立</option>
          <option value="skeptical">質疑動機</option>
          <option value="data_only">只要數據</option>
          <option value="avoidant">轉移話題</option>
        </select>

        <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
          <option value="phone_invite">電話約訪</option>
          <option value="product_marketing">行銷商品</option>
          <option value="relationship">客情培養</option>
        </select>
      </section>

      <section style={{ marginTop: 24 }}>
        {!micReady && <button onClick={enableMic}>啟用麥克風</button>}
        {micReady && !connected && <button onClick={startRealtime}>開始模擬</button>}
        {connected && (
          <>
            <button onMouseDown={startTalk} onMouseUp={stopTalk}>
              🎙️ 按住說話
            </button>
            <button onClick={endRealtime}>結束</button>
          </>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>系統日誌</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, height: 240, overflow: "auto" }}>
          {logLines.join("\n")}
        </pre>
      </section>
    </main>
  );
}
