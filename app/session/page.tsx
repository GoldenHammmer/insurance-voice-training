"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* =========================
   Persona 型別
========================= */
type Gender = "male" | "female";
type Attitude =
  | "neutral"
  | "skeptical"
  | "data_only"
  | "avoidant";
type Topic =
  | "phone_invite"
  | "product_marketing"
  | "relationship";

/* =========================
   Page Component
========================= */
export default function SessionPage() {
  /* ---------- Persona 設定 ---------- */
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(38);
  const [job, setJob] = useState("工廠技術人員");
  const [attitude, setAttitude] = useState<Attitude>("neutral");
  const [topic, setTopic] = useState<Topic>("phone_invite");

  /* ---------- Mic / RTC 狀態 ---------- */
  const [micReady, setMicReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [connected, setConnected] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const talkStartRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* =========================
     Utils
  ========================= */
  function log(msg: string) {
    setLogLines((prev) => {
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
      return [line, ...prev].slice(0, 120);
    });
  }

  /* =========================
     Mic
  ========================= */
  async function enableMic() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    setMicReady(true);
    log("Mic ready ✅");
  }

  function stopMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicReady(false);
    log("Mic stopped");
  }

  /* =========================
     Persona System Prompt
  ========================= */
  function buildPersonaInstruction() {
    const attitudeMap: Record<Attitude, string> = {
      neutral: "中立，願意聽但不主動想買",
      skeptical: "質疑業務動機，怕被話術",
      data_only: "只接受數據與邏輯",
      avoidant: "會轉移話題，想結束對話",
    };

    const topicMap: Record<Topic, string> = {
      phone_invite: "電話約訪",
      product_marketing: "行銷保險商品",
      relationship: "客情培養",
    };

    return `
你正在模擬一位【台灣的保險客戶】，請嚴格維持角色，不要跳出設定。

【基本人設】
- 性別：${gender === "male" ? "男性" : "女性"}
- 年齡：${age} 歲
- 職業：${job}
- 地區：台灣
- 使用語言：繁體中文（台灣用語）

【對保險態度】
- ${attitudeMap[attitude]}

【模擬對話主題】
- ${topicMap[topic]}

【人格互動姿態（隱性）】
- 不主動延續話題
- 不給建議
- 不主導對話
- 不扮演保險業務員

【回覆限制（非常重要）】
- 每次只回 1～2 句
- 每句不超過 20 個中文字
- 簡短、口語、偏被動

【禁止事項】
- 不可自稱 AI
- 不可跳出角色
- 不可詢問「你想聊什麼」
`;
  }

  /* =========================
     Realtime Start
  ========================= */
  async function startRealtime() {
    if (!streamRef.current) return;

    log("Starting realtime…");

    const tokenRes = await fetch("/api/session/demo/ephemeral", {
      method: "POST",
    });
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

      // 開場固定一句，避免亂語言
      dc.send(
        JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio", "text"],
            instructions: "請以角色身份，用一句話回應來電。",
          },
        })
      );
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

    // 6 分鐘自動結束
    sessionTimerRef.current = setTimeout(() => {
      endRealtime();
    }, 6 * 60 * 1000);
  }

  function endRealtime() {
    dcRef.current?.close();
    pcRef.current?.close();
    sessionTimerRef.current && clearTimeout(sessionTimerRef.current);
    setConnected(false);
    log("Session ended ⛔");
  }

  /* =========================
     Push-to-Talk
  ========================= */
  function startTalk() {
    if (!connected || !dcRef.current) return;
    talkStartRef.current = Date.now();
    log("🎙️ 開始說話");
  }

  function stopTalk() {
    if (!connected || !dcRef.current) return;
    if (!talkStartRef.current) return;

    talkStartRef.current = null;
    log("📡 傳送給 AI");

    dcRef.current.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: "請以角色身份簡短回應。",
        },
      })
    );
  }

  /* =========================
     UI
  ========================= */
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Link href="/">← 回首頁</Link>

      <h1 style={{ marginTop: 24 }}>保險業務語音模擬</h1>

      {/* Persona */}
      <section style={{ marginTop: 24 }}>
        <h3>模擬對象設定</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <option value="product_marketing">行銷保險商品</option>
            <option value="relationship">客情培養</option>
          </select>
        </div>
      </section>

      {/* Controls */}
      <section style={{ marginTop: 24 }}>
        {!micReady && <button onClick={enableMic}>啟用麥克風</button>}
        {micReady && !connected && <button onClick={startRealtime}>開始即時對話</button>}
        {connected && (
          <>
            <button onMouseDown={startTalk} onMouseUp={stopTalk}>
              🎙️ 按住說話
            </button>
            <button onClick={endRealtime}>結束</button>
          </>
        )}
      </section>

      {/* Logs */}
      <section style={{ marginTop: 24 }}>
        <h3>系統日誌</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, height: 240, overflow: "auto" }}>
          {logLines.join("\n")}
        </pre>
      </section>
    </main>
  );
}
