"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

type Gender = "male" | "female";
type Attitude = "neutral" | "skeptical" | "data_only" | "avoidant";
type Topic = "phone_invite" | "product_marketing" | "relationship";

// 新增：用來儲存對話歷史的資料結構
type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export default function SessionPage() {
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(38);
  const [job, setJob] = useState("工廠技術人員");
  const [attitude, setAttitude] = useState<Attitude>("neutral");
  const [topic, setTopic] = useState<Topic>("phone_invite");

  const [micReady, setMicReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  
  // 新增：時間倒數相關狀態
  const [timeRemaining, setTimeRemaining] = useState(300); // 5分鐘 = 300秒
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // 新增：對話歷史和心理分析
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [psychologicalFeedback, setPsychologicalFeedback] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const personaReadyRef = useRef(false);
  
  // 新增：用來追蹤當前使用者的發言內容（語音轉文字）
  const currentUserSpeechRef = useRef<string>("");

  function log(msg: string) {
    setLogLines((p) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 120));
  }

  // 新增：倒數計時器
  useEffect(() => {
    if (!isTimerActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // 時間到，自動結束session
          log("⏰ 練習時間結束，自動終止");
          endRealtime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeRemaining]);

  // 格式化時間顯示
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function enableMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    setMicReady(true);
    log("Mic ready ✅");
  }

  function buildPersona() {
    // 這是改良版的persona，加入了更多細節和明確的行為指示
    return `
你是【台灣的保險客戶】，不是業務員，也不是AI助理。

基本資料：
- 性別：${gender === "male" ? "男性" : "女性"}
- 年齡：${age} 歲
- 職業：${job}
- 地區：台灣
- 語言：繁體中文（使用台灣口語習慣）

對保險的態度：
${attitude === "neutral" ? "中立態度 - 願意聽業務員說明，但不會主動表達興趣，會保持禮貌但觀望的態度" : ""}
${attitude === "skeptical" ? "質疑態度 - 對保險業務抱持懷疑，認為業務員只想賺佣金，會用反問句質疑動機，語氣帶著戒心和不耐煩" : ""}
${attitude === "data_only" ? "數據導向 - 只接受具體數字和證據，對感性訴求完全無感，會直接要求看保單內容和費率，不想聽故事" : ""}
${attitude === "avoidant" ? "迴避態度 - 想盡快結束對話，會說自己很忙、改天再說，或轉移話題，找各種理由推託" : ""}

當前情境：
${topic === "phone_invite" ? "你接到業務員打來的電話約訪，想約你見面詳談" : ""}
${topic === "product_marketing" ? "業務員正在電話中向你介紹保險商品，想推銷給你" : ""}
${topic === "relationship" ? "業務員打電話進行客情維護，關心你的近況" : ""}

重要行為規則：
- 永遠使用繁體中文，保持台灣人的口語風格
- 每次回應只說 1～2 句話
- 每句話不超過 20 個字
- 不主動開啟新話題，只回應業務員的問題
- 絕對不可以跳出客戶角色
- 當業務員問到你的年齡、職業等基本資料時，要根據上述設定如實回答
- 不要說「我是AI」或任何暴露AI身份的話
- 保持真實客戶會有的反應，包括猶豫、思考、拒絕等
`;
  }

  async function startRealtime() {
    if (!streamRef.current) return;

    log("Starting realtime…");

    // 重置狀態
    setTimeRemaining(300);
    setConversationHistory([]);
    setPsychologicalFeedback([]);
    currentUserSpeechRef.current = "";

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

      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: "alloy",
            instructions: buildPersona(),
            // 關鍵：開啟transcript功能，這樣我們才能取得對話的文字內容
            input_audio_transcription: {
              model: "whisper-1"
            }
          },
        })
      );

      personaReadyRef.current = true;
      audio.muted = false;
      log("Persona injected & audio unmuted ✅");
    };

    dc.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === "session.updated") {
        log("Session updated confirmed ✅");
        // 連線成功後啟動計時器
        setIsTimerActive(true);
      }
      
      // 捕捉使用者的語音轉文字內容
      if (data.type === "conversation.item.input_audio_transcription.completed") {
        const userText = data.transcript;
        currentUserSpeechRef.current = userText;
        log(`📝 您說: ${userText}`);
        
        // 記錄到對話歷史
        setConversationHistory(prev => [...prev, {
          role: "user",
          content: userText,
          timestamp: new Date()
        }]);
      }
      
      // 捕捉AI的文字回應
      if (data.type === "response.text.done") {
        const aiText = data.text;
        log(`🤖 客戶回應: ${aiText}`);
        
        // 記錄到對話歷史
        setConversationHistory(prev => [...prev, {
          role: "assistant",
          content: aiText,
          timestamp: new Date()
        }]);
        
        // 進行心理分析（這裡我們會呼叫分析函數）
        analyzeInteraction(currentUserSpeechRef.current, aiText);
      }
      
      if (data.type === "response.done") {
        log("AI responded ✅");
      }
      
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

  // 新增：心理分析函數
  // 這個函數會分析業務員的話術，並給予基於薩提爾模式的回饋
  function analyzeInteraction(userSpeech: string, aiResponse: string) {
    const feedback: string[] = [];
    
    // 分析指責姿態（Blaming）的跡象
    // 當業務員使用「你應該」「你一定要」等強迫性語言時
    if (userSpeech.includes("你應該") || userSpeech.includes("一定要") || 
        userSpeech.includes("必須") || userSpeech.includes("怎麼可以")) {
      feedback.push("⚠️ 這句話帶有強烈的命令感，可能讓客戶感到被指責或壓迫");
    }
    
    // 分析討好姿態（Placating）的跡象
    // 當業務員過度道歉或貶低自己時
    if ((userSpeech.match(/對不起|抱歉|不好意思/g) || []).length > 2) {
      feedback.push("💡 過度道歉可能讓你顯得不夠專業，適度的禮貌即可");
    }
    
    // 分析超理智姿態（Super-reasonable）的跡象
    // 當業務員只談數據和邏輯，忽略情感連結時
    if (userSpeech.includes("根據數據") || userSpeech.includes("統計顯示") || 
        userSpeech.includes("事實證明")) {
      // 這個要看客戶的態度，如果客戶是data_only就是對的
      if (attitude !== "data_only") {
        feedback.push("💭 純粹的數據陳述可能顯得冷漠，可以加入一些同理心的表達");
      }
    }
    
    // 分析打岔姿態（Irrelevant）的跡象
    // 當業務員說的話跟客戶的回應沒有關聯時
    if (aiResponse.includes("很忙") || aiResponse.includes("沒時間") || 
        aiResponse.includes("改天")) {
      if (userSpeech.includes("商品") || userSpeech.includes("保險")) {
        feedback.push("⚡ 客戶想迴避話題，你可能需要先建立信任感，而不是直接推銷");
      }
    }
    
    // 分析一致性溝通（Congruent）的正面跡象
    if (userSpeech.includes("我理解") || userSpeech.includes("我明白")) {
      feedback.push("✅ 展現同理心是很好的開始，有助於建立信任");
    }
    
    // 分析客戶的戒心反應
    if (aiResponse.includes("推銷") || aiResponse.includes("業務") || 
        aiResponse.includes("賺錢") || aiResponse.includes("佣金")) {
      feedback.push("🚨 客戶的戒心被提起了，你的用詞可能太過商業化或急於成交");
    }
    
    // 分析客戶的抗拒反應
    if (aiResponse.includes("不需要") || aiResponse.includes("不用了") || 
        aiResponse.includes("沒興趣")) {
      feedback.push("🛑 客戶表達明確的拒絕，可以嘗試轉換話題或詢問真正的顧慮");
    }
    
    // 只有當有回饋時才更新狀態
    if (feedback.length > 0) {
      setPsychologicalFeedback(prev => [...feedback, ...prev].slice(0, 10)); // 只保留最近10條
    }
  }

  function startTalk() {
    log("🎙️ 開始說話");
  }

  function stopTalk() {
    if (!dcRef.current || !personaReadyRef.current) return;

    log("📡 傳送給 AI");

    // 使用版本A：完全依賴session層級的persona設定
    dcRef.current.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
        },
      })
    );
  }

  function endRealtime() {
    dcRef.current?.close();
    pcRef.current?.close();
    setConnected(false);
    setIsTimerActive(false);
    log("Session ended ⛔");
  }

  return (
    <main style={{ 
      maxWidth: 1200, 
      margin: "0 auto", 
      padding: 32,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      <Link href="/" style={{ 
        color: "#0066cc", 
        textDecoration: "none",
        fontSize: 14
      }}>
        ← 回首頁
      </Link>

      <h1 style={{ 
        fontSize: 32, 
        marginTop: 20, 
        marginBottom: 30,
        color: "#1a1a1a"
      }}>
        🎯 保險業務模擬訓練
      </h1>

      {/* 優化後的UI介面 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 30,
        marginBottom: 30
      }}>
        {/* 左側：客戶人設設定 */}
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ 
            fontSize: 20, 
            marginTop: 0, 
            marginBottom: 20,
            color: "#2d3436"
          }}>
            👤 客戶人設設定
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: "#636e72"
            }}>
              性別
            </label>
            <select 
              value={gender} 
              onChange={(e) => setGender(e.target.value as Gender)}
              disabled={connected}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: connected ? "#f5f5f5" : "white",
                cursor: connected ? "not-allowed" : "pointer"
              }}
            >
              <option value="male">👨 男性</option>
              <option value="female">👩 女性</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: "#636e72"
            }}>
              年齡
            </label>
            <input 
              type="number" 
              value={age} 
              onChange={(e) => setAge(+e.target.value)}
              disabled={connected}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: connected ? "#f5f5f5" : "white"
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: "#636e72"
            }}>
              職業
            </label>
            <input 
              value={job} 
              onChange={(e) => setJob(e.target.value)}
              disabled={connected}
              placeholder="例如：工廠技術人員"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: connected ? "#f5f5f5" : "white"
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: "#636e72"
            }}>
              對保險的態度
            </label>
            <select 
              value={attitude} 
              onChange={(e) => setAttitude(e.target.value as Attitude)}
              disabled={connected}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: connected ? "#f5f5f5" : "white",
                cursor: connected ? "not-allowed" : "pointer"
              }}
            >
              <option value="neutral">😐 中立（願意聽但觀望）</option>
              <option value="skeptical">🤨 質疑（懷疑動機、有戒心）</option>
              <option value="data_only">📊 數據導向（只看數字不聽故事）</option>
              <option value="avoidant">🚶 迴避（想快點結束對話）</option>
            </select>
          </div>

          <div style={{ marginBottom: 0 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: "#636e72"
            }}>
              演練方向
            </label>
            <select 
              value={topic} 
              onChange={(e) => setTopic(e.target.value as Topic)}
              disabled={connected}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: connected ? "#f5f5f5" : "white",
                cursor: connected ? "not-allowed" : "pointer"
              }}
            >
              <option value="phone_invite">📞 電話約訪</option>
              <option value="product_marketing">💼 商品推銷</option>
              <option value="relationship">☕ 客情維護</option>
            </select>
          </div>
        </div>

        {/* 右側：控制面板 */}
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ 
            fontSize: 20, 
            marginTop: 0, 
            marginBottom: 20,
            color: "#2d3436"
          }}>
            🎮 控制面板
          </h2>

          {/* 時間顯示 */}
          {connected && (
            <div style={{
              background: timeRemaining < 60 ? "#fff3cd" : "#e3f2fd",
              padding: 16,
              borderRadius: 8,
              marginBottom: 20,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 14, color: "#636e72", marginBottom: 4 }}>
                剩餘時間
              </div>
              <div style={{ 
                fontSize: 36, 
                fontWeight: 700,
                color: timeRemaining < 60 ? "#e67e22" : "#0984e3"
              }}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            {!micReady && (
              <button 
                onClick={enableMic}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "white",
                  background: "#0984e3",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer"
                }}
              >
                🎤 啟用麥克風
              </button>
            )}
            
            {micReady && !connected && (
              <button 
                onClick={startRealtime}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "white",
                  background: "#00b894",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer"
                }}
              >
                ▶️ 開始模擬（5分鐘）
              </button>
            )}
            
            {connected && (
              <>
                <button 
                  onMouseDown={startTalk} 
                  onMouseUp={stopTalk}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "white",
                    background: "#d63031",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    marginBottom: 12
                  }}
                >
                  🎙️ 按住說話
                </button>
                
                <button 
                  onClick={endRealtime}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "white",
                    background: "#636e72",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer"
                  }}
                >
                  ⏹️ 結束模擬
                </button>
              </>
            )}
          </div>

          {/* 心理教練回饋 */}
          {psychologicalFeedback.length > 0 && (
            <div style={{
              background: "#fff9e6",
              border: "1px solid #ffe0b2",
              borderRadius: 8,
              padding: 16,
              marginTop: 20
            }}>
              <h3 style={{
                fontSize: 16,
                marginTop: 0,
                marginBottom: 12,
                color: "#e67e22"
              }}>
                💡 教練回饋
              </h3>
              {psychologicalFeedback.map((feedback, idx) => (
                <div 
                  key={idx}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 8,
                    padding: 8,
                    background: "white",
                    borderRadius: 4
                  }}
                >
                  {feedback}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 系統日誌 */}
      <div style={{
        background: "#1a1a1a",
        borderRadius: 12,
        padding: 20,
        marginTop: 30
      }}>
        <h3 style={{
          fontSize: 16,
          marginTop: 0,
          marginBottom: 12,
          color: "#00ff00"
        }}>
          📋 系統日誌
        </h3>
        <pre style={{ 
          margin: 0,
          color: "#00ff00",
          fontSize: 12,
          lineHeight: 1.6,
          maxHeight: 300,
          overflow: "auto"
        }}>
          {logLines.join("\n")}
        </pre>
      </div>
    </main>
  );
}
