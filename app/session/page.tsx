"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MicStatus = "idle" | "requesting" | "ready" | "denied" | "error";
type RtcStatus = "idle" | "starting" | "connected" | "failed" | "ended";

type PersonaGender = "male" | "female";
type PersonaAge = "28" | "38" | "45" | "55";
type PersonaJob = "factory" | "office" | "self_employed" | "teacher" | "healthcare";
type PersonaAttitude = "neutral" | "skeptical" | "price_sensitive" | "already_has" | "avoid_talk";
type PersonaPosture = "doubt_motive" | "cant_refuse" | "data_only" | "change_topic";
type SimTopic = "appointment" | "product" | "relationship";

const prompts = [
  "用一句話向客戶自我介紹，說明你是專業保險顧問。",
  "詢問客戶目前最在意的保障需求是什麼。",
  "簡短說明這份保單能解決的風險與保障特色。",
];

function nowTime() {
  return new Date().toLocaleTimeString();
}

export default function SessionPage() {
  // ===== 練習提示 =====
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [note, setNote] = useState("");

  // ===== 人設選擇（使用者可選）=====
  const [gender, setGender] = useState<PersonaGender>("male");
  const [age, setAge] = useState<PersonaAge>("38");
  const [job, setJob] = useState<PersonaJob>("factory");
  const [attitude, setAttitude] = useState<PersonaAttitude>("neutral");
  const [posture, setPosture] = useState<PersonaPosture>("doubt_motive");
  const [topic, setTopic] = useState<SimTopic>("appointment");

  // ===== 麥克風 =====
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micError, setMicError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  // ===== WebRTC / Realtime =====
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [rtcStatus, setRtcStatus] = useState<RtcStatus>("idle");
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  // ===== Push-to-talk =====
  const [isHolding, setIsHolding] = useState(false);

  // ===== 6 分鐘上限 =====
  const LIMIT_SEC = 6 * 60;
  const [remainingSec, setRemainingSec] = useState<number>(LIMIT_SEC);
  const timerRef = useRef<number | null>(null);

  function log(msg: string) {
    setLogLines((prev) => {
      const line = `[${nowTime()}] ${msg}`;
      return [line, ...prev].slice(0, 160);
    });
  }

  const nextPrompt = () => setCurrentPrompt((p) => (p + 1) % prompts.length);

  // ===== 對話主題文字 =====
  const topicText = useMemo(() => {
    switch (topic) {
      case "appointment":
        return "電話約訪：你剛接到保險顧問來電，對方想約你見面。你要像一般客戶回應、可拒絕或保留。";
      case "product":
        return "行銷保險商品：對方正在介紹某個保險商品，你會問重點、疑慮、費用、保障，並用短句回覆。";
      case "relationship":
        return "客情培養：對方以關心與服務為主（非硬推銷）。你會聊天但保留界線，觀察對方動機。";
      default:
        return "";
    }
  }, [topic]);

  // ===== 人設文字 =====
  const personaText = useMemo(() => {
    const genderText = gender === "male" ? "男" : "女";

    const jobTextMap: Record<PersonaJob, string> = {
      factory: "工廠/製造業",
      office: "一般上班族",
      self_employed: "自營/小店老闆",
      teacher: "教育相關",
      healthcare: "醫療相關",
    };

    const attitudeTextMap: Record<PersonaAttitude, string> = {
      neutral: "中立：願意聽，但不喜歡被推銷",
      skeptical: "懷疑：容易質疑業務動機，怕被話術",
      price_sensitive: "價格敏感：很在意保費負擔與CP值",
      already_has: "已有保單：覺得自己差不多夠了",
      avoid_talk: "抗拒：不想談保險，容易想結束對話",
    };

    const postureRuleMap: Record<PersonaPosture, string> = {
      doubt_motive:
        "姿態（藏在你心裡）：你會質疑對方動機，常用『你是不是要賣我東西？』『我先看看』這類話。",
      cant_refuse:
        "姿態（藏在你心裡）：你不太會拒絕，但也不答應，常用『我再想想』『我問一下家人』拖延。",
      data_only:
        "姿態（藏在你心裡）：你只接受數據與邏輯，常追問『保障多少？保費多少？理賠條件？』。",
      change_topic:
        "姿態（藏在你心裡）：你常轉移話題/敷衍，想把對話帶走或快速結束。",
    };

    return {
      genderText,
      jobText: jobTextMap[job],
      attitudeText: attitudeTextMap[attitude],
      postureRule: postureRuleMap[posture],
    };
  }, [gender, job, attitude, posture]);

  // ===== System 指令：一次寫進 session.update（後續回合不覆蓋）=====
  const systemInstructions = useMemo(() => {
    const { genderText, jobText, attitudeText, postureRule } = personaText;

    // 超省錢短句規則（你要的重點）
    const shortRule =
      "【重要規則】每次回覆最多 2 句；每句不超過 18 個字；總字數不超過 36 字；不要列點；不要長篇解釋。";

    // 語言鎖定與禁止通用開場（你遇到的問題）
    const langRule =
      "【重要規則】你必須永遠使用「繁體中文（台灣用語）」回覆，不得使用英文或簡體。";
    const roleRule =
      "【重要規則】你正在扮演「台灣一般民眾的保險客戶」，不是聊天助理。";
    const noGenericOpen =
      "【重要規則】你不要問『你今天想聊什麼』『想聊什麼主題』這類通用開場。";

    // 主題導向（你新增的）
    const topicRule =
      `【模擬對話主題】${topicText}\n` +
      "你必須在這個主題框架下回話，不要跳到別的主題。";

    // 開場規則（連上就先像客戶回一句）
    const opening =
      "【開場】連線建立後，你先用客戶身分自然回一句（例：『你好，你找我什麼事？』或『你是做保險的？』），不要問主題。";

    return [
      langRule,
      roleRule,
      noGenericOpen,
      shortRule,
      topicRule,
      "",
      `基本資料：性別${genderText}，年齡${age}歲，職業：${jobText}。`,
      `對保險看法：${personaText.attitudeText}`,
      postureRule,
      "",
      "情境：使用者是保險顧問，正在用口語跟你對話。你保持客戶立場，可拒絕、可保留、可要求證據。",
      opening,
    ].join("\n");
  }, [personaText, age, topicText]);

  // ===== 麥克風 =====
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

  function cleanupRealtime() {
    // timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingSec(LIMIT_SEC);
    setIsHolding(false);

    try {
      dcRef.current?.close();
    } catch {}
    dcRef.current = null;

    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    try {
      const a = audioRef.current;
      if (a) {
        a.pause();
        // @ts-ignore
        a.srcObject = null;
      }
    } catch {}
    audioRef.current = null;

    setHasRemoteAudio(false);
  }

  function startTimer() {
    setRemainingSec(LIMIT_SEC);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // auto end
          log("⏱️ 已達 6 分鐘上限，自動結束");
          endRealtime();
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  // ===== 開始 Realtime =====
  async function startRealtime() {
    if (!streamRef.current) {
      alert("請先啟用麥克風");
      return;
    }

    cleanupRealtime();
    setRtcStatus("starting");
    setHasRemoteAudio(false);
    log("Starting realtime…");

    try {
      // 1) 要 ephemeral token
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

      // 2) PeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (!pcRef.current) return;
        log(`Realtime ${pc.connectionState}`);
        if (pc.connectionState === "connected") setRtcStatus("connected");
        if (pc.connectionState === "failed") setRtcStatus("failed");
        if (pc.connectionState === "closed") setRtcStatus("ended");
      };

      // 3) DataChannel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        log("DataChannel open ✅");

        // ✅ 只輸出 audio、關掉 transcription、關掉 server_vad（因為你要 push-to-talk）
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["audio"],
            voice: gender === "male" ? "alloy" : "verse", // 先做男女差異（不追求音色）
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",

            // 關掉轉寫（省錢）
            // input_audio_transcription: undefined,

            // Push-to-talk：不使用 server_vad
            turn_detection: null,

            // 核心：人設 + 主題 + 短句限制（一次寫進 session）
            instructions: systemInstructions,
          },
        };

        dc.send(JSON.stringify(sessionUpdate));
        log("Persona loaded ✅");

        // ✅ 讓 AI 依照 system 開場（不要再塞 instructions）
        const hello = {
          type: "response.create",
          response: {
            modalities: ["audio"],
            max_output_tokens: 80,
          },
        };
        dc.send(JSON.stringify(hello));
        log("AI opening… 🔊");

        // 6 分鐘計時開始
        startTimer();
      };

      dc.onmessage = (evt) => {
        try {
          const data = JSON.parse(String(evt.data || "{}"));
          const t = data?.type || "unknown";

          // 精簡日誌（避免爆量）
          if (t === "response.done") {
            const status = data?.response?.status;
            log(`AI responded (${status}) ✅`);
            // 若 failed，印錯誤
            if (status === "failed") log(`AI error: ${JSON.stringify(data).slice(0, 260)}`);
            return;
          }
          if (t === "output_audio_buffer.stopped") {
            log("AI audio done 🔇");
            return;
          }
          if (t === "rate_limits.updated") {
            return;
          }

          // 其他事件只在 debug 需要時留
          // log(`DC: ${t}`);
        } catch {
          // ignore
        }
      };

      dc.onclose = () => log("DataChannel closed");
      dc.onerror = () => log("DataChannel error ❌");

      // 4) 播放 AI 音訊
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.muted = false;
      audio.volume = 1;
      audioRef.current = audio;

      pc.ontrack = (event) => {
        setHasRemoteAudio(true);
        audio.srcObject = event.streams[0];
        audio
          .play()
          .then(() => log("AI audio playing 🔊"))
          .catch((e) => log(`audio.play blocked: ${String(e)}`));
      };

      // 5) 加入本地音軌（先 enabled=false，等按住再開）
      streamRef.current.getTracks().forEach((track) => {
        track.enabled = false; // push-to-talk 預設關
        pc.addTrack(track, streamRef.current!);
      });

      // 6) SDP
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
        log(`Realtime SDP error ❌: ${errText.slice(0, 320)}`);
        setRtcStatus("failed");
        return;
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      log("Realtime connected ✅");
    } catch (e: any) {
      log(`Start realtime failed ❌: ${String(e)}`);
      setRtcStatus("failed");
    }
  }

  function endRealtime() {
    cleanupRealtime();
    setRtcStatus("ended");
    log("Session ended ⛔");
  }

  // ===== Push-to-talk：按住開始說、放開送出 =====
  function setMicTrackEnabled(enabled: boolean) {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  function pttDown() {
    if (rtcStatus !== "connected") {
      alert("請先開始即時對話");
      return;
    }
    if (!dcRef.current || dcRef.current.readyState !== "open") {
      alert("DataChannel 未就緒");
      return;
    }
    setIsHolding(true);
    setMicTrackEnabled(true);
    log("🎙️ 開始說話");
  }

  function pttUp() {
    if (rtcStatus !== "connected") return;
    setIsHolding(false);
    setMicTrackEnabled(false);

    // 送出回覆請求（不要塞 instructions，避免覆蓋人設）
    try {
      dcRef.current?.send(
        JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio"],
            max_output_tokens: 80, // 省錢：短回覆
          },
        })
      );
      log("📡 傳送給 AI");
    } catch (e: any) {
      log(`Send failed ❌: ${String(e)}`);
    }
  }

  // 防止離開頁面時殘留
  useEffect(() => {
    return () => cleanupRealtime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

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
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          流程：先選人設與主題 → 啟用麥克風 → 開始即時對話 →「按住說話，放開送出」
        </p>

        {/* === 人設選擇（你要的：進入後先選）=== */}
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>人設設定（客戶）</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#334155" }}>性別</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as PersonaGender)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
                disabled={rtcStatus === "connected" || rtcStatus === "starting"}
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#334155" }}>年齡</label>
              <select
                value={age}
                onChange={(e) => setAge(e.target.value as PersonaAge)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
                disabled={rtcStatus === "connected" || rtcStatus === "starting"}
              >
                <option value="28">28</option>
                <option value="38">38</option>
                <option value="45">45</option>
                <option value="55">55</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#334155" }}>職業</label>
              <select
                value={job}
                onChange={(e) => setJob(e.target.value as PersonaJob)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
                disabled={rtcStatus === "connected" || rtcStatus === "starting"}
              >
                <option value="factory">工廠/製造業</option>
                <option value="office">一般上班族</option>
                <option value="self_employed">自營/小店老闆</option>
                <option value="teacher">教育相關</option>
                <option value="healthcare">醫療相關</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#334155" }}>對保險態度</label>
              <select
                value={attitude}
                onChange={(e) => setAttitude(e.target.value as PersonaAttitude)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
                disabled={rtcStatus === "connected" || rtcStatus === "starting"}
              >
                <option value="neutral">中立</option>
                <option value="skeptical">懷疑/怕話術</option>
                <option value="price_sensitive">價格敏感</option>
                <option value="already_has">覺得自己已有</option>
                <option value="avoid_talk">抗拒不想談</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#334155" }}>人格姿態（隱藏）</label>
              <select
                value={posture}
                onChange={(e) => setPosture(e.target.value as PersonaPosture)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
                disabled={rtcStatus === "connected" || rtcStatus === "starting"}
              >
                <option value="doubt_motive">質疑業務動機</option>
                <option value="cant_refuse">不敢拒絕但不答應</option>
                <option value="data_only">只要數據與邏輯</option>
                <option value="change_topic">轉移話題/敷衍</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#334155" }}>模擬對話主題</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as SimTopic)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
                disabled={rtcStatus === "connected" || rtcStatus === "starting"}
              >
                <option value="appointment">1. 電話約訪</option>
                <option value="product">2. 行銷保險商品</option>
                <option value="relationship">3. 客情培養</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            <div>✅ 你目前設定：</div>
            <div>
              {personaText.genderText} / {age} 歲 / {personaText.jobText} / {personaText.attitudeText}
            </div>
            <div>主題：{topicText}</div>
            <div style={{ marginTop: 6 }}>
              ⚠️ 連線中不建議改設定（需要重新開始即時對話才會生效）
            </div>
          </div>
        </div>

        {/* === 麥克風/連線控制 === */}
        <div
          style={{
            marginTop: 16,
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
                fontWeight: 700,
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
                fontWeight: 700,
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
                padding: "10px 14px",
                borderRadius: 999,
                border: "none",
                background: "#2563eb",
                color: "white",
                fontWeight: 700,
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
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: "white",
                fontWeight: 700,
                cursor: "pointer",
                opacity: rtcStatus !== "connected" && rtcStatus !== "starting" ? 0.6 : 1,
              }}
            >
              結束
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#334155", display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div>
              <strong>Mic：</strong>
              {micStatus === "idle" && "未啟用"}
              {micStatus === "requesting" && "請求中…"}
              {micStatus === "ready" && "✅ 已啟用"}
              {micStatus === "denied" && "❌ 被拒絕"}
              {micStatus === "error" && "⚠️ 失敗"}
            </div>
            <div>
              <strong>Realtime：</strong> {rtcStatus} {hasRemoteAudio ? "✅" : ""}
            </div>
            <div>
              <strong>剩餘時間：</strong> {mm}:{ss}
            </div>
          </div>

          {micError && (
            <pre
              style={{
                marginTop: 10,
                padding: 10,
                fontSize: 12,
                background: "#f1f5f9",
                borderRadius: 12,
                whiteSpace: "pre-wrap",
                border: "1px solid #e2e8f0",
              }}
            >
              {micError}
            </pre>
          )}
        </div>

        {/* === Push-to-talk 按鈕 === */}
        <div style={{ marginTop: 16 }}>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              pttDown();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              pttUp();
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              pttUp();
            }}
            onPointerLeave={(e) => {
              // 手指滑出按鈕也視為放開
              if (isHolding) {
                e.preventDefault();
                pttUp();
              }
            }}
            disabled={rtcStatus !== "connected"}
            style={{
              width: "100%",
              padding: "16px 14px",
              borderRadius: 18,
              border: "none",
              background: rtcStatus === "connected" ? (isHolding ? "#0f172a" : "#111827") : "#94a3b8",
              color: "white",
              fontWeight: 800,
              fontSize: 16,
              cursor: rtcStatus === "connected" ? "pointer" : "not-allowed",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
            }}
          >
            {rtcStatus !== "connected" ? "請先開始即時對話" : isHolding ? "放開 → 傳送給 AI" : "按住說話（Push-to-Talk）"}
          </button>
          <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>
            省錢策略：只輸出語音、關閉轉寫、回覆限制 1~2 句短句。
          </div>
        </div>

        {/* === 提示區 === */}
        <div
          style={{
            marginTop: 20,
            padding: 18,
            borderRadius: 16,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <strong>目前提示</strong>
          <p style={{ margin: "8px 0 0", fontSize: 18 }}>{prompts[currentPrompt]}</p>

          <button
            type="button"
            onClick={nextPrompt}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            下一句提示
          </button>
        </div>

        {/* === 自我回饋 === */}
        <div style={{ marginTop: 18 }}>
          <label htmlFor="note" style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
            今日自我回饋
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：語速要再放慢一點、先問需求再講保障、不要急著約時間"
            rows={5}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* === 日誌（保留 debug）=== */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>連線日誌（Debug）</div>
          <div
            style={{
              border: "1px solid #0b1220",
              borderRadius: 14,
              padding: 12,
              background: "#0b1220",
              color: "#e2e8f0",
              fontSize: 12,
              lineHeight: 1.5,
              maxHeight: 320,
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
