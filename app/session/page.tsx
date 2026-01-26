"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const prompts = [
  "用一句話向客戶自我介紹，說明你是專業保險顧問。",
  "詢問客戶目前最在意的保障需求是什麼。",
  "簡短說明這份保單能解決的風險與保障特色。",
];

// 你要的「四姿態」：用使用者可懂的描述呈現（不要顯示薩提爾名詞），但 system 內會用姿態規則
const postureOptions = [
  { id: "doubt", label: "質疑動機", hint: "容易懷疑業務目的、會反問、會試探" },
  { id: "cant_say_no", label: "不敢拒絕但不答應", hint: "怕尷尬、回覆模糊、一直拖延" },
  { id: "logic_only", label: "只要數據與邏輯", hint: "要條款/數字/比較，不吃情緒" },
  { id: "avoid", label: "轉移話題、敷衍", hint: "把話題帶走、回很短、想快結束" },
] as const;

type PostureId = (typeof postureOptions)[number]["id"];

const jobOptions = [
  "一般上班族",
  "自營商/業務",
  "工廠/現場人員",
  "公教/國營",
  "家庭主婦/主夫",
  "退休/準退休",
] as const;

type Job = (typeof jobOptions)[number];

const attitudeOptions = [
  { id: "neutral", label: "中立：覺得保險有用但怕被推銷" },
  { id: "skeptic", label: "保守：覺得保險多半用不到" },
  { id: "experienced", label: "有經驗：曾理賠/身邊有人理賠" },
] as const;

type AttitudeId = (typeof attitudeOptions)[number]["id"];

const voiceOptions = [
  // 你要先做「男女聲音差異」：先用兩個 voice 名稱（不做音色細分）
  { id: "male", label: "男聲", voice: "alloy" },
  { id: "female", label: "女聲", voice: "nova" },
] as const;

type VoiceId = (typeof voiceOptions)[number]["id"];

function nowHHMMSS() {
  return new Date().toLocaleTimeString();
}

