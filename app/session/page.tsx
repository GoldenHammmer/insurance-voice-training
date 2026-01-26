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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function SessionPage() {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [note, setNote] = useState("");

  // 人設
  const [gender, setGender] = useState<PersonaGender>("male");
  const [age, setAge] = useState<PersonaAge>("38");
  const [job, setJob] = useState<PersonaJob>("factory");
  const [attitude, setAttitude] = useState<PersonaAttitude>("neutral");
  const [posture, setPosture] = useState<PersonaPosture>("doubt_motive");
  const [topic, setTopic] = useState<SimTopic>("appointment");

  // mic
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micError, setMicError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  // rtc
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [rtcStatus, setRtcStatus] = useState<RtcStatus>("idle");
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  // push to talk
  const [isHolding, setIsHolding] = useState(false);

  // 6 minutes limit
  const LIMIT_SEC = 6 * 60;
  const [remainingSec, setRemainingSec] = useState<number>(LIMIT_SEC);
  const timerRef = useRef<number | null>(null);

  function log(msg: string) {
    setLogLines((prev) => {
      const line = `[${nowTime()}] ${msg}`;
      return [line, ...prev].slice(0, 200);
    });
  }

  const nextPrompt = () => setCurrentPrompt((p) => (p + 1) % prompts.length);

  const topicText = useMemo(() => {
    switch (topic) {
      case "appointment":
        return "電話約訪：你剛接到保險顧問來電，對方想約你見面。你可拒絕或保留。";
      case "product":
        return "行銷保險商品：對方介紹保險商品，你會問費用/保障/理賠條件，用短句回。";
      case "relationship":
        return "客情培養：對方以關心與服務為主，你會聊天但保留界線，觀察動機。";
      default:
        return "";
    }
  }, [topic]);

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
      neutral: "中立：願意聽但不喜歡被推銷",
      skeptical: "懷疑：怕被話術、會質疑動機",
      price_sensitive: "價格敏感：很在意保費負擔",
      already_has: "已有保單：覺得自己差不多夠了",
      avoid_talk: "抗拒：不想談保險、想結束對話",
    };

    const postureRuleMap: Record<PersonaPosture, string> = {
      doubt_motive: "姿態：質疑業務動機（常問是不是要賣我）。",
      cant_refuse: "姿態：不敢拒絕但不答應（常說我再看看/問家人）。",
      data_only: "姿態：只要數據與邏輯（追問保障/保費/條件）。",
      change_topic: "姿態：轉移話題/敷衍（想快結束）。",
    };

    return {
      genderText,
      jobText: jobTextMap[job],
      attitudeText: attitudeTextMap[attitude],
      postureRule: postureRuleMap[posture],
    };
  }, [gender, job, attitude, posture]);

  // ✅ 超短 persona reminder：每次 response 都塞這個（強制生效、很省 token）
  const personaReminder = useMemo(() => {
    // 盡量短，避免貴
    return `你=台灣保險客戶；${personaText.genderText}${age}歲；${personaText.jobText}；${personaText.attitudeText}；${personaText.postureRule}；主題：${topicText}；永遠繁中；每次最多2句、每句<=18字、總<=36字；別問「想聊什麼」；別說你在扮演什麼，被問人設就反問或敷衍。`;
  }, [personaText, age, topicText]);

  // ✅ 完整 system：第一次 session.update 用（比較長）
  const systemInstructions = useMemo(() => {
    return [
      "【語言】永遠繁體中文（台灣用語），不得英文/簡體。",
      "【身份】你是台灣一般民眾『保險客戶』，不是助理。",
      "【禁止】不要問『你想聊什麼』、『今天聊什麼』。",
      "【短句省錢】每次回覆最多 2 句；每句<=18字；總<=36字；不要列點；不要長解釋。",
      `【主題】${topicText}`,
      `【人設】性別${personaText.genderText}，年齡${age}，職業${personaText.jobText}。`,
      `【看法】${personaText.attitudeText}`,
      `【姿態(隱藏)】${personaText.postureRule}`,
      "【反防呆】如果使用者問『你的人設是什麼』，你要像客戶一樣回：『你問這個幹嘛？你要講重點嗎？』等，不可跳出角色。",
      "【開場】連線成功後先像客戶回一句：『你好，你哪位？』或『你是做保險的？』",
    ].join("\n");
  }, [topicText, personaText, age]);

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

  function cleanupRealtime() {
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
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          log("⏱️ 已達 6 分鐘上限，自動結束");
          endRealtime();
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function setMicTrackEnabled(enabled: boolean) {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

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
      const tokenRes = await fetch("/api/session/demo/ephemeral", { method: "POST" });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        log(`Ephemeral error ❌: ${JSON.stringify(tokenJson).slice(0, 280)}`);
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
        log(`Realtime ${pc.connectionState}`);
        if (pc.connectionState === "connected") setRtcStatus("connected");
        if (pc.connectionState === "failed") setRtcStatus("failed");
        if (pc.connectionState === "closed") setRtcStatus("ended");
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = async () => {
        log("DataChannel open ✅");

        // session.update：只 audio、關掉 transcription、turn_detection null
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["audio"],
            voice: gender === "male" ? "alloy" : "verse",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: null,
            instructions: systemInstructions,
          },
        };

        dc.send(JSON.stringify(sessionUpdate));
        log("Sent session.update ✅");

        // ✅ 等一下再開場，避免 race condition
        await sleep(200);

        // ✅ 強制 persona 生效：這回合也塞 reminder（短）
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio"],
              max_output_tokens: 80,
              instructions: personaReminder + "。請用客戶身分先回一句開場話。",
            },
          })
        );
        log("AI opening… 🔊");

        startTimer();
      };

      dc.onmessage = (evt) => {
        try {
          const data = JSON.parse(String(evt.data || "{}"));
          const t = data?.type || "unknown";
          if (t === "response.done") {
            const status = data?.response?.status;
            log(`AI responded (${status}) ✅`);
            if (status === "failed") log(`AI error: ${JSON.stringify(data).slice(0, 260)}`);
            return;
          }
          if (t === "output_audio_buffer.stopped") {
            log("AI audio done 🔇");
            return;
          }
        } catch {}
      };

      dc.onclose = () => log("DataChannel closed");
      dc.onerror = () => log("DataChannel error ❌");

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

      // local tracks default off (push-to-talk)
      streamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        pc.addTrack(track, streamRef.current!);
      });

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

    // ✅ 每回合都塞超短 personaReminder，避免漂移（很省）
    try {
      dcRef.current?.send(
        JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio"],
            max_output_tokens: 80,
            instructions: personaReminder,
          },
        })
      );
      log("📡 傳送給 AI");
    } catch (e: any) {
      log(`Send failed ❌: ${String(e)}`);
    }
  }

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

        {/* 人設 */}
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10 }}>人設設定（客戶）</div>

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

          <div style={{ marginTop: 10, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            ✅ 目前：{personaText.genderText}/{age}歲/{personaText.jobText}/{personaText.attitudeText}（{personaText.postureRule}）
          </div>
        </div>

        {/* 控制 */}
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
            onClick={startRealtime}
            disabled={micStatus !== "ready" || rtcStatus === "starting" || rtcStatus === "connected"}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 800,
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
              fontWeight: 800,
              cursor: "pointer",
              opacity: rtcStatus !== "connected" && rtcStatus !== "starting" ? 0.6 : 1,
            }}
          >
            結束
          </button>

          <div style={{ alignSelf: "center", fontSize: 13, color: "#334155" }}>
            <strong>剩餘：</strong> {mm}:{ss}　<strong>狀態：</strong> {rtcStatus} {hasRemoteAudio ? "✅" : ""}
          </div>
        </div>

        {/* Push-to-talk */}
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
              fontWeight: 900,
              fontSize: 16,
              cursor: rtcStatus === "connected" ? "pointer" : "not-allowed",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
            }}
          >
            {rtcStatus !== "connected" ? "請先開始即時對話" : isHolding ? "放開 → 傳送給 AI" : "按住說話（Push-to-Talk）"}
          </button>
        </div>

        {/* 提示 */}
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
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            下一句提示
          </button>
        </div>

        {/* 回饋 */}
        <div style={{ marginTop: 18 }}>
          <label htmlFor="note" style={{ display: "block", marginBottom: 8, fontWeight: 800 }}>
            今日自我回饋
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：語速要再慢、先問需求、不要急著約"
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

        {/* 日誌 */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>連線日誌（Debug）</div>
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
