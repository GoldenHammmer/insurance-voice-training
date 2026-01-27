"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type Gender = "male" | "female";
type Attitude = "neutral" | "skeptical" | "data_only" | "avoidant";
type Topic = "phone_invite" | "product_marketing" | "relationship";

export default function SessionPage() {
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(38);
  const [job, setJob] = useState("工廠技術人員");
  const [attitude, setAttitude] = useState<Attitude>("neutral");
  const [topic, setTopic] = useState<Topic>("phone_invite");

  const [micReady, setMicReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const personaReadyRef = useRef(false);

  function log(msg: string) {
    setLogLines((p) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 120));
  }

  async function enableMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    setMicReady(true);
    log("Mic ready ✅");
  }

  // 關鍵修改點1：buildPersona函數保持不變，但我們會在不同地方使用它
  function buildPersona() {
    return `
你是【台灣的保險客戶】，不是業務員。

基本資料：
- 性別：${gender === "male" ? "男性" : "女性"}
- 年齡：${age} 歲
- 職業：${job}
- 地區：台灣
- 語言：繁體中文（台灣口吻）

態度：
${attitude === "neutral" ? "中立，願意聽但不主動買" : ""}
${attitude === "skeptical" ? "質疑業務動機" : ""}
${attitude === "data_only" ? "只接受數據" : ""}
${attitude === "avoidant" ? "轉移話題想結束" : ""}

情境：
${topic === "phone_invite" ? "電話約訪" : ""}
${topic === "product_marketing" ? "行銷保險商品" : ""}
${topic === "relationship" ? "客情培養" : ""}

規則：
- 永遠使用繁體中文
- 每次只回 1～2 句
- 每句不超過 20 字
- 不主動開話題
- 不可跳出角色
`;
  }

  async function startRealtime() {
    if (!streamRef.current) return;

    log("Starting realtime…");

    const tokenRes = await fetch("/api/session/demo/ephemeral", { method: "POST" });
    const tokenJson = await tokenRes.json();
    const secret = tokenJson?.client_secret?.value;
    if (!secret) return;

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.muted = true;
    audio.setAttribute("playsinline", "true");
    audioRef.current = audio;

    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
      log("AI track received (muted)");
    };

    streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!));

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;

    dc.onopen = () => {
      log("DataChannel open ✅");

      // 關鍵修改點2：在session.update中設定完整的persona
      // 這是AI的基礎身份設定
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: "alloy",
            instructions: buildPersona(),
            max_output_tokens: 60,
            // 可選：如果你想要更精確的控制，可以加上這行
            // turn_detection: null,
          },
        })
      );

      personaReadyRef.current = true;
      audio.muted = false;
      log("Persona injected & audio unmuted ✅");
    };

    // 關鍵修改點3：加強事件監聽，幫助你診斷問題
    dc.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      // 記錄所有重要事件
      if (data.type === "session.updated") {
        log("Session updated confirmed ✅");
      }
      
      if (data.type === "response.done") {
        log("AI responded ✅");
      }
      
      // 如果有錯誤，立刻顯示
      if (data.type === "error") {
        log("❌ Error: " + JSON.stringify(data.error));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      }
    );

    const answer = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });

    setConnected(true);
    log("Realtime connected ✅");
  }

  function startTalk() {
    log("🎙️ 開始說話");
  }

  // 關鍵修改點4：這是整個方案三的核心修改
  // 我們有兩個版本讓你選擇
  function stopTalk() {
    if (!dcRef.current || !personaReadyRef.current) return;

    log("📡 傳送給 AI");

    // 版本A：完全移除instructions，讓AI依賴session層級的設定
    // 這是最簡潔的做法，也是我建議你先測試的版本
    dcRef.current.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          // 注意：這裡完全沒有instructions欄位
          // AI會使用你在session.update中設定的完整persona
        },
      })
    );

    // 版本B：如果版本A還是不夠，就用這個版本
    // 在每次回應時重複提醒AI的完整身份
    // 使用這個版本時，請把上面的版本A註解掉
    /*
    dcRef.current.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: buildPersona() + "\n\n現在請依照以上角色設定簡短回應。",
        },
      })
    );
    */
  }

  function endRealtime() {
    dcRef.current?.close();
    pcRef.current?.close();
    setConnected(false);
    log("Session ended ⛔");
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Link href="/">← 回首頁</Link>

      <h1>保險語音模擬</h1>

      <section>
        <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
          <option value="male">男性</option>
          <option value="female">女性</option>
        </select>

        <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} />
        <input value={job} onChange={(e) => setJob(e.target.value)} />

        <select value={attitude} onChange={(e) => setAttitude(e.target.value as Attitude)}>
          <option value="neutral">中立</option>
          <option value="skeptical">質疑</option>
          <option value="data_only">只看數據</option>
          <option value="avoidant">轉移話題</option>
        </select>

        <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
          <option value="phone_invite">電話約訪</option>
          <option value="product_marketing">商品行銷</option>
          <option value="relationship">客情培養</option>
        </select>
      </section>

      <section style={{ marginTop: 16 }}>
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

      <pre style={{ marginTop: 24, background: "#111", color: "#0f0", padding: 12 }}>
        {logLines.join("\n")}
      </pre>
    </main>
  );
}