export default function SessionPage() {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [note, setNote] = useState("");

  // ===== Persona (UI 顯示) =====
  const [voiceId, setVoiceId] = useState<VoiceId>("male");
  const [gender, setGender] = useState<"男" | "女">("男");
  const [age, setAge] = useState<number>(35);
  const [job, setJob] = useState<Job>("一般上班族");
  const [attitude, setAttitude] = useState<AttitudeId>("neutral");
  const [posture, setPosture] = useState<PostureId>("doubt");

  // ===== Mic =====
  const [micStatus, setMicStatus] = useState<"idle" | "requesting" | "ready" | "denied" | "error">(
    "idle"
  );
  const [micError, setMicError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);

  // ===== Realtime / WebRTC =====
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [rtcStatus, setRtcStatus] = useState<"idle" | "starting" | "connected" | "failed" | "ended">(
    "idle"
  );
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);

  // ===== PTT =====
  const [pttHeld, setPttHeld] = useState(false);

  // ===== 6 minutes timer =====
  const timerRef = useRef<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(6 * 60);

  // ===== Debug log (你之後要移除也行) =====
  const [logLines, setLogLines] = useState<string[]>([]);
  function log(msg: string) {
    setLogLines((prev) => {
      const line = `[${nowHHMMSS()}] ${msg}`;
      return [line, ...prev].slice(0, 120);
    });
  }

  const nextPrompt = () => setCurrentPrompt((p) => (p + 1) % prompts.length);

  const selectedVoice = useMemo(() => {
    const v = voiceOptions.find((x) => x.id === voiceId) ?? voiceOptions[0];
    return v.voice;
  }, [voiceId]);

  // ===== System instructions：藏四姿態、台灣保險思維、短句限制、省錢 =====
  const systemInstructions = useMemo(() => {
    const attitudeText =
      attitude === "neutral"
        ? "對保險中立，覺得可能有用，但非常怕被推銷。"
        : attitude === "skeptic"
        ? "對保險偏保守，覺得多半用不到，會先推拖或想先觀望。"
        : "曾經理賠或身邊有理賠經驗，知道風險是真的，但仍會比較與確認細節。";

    const postureRule =
      posture === "doubt"
        ? "互動姿態：偏『責備/質疑』風格。常問：你是不是要賣我？為什麼一定要現在？你拿多少佣金？"
        : posture === "cant_say_no"
        ? "互動姿態：偏『討好/不敢拒絕』風格。會說：我再看看、我問家人、我最近很忙，但不會明確答應。"
        : posture === "logic_only"
        ? "互動姿態：偏『超理智』風格。只接受數據、條款、比較、案例，不想聽情緒訴求。"
        : "互動姿態：偏『打岔/轉移』風格。常把話題帶走、回很短、想快結束。";

    // 超重要：短句限制（省錢）
    // 以台灣口語：1~2 句，通常每句 12~20 字最像「一句話」；我們硬上限：每句 <= 18 字、總字數 <= 36 字
    const brevity =
      "回覆規則：只用繁體中文；最多 2 句；每句不超過 18 個字；總字數不超過 36 字；不要列點；不要長篇解釋。";

    const roleplay =
      `你正在扮演台灣一般民眾的『保險客戶』。\n` +
      `基本資料：性別${gender}，年齡${age}歲，職業：${job}。\n` +
      `對保險看法：${attitudeText}\n` +
      `${postureRule}\n` +
      `情境：一位保險顧問（使用者）正在用口語跟你對話。\n` +
      `目標：用真實台灣人的方式回應，讓對話像真的。不要幫使用者推銷，保持客戶立場。\n` +
      `${brevity}`;

    return roleplay;
  }, [gender, age, job, attitude, posture]);

  // ===== Mic =====
  async function enableMic() {
    setMicError("");
    setMicStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Push-to-talk：預設先「關」track（不送音），按住才送
      const track = stream.getAudioTracks()[0] || null;
      audioTrackRef.current = track;
      if (track) track.enabled = false;

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
    audioTrackRef.current = null;
    setMicStatus("idle");
    setMicError("");
    log("Mic stopped");
  }

  // ===== Cleanup =====
  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cleanupRealtime() {
    clearTimer();
    setRemainingSec(6 * 60);

    try {
      dcRef.current?.close();
    } catch {}
    dcRef.current = null;

    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    audioRef.current = null;
    setHasRemoteAudio(false);

    // 斷線時也把 mic track 關掉
    if (audioTrackRef.current) audioTrackRef.current.enabled = false;
    setPttHeld(false);
  }

  function endRealtime() {
    cleanupRealtime();
    setRtcStatus("ended");
    log("Session ended ⛔");
  }

  // ===== Start realtime =====
  async function startRealtime() {
    if (micStatus !== "ready" || !streamRef.current) {
      alert("請先啟用麥克風");
      return;
    }

    cleanupRealtime();
    setRtcStatus("starting");
    log("Starting realtime…");

    try {
      const tokenRes = await fetch("/api/session/demo/ephemeral", { method: "POST" });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        log(`Ephemeral error ❌: ${JSON.stringify(tokenJson).slice(0, 400)}`);
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

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (!pcRef.current) return;
        log(`Realtime ${pc.connectionState}`);
        if (pc.connectionState === "connected") setRtcStatus("connected");
        if (pc.connectionState === "failed") setRtcStatus("failed");
        if (pc.connectionState === "closed") setRtcStatus("ended");
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        log("DataChannel open ✅");

        // ✅ 省錢核心：只要 audio、關 transcription
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["audio"], // 只要音訊輸出
            voice: selectedVoice,
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",

            // 關 transcription：不要 input_audio_transcription
            // turn_detection：不用 server_vad（因為要 Push-to-talk）
            // => 讓我們用「放開按鈕」時 commit + response.create 來控制回合

            instructions: systemInstructions,
          },
        };

        dc.send(JSON.stringify(sessionUpdate));
        log("Persona loaded ✅");

        // 開場先讓 AI 用超短句「確認已上線」（純音訊）
        const hello = {
          type: "response.create",
          response: {
            modalities: ["audio"],
            max_output_tokens: 80,
            instructions: "用 1 句話說：『我在，請說。』",
          },
        };
        dc.send(JSON.stringify(hello));
      };

      dc.onmessage = (evt) => {
        // 你可以之後把這段縮短或移除（省 UI）
        try {
          const data = JSON.parse(String(evt.data || "{}"));
          const t = data?.type || "unknown";
          if (t === "response.done") {
            const status = data?.response?.status;
            if (status === "failed") {
              const msg = data?.response?.status_details?.error?.message || "response failed";
              log(`AI failed ❌ ${String(msg).slice(0, 120)}`);
            }
          }
        } catch {}
      };

      dc.onclose = () => {
        log("DataChannel closed");
      };

      // 接 AI 音訊
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.muted = false;
      audio.volume = 1;
      audioRef.current = audio;

      pc.ontrack = (event) => {
        setHasRemoteAudio(true);
        audio.srcObject = event.streams[0];
        audio.play().then(
          () => log("AI audio playing 🔊"),
          () => log("audio.play() blocked (needs user gesture)")
        );
      };

      // 加 mic track（但 track.enabled 已經預設 false，不會一直送音）
      streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));

      // SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

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
        log(`Realtime SDP error ❌: ${errText.slice(0, 240)}`);
        setRtcStatus("failed");
        return;
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      log("Realtime connected ✅");

      // 6 分鐘倒數
      setRemainingSec(6 * 60);
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setRemainingSec((s) => {
          if (s <= 1) {
            log("⏱️ 6 分鐘到，自動結束");
            endRealtime();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (e: any) {
      log(`Start failed ❌: ${String(e)}`);
      setRtcStatus("failed");
    }
  }

  // ===== Push-to-talk：按住開始送音，放開 commit + response.create =====
  function pttDown() {
    if (rtcStatus !== "connected") {
      alert("請先開始即時對話");
      return;
    }
    if (!audioTrackRef.current) return;

    audioTrackRef.current.enabled = true;
    setPttHeld(true);
    log("🎙️ 開始說話");
  }

  function pttUp() {
    if (rtcStatus !== "connected") return;
    if (!audioTrackRef.current) return;

    audioTrackRef.current.enabled = false;
    setPttHeld(false);

    // 放開 => commit + 請 AI 回覆（純音訊、短句、省錢）
    try {
      dcRef.current?.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      log("📡 傳送給 AI");
      dcRef.current?.send(
        JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio"],
            max_output_tokens: 80,
            instructions:
              "你是客戶，請用非常短的 1~2 句繁體中文回覆（每句<=18字，總<=36字）。",
          },
        })
      );
    } catch {
      log("PTT send failed ❌");
    }
  }

  // iOS/Android：避免手指滑出按鈕後卡住
  useEffect(() => {
    const up = () => {
      if (pttHeld) pttUp();
    };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pttHeld, rtcStatus]);

  function formatMMSS(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const personaReady = micStatus === "ready";

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
        <h1 style={{ marginTop: 0 }}>語音模擬對話（MVP）</h1>

        <p style={{ color: "#475569", lineHeight: 1.7, marginTop: 8 }}>
          流程：先啟用麥克風 → 選擇客戶人設 → 開始即時對話 → 按住說話 / 放開送出（省錢）。
        </p>

        {/* Persona selector */}
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10 }}>客戶人設（進入對話前先選）</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>客戶聲音</div>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value as VoiceId)}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1" }}
              >
                {voiceOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>性別</div>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "男" | "女")}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1" }}
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>年齡</div>
              <input
                type="number"
                min={20}
                max={70}
                value={age}
                onChange={(e) => setAge(Number(e.target.value || 35))}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>職業</div>
              <select
                value={job}
                onChange={(e) => setJob(e.target.value as Job)}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1" }}
              >
                {jobOptions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>對保險態度</div>
              <select
                value={attitude}
                onChange={(e) => setAttitude(e.target.value as AttitudeId)}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1" }}
              >
                {attitudeOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>對話姿態（四種）</div>
              <select
                value={posture}
                onChange={(e) => setPosture(e.target.value as PostureId)}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1" }}
              >
                {postureOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}（{p.hint}）
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
            * 回覆會被限制為「最多 2 句、每句 ≤18 字、總 ≤36 字」以降低成本。
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={enableMic}
              disabled={micStatus === "requesting" || micStatus === "ready"}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "none",
                background: "#16a34a",
                color: "white",
                fontWeight: 800,
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
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: "white",
                cursor: "pointer",
                opacity: micStatus !== "ready" ? 0.6 : 1,
                fontWeight: 700,
              }}
            >
              停止麥克風
            </button>

            <button
              onClick={startRealtime}
              disabled={micStatus !== "ready" || rtcStatus === "starting" || rtcStatus === "connected"}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "none",
                background: "#7c3aed",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                opacity:
                  micStatus !== "ready" || rtcStatus === "starting" || rtcStatus === "connected"
                    ? 0.6
                    : 1,
              }}
            >
              開始即時對話
            </button>

            <button
              onClick={endRealtime}
              disabled={rtcStatus !== "connected" && rtcStatus !== "starting"}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: "white",
                cursor: "pointer",
                opacity: rtcStatus !== "connected" && rtcStatus !== "starting" ? 0.6 : 1,
                fontWeight: 700,
              }}
            >
              結束
            </button>
          </div>

          {micError ? (
            <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>{micError}</div>
          ) : null}

          <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 }}>
            <div>
              <strong>狀態：</strong> {rtcStatus}
            </div>
            <div>
              <strong>AI 音軌：</strong> {hasRemoteAudio ? "✅" : "—"}
            </div>
            <div>
              <strong>剩餘：</strong> {rtcStatus === "connected" ? formatMMSS(remainingSec) : "06:00"}
            </div>
          </div>

          {/* Push to talk */}
          <div style={{ marginTop: 14 }}>
            <button
              onMouseDown={pttDown}
              onMouseUp={pttUp}
              onTouchStart={pttDown}
              onTouchEnd={pttUp}
              disabled={rtcStatus !== "connected" || !personaReady}
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: 18,
                border: "none",
                background: rtcStatus === "connected" ? (pttHeld ? "#0f172a" : "#2563eb") : "#94a3b8",
                color: "white",
                fontWeight: 900,
                fontSize: 18,
                cursor: rtcStatus === "connected" ? "pointer" : "not-allowed",
              }}
            >
              {rtcStatus !== "connected"
                ? "請先開始即時對話"
                : pttHeld
                ? "放開送出給 AI"
                : "按住說話（Push-to-Talk）"}
            </button>

            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              * 省錢策略：只在你「按住」時送音；AI 回覆固定短句。
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div
          style={{
            marginTop: 18,
            padding: 18,
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
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 999,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          下一句提示
        </button>

        {/* Note */}
        <div style={{ marginTop: 18 }}>
          <label htmlFor="note" style={{ display: "block", marginBottom: 8, fontWeight: 800 }}>
            今日自我回饋
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例：語速要再放慢一點、先問需求再講方案"
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #cbd5f5",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Debug log */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>日誌（可之後關掉）</div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: 12,
              background: "#0b1220",
              color: "#e2e8f0",
              fontSize: 12,
              lineHeight: 1.5,
              maxHeight: 280,
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {logLines.length ? logLines.join("\n") : "尚無日誌。"}
          </div>
        </div>
      </section>
    </main>
  );
}
