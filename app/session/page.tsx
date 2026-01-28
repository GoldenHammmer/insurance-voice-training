"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

type Gender = "male" | "female";
type Attitude = "neutral" | "skeptical" | "data_only" | "avoidant";
type Topic = "phone_invite" | "product_marketing" | "relationship";

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

  const [connected, setConnected] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // 新增：倒數狀態（用於開始前的3秒倒數）
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [liveFeedback, setLiveFeedback] = useState<string[]>([]);
  const [finalReport, setFinalReport] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const personaReadyRef = useRef(false);
  
  // 用來暫存當前對話輪次的內容
  const currentUserSpeechRef = useRef<string>("");
  const currentAISpeechRef = useRef<string>("");

  function log(msg: string) {
    setLogLines((p) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 120));
  }

  // 倒數計時器
  useEffect(() => {
    if (!isTimerActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          log("⏰ 練習時間結束，自動終止");
          endRealtime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeRemaining]);

  // 開始前的3秒倒數
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function enableMicAndStart() {
    // 先啟用麥克風
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    log("Mic ready ✅");
    
    // 開始3秒倒數
    setCountdown(3);
    log("開始倒數 3...");
    
    // 3秒後自動開始
    setTimeout(() => {
      setCountdown(null);
      startRealtime();
    }, 3000);
  }

  function buildPersona() {
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

    setTimeRemaining(300);
    setConversationHistory([]);
    setLiveFeedback([]);
    setFinalReport([]);
    setShowReport(false);
    currentUserSpeechRef.current = "";
    currentAISpeechRef.current = "";

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
            // 關鍵修正：正確設定語音轉文字
            input_audio_transcription: {
              model: "whisper-1"
            },
          },
        })
      );

      personaReadyRef.current = true;
      audio.muted = false;
      log("Persona injected & audio unmuted ✅");
    };

    dc.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      // 列出所有收到的事件類型，方便除錯
      if (data.type) {
        log(`📨 Event: ${data.type}`);
      }
      
      if (data.type === "session.updated") {
        log("Session updated confirmed ✅");
        setIsTimerActive(true);
      }
      
      // 方法1：捕捉語音轉文字（使用者的話）
      if (data.type === "conversation.item.input_audio_transcription.completed") {
        const userText = data.transcript;
        currentUserSpeechRef.current = userText;
        log(`📝 您說: ${userText}`);
        
        setConversationHistory(prev => [...prev, {
          role: "user",
          content: userText,
          timestamp: new Date()
        }]);
      }
      
      // 方法2：捕捉AI的文字回應
      // 注意：這裡有多種可能的事件類型
      if (data.type === "response.audio_transcript.delta") {
        // 累積文字片段
        currentAISpeechRef.current += data.delta || "";
      }
      
      if (data.type === "response.audio_transcript.done") {
        const aiText = data.transcript || currentAISpeechRef.current;
        if (aiText) {
          log(`🤖 客戶: ${aiText}`);
          
          setConversationHistory(prev => [...prev, {
            role: "assistant",
            content: aiText,
            timestamp: new Date()
          }]);
          
          // 即時分析
          if (currentUserSpeechRef.current) {
            performLiveAnalysis(currentUserSpeechRef.current, aiText);
          }
          
          // 重置暫存
          currentAISpeechRef.current = "";
        }
      }
      
      // 備用方法：如果上面的方法都沒捕捉到，試試這個
      if (data.type === "response.done") {
        log("AI responded ✅");
        
        // 檢查是否有output
        if (data.response?.output && data.response.output.length > 0) {
          const output = data.response.output[0];
          if (output.content && output.content.length > 0) {
            const textContent = output.content.find((c: any) => c.type === "text");
            if (textContent && textContent.text) {
              const aiText = textContent.text;
              log(`🤖 客戶(backup): ${aiText}`);
              
              setConversationHistory(prev => {
                // 避免重複
                if (prev[prev.length - 1]?.content === aiText) {
                  return prev;
                }
                return [...prev, {
                  role: "assistant",
                  content: aiText,
                  timestamp: new Date()
                }];
              });
              
              if (currentUserSpeechRef.current) {
                performLiveAnalysis(currentUserSpeechRef.current, aiText);
              }
            }
          }
        }
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

  // 即時分析（只顯示關鍵警示）
  function performLiveAnalysis(userSpeech: string, aiResponse: string) {
    const alerts: string[] = [];
    
    // 只檢測最關鍵的問題
    if (userSpeech.includes("你應該") || userSpeech.includes("一定要") || 
        userSpeech.includes("必須")) {
      alerts.push("⚠️ 強迫感：這句話可能讓客戶感到壓力");
    }
    
    if (aiResponse.includes("推銷") || aiResponse.includes("佣金") || 
        aiResponse.includes("業務")) {
      alerts.push("🚨 戒心提起：客戶對推銷行為有防備");
    }
    
    if (aiResponse.includes("不需要") || aiResponse.includes("沒興趣") || 
        aiResponse.includes("不用了")) {
      alerts.push("🛑 明確拒絕：需要轉換策略");
    }
    
    if (aiResponse.includes("很忙") || aiResponse.includes("沒時間") || 
        aiResponse.includes("改天")) {
      alerts.push("⏰ 迴避訊號：客戶想結束對話");
    }
    
    if (alerts.length > 0) {
      setLiveFeedback(prev => [...alerts, ...prev].slice(0, 5)); // 只保留最近5條
    }
  }

  // 生成完整報告
  function generateFinalReport() {
    const report: string[] = [];
    
    if (conversationHistory.length === 0) {
      report.push("📊 本次練習沒有記錄到對話內容");
      return report;
    }
    
    report.push(`📊 對話分析報告 - ${conversationHistory.length} 個回合`);
    report.push("");
    
    // 統計分析
    const userTurns = conversationHistory.filter(t => t.role === "user");
    const aiTurns = conversationHistory.filter(t => t.role === "assistant");
    
    // 分析使用者的話術特徵
    let commandingCount = 0;
    let apologizingCount = 0;
    let dataFocusCount = 0;
    let empathyCount = 0;
    
    userTurns.forEach(turn => {
      if (turn.content.includes("應該") || turn.content.includes("一定") || 
          turn.content.includes("必須")) {
        commandingCount++;
      }
      if ((turn.content.match(/對不起|抱歉|不好意思/g) || []).length >= 2) {
        apologizingCount++;
      }
      if (turn.content.includes("數據") || turn.content.includes("統計") || 
          turn.content.includes("證明")) {
        dataFocusCount++;
      }
      if (turn.content.includes("理解") || turn.content.includes("明白") || 
          turn.content.includes("感受")) {
        empathyCount++;
      }
    });
    
    // 分析客戶反應
    let resistanceCount = 0;
    let avoidanceCount = 0;
    let suspicionCount = 0;
    
    aiTurns.forEach(turn => {
      if (turn.content.includes("不需要") || turn.content.includes("沒興趣")) {
        resistanceCount++;
      }
      if (turn.content.includes("很忙") || turn.content.includes("改天")) {
        avoidanceCount++;
      }
      if (turn.content.includes("推銷") || turn.content.includes("佣金")) {
        suspicionCount++;
      }
    });
    
    // 生成報告內容
    report.push("【你的溝通風格】");
    
    if (commandingCount > userTurns.length * 0.3) {
      report.push("⚠️ 指責姿態較明顯：經常使用命令式或要求性的語言，容易讓客戶感到壓迫");
      report.push("   建議：試著用「您可以考慮」代替「您應該」");
    }
    
    if (apologizingCount > userTurns.length * 0.4) {
      report.push("💡 討好姿態較明顯：過度道歉可能削弱專業形象");
      report.push("   建議：適度的禮貌即可，保持自信的語氣");
    }
    
    if (dataFocusCount > userTurns.length * 0.5 && empathyCount === 0) {
      report.push("💭 超理智姿態：過度強調數據和邏輯，缺少情感連結");
      report.push("   建議：在數據之外，也要表達對客戶處境的理解");
    }
    
    if (empathyCount > userTurns.length * 0.3) {
      report.push("✅ 展現同理心：能夠理解客戶的感受，這有助於建立信任");
    }
    
    report.push("");
    report.push("【客戶的反應】");
    
    if (suspicionCount > 0) {
      report.push(`🚨 客戶戒心：${suspicionCount} 次提到推銷相關詞彙`);
      report.push("   原因：可能是開場太商業化，或過早進入推銷階段");
    }
    
    if (resistanceCount > 0) {
      report.push(`🛑 明確拒絕：${resistanceCount} 次表達不需要或沒興趣`);
      report.push("   建議：先了解拒絕背後的真正原因，而非繼續推銷");
    }
    
    if (avoidanceCount > 0) {
      report.push(`⏰ 迴避訊號：${avoidanceCount} 次試圖結束對話`);
      report.push("   建議：可能需要更早建立價值感，讓客戶願意投入時間");
    }
    
    if (resistanceCount === 0 && suspicionCount === 0) {
      report.push("✅ 客戶態度良好：沒有明顯的抗拒或懷疑反應");
    }
    
    report.push("");
    report.push("【改進建議】");
    
    // 根據設定的態度給予針對性建議
    if (attitude === "skeptical" && suspicionCount === 0) {
      report.push("⭐ 本次模擬的客戶設定為「質疑態度」，但客戶沒有表現出明顯懷疑");
      report.push("   可能原因：你的話術成功降低了客戶的戒心，或者客戶角色扮演不夠到位");
    }
    
    if (attitude === "avoidant" && avoidanceCount < aiTurns.length * 0.3) {
      report.push("⭐ 本次模擬的客戶設定為「迴避態度」，但迴避訊號不明顯");
      report.push("   這表示你可能成功引起了客戶的興趣");
    }
    
    return report;
  }

  function startTalk() {
    log("🎙️ 開始說話");
  }

  function stopTalk() {
    if (!dcRef.current || !personaReadyRef.current) return;

    log("📡 傳送給 AI");

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
    // 生成完整報告
    const report = generateFinalReport();
    setFinalReport(report);
    setShowReport(true);
    
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
              disabled={connected || countdown !== null}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: (connected || countdown !== null) ? "#f5f5f5" : "white",
                cursor: (connected || countdown !== null) ? "not-allowed" : "pointer"
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
              disabled={connected || countdown !== null}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: (connected || countdown !== null) ? "#f5f5f5" : "white"
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
              disabled={connected || countdown !== null}
              placeholder="例如：工廠技術人員"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: (connected || countdown !== null) ? "#f5f5f5" : "white"
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
              disabled={connected || countdown !== null}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: (connected || countdown !== null) ? "#f5f5f5" : "white",
                cursor: (connected || countdown !== null) ? "not-allowed" : "pointer"
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
              disabled={connected || countdown !== null}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                border: "1px solid #dfe6e9",
                borderRadius: 8,
                background: (connected || countdown !== null) ? "#f5f5f5" : "white",
                cursor: (connected || countdown !== null) ? "not-allowed" : "pointer"
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

          {/* 倒數畫面 */}
          {countdown !== null && countdown > 0 && (
            <div style={{
              background: "#e3f2fd",
              padding: 40,
              borderRadius: 12,
              marginBottom: 20,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 18, color: "#636e72", marginBottom: 12 }}>
                準備開始...
              </div>
              <div style={{ 
                fontSize: 72, 
                fontWeight: 700,
                color: "#0984e3"
              }}>
                {countdown}
              </div>
            </div>
          )}

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
            {!connected && countdown === null && (
              <button 
                onClick={enableMicAndStart}
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

          {/* 即時警示回饋 */}
          {liveFeedback.length > 0 && connected && (
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
                ⚡ 即時警示
              </h3>
              {liveFeedback.map((feedback, idx) => (
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

      {/* 完整報告 */}
      {showReport && finalReport.length > 0 && (
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          marginBottom: 30,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{
            fontSize: 24,
            marginTop: 0,
            marginBottom: 20,
            color: "#2d3436"
          }}>
            📊 完整分析報告
          </h2>
          <div style={{
            background: "#f8f9fa",
            padding: 20,
            borderRadius: 8,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            lineHeight: 1.8
          }}>
            {finalReport.join("\n")}
          </div>
        </div>
      )}

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
