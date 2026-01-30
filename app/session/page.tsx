"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

type Gender = "male" | "female";
type Attitude = "neutral" | "avoidant" | "skeptical" | "has_insurance";
type Topic = "phone_invite" | "product_marketing" | "objection_handling";

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
  const [objectionDetail, setObjectionDetail] = useState("");
  const [voice, setVoice] = useState<string>("alloy");
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customScenario, setCustomScenario] = useState("");
  const [trainingGoal, setTrainingGoal] = useState("");

  const [connected, setConnected] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [liveFeedback, setLiveFeedback] = useState<string[]>([]);
  const [finalReport, setFinalReport] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const personaReadyRef = useRef(false);
  
  const currentUserSpeechRef = useRef<string>("");
  const currentAISpeechRef = useRef<string>("");

  function log(msg: string) {
    setLogLines((p) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 120));
  }

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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    log("Mic ready ✅");
    
    setCountdown(3);
    log("開始倒數 3...");
    
    setTimeout(() => {
      setCountdown(null);
      startRealtime();
    }, 3000);
  }

  function buildPersona() {
    let interruptionStyle = "";
    
    if (attitude === "skeptical" || attitude === "avoidant") {
      interruptionStyle = `
- 當業務員說話超過 3 句時，你會直接打斷，用質疑或不耐煩的語氣反駁
- 使用「等等」「不對吧」「可是」「好了好了」這類打斷的詞語
`;
    }

    let basePersona = `
你是【台灣的保險客戶】，不是業務員，也不是AI助理。

基本資料：
- 性別：${gender === "male" ? "男性" : "女性"}
- 年齡：${age} 歲
- 職業：${job}
- 地區：台灣
- 語言：繁體中文（使用台灣口語習慣）

態度姿態：
${attitude === "neutral" ? "中立態度（基礎）- 願意聽業務員說明，通常會等對方說完才回應，保持禮貌但觀望" : ""}
${attitude === "avoidant" ? "迴避態度（中難）- 不想浪費時間聽業務員說話，會頻繁打斷想結束對話，使用「我很忙」「沒興趣」「改天再說」" : ""}
${attitude === "skeptical" ? "質疑態度（高難）- 對保險業務抱持懷疑，會急著反駁，經常打斷對方，質疑動機和真實性" : ""}
${attitude === "has_insurance" ? "已有保險（實戰）- 認為自己的保障已經足夠，會說「我已經買了」「我朋友是XX公司的業務員」，不覺得需要再加保" : ""}

打斷行為規則：
${interruptionStyle}

當前場景：
${topic === "phone_invite" ? "你接到業務員打來的電話約訪，對方想約你見面詳談" : ""}
${topic === "product_marketing" ? "業務員正在電話中向你介紹保險商品，想推銷給你" : ""}
${topic === "objection_handling" ? `業務員正在處理你的異議${objectionDetail ? `：${objectionDetail}` : ""}` : ""}
`;

    // 如果使用者有自訂場景，加入進去
    if (customScenario && customScenario.trim()) {
      basePersona += `\n\n特殊情境補充：\n${customScenario}\n`;
    }

    // 如果使用者有設定訓練目標，告訴 AI 要配合
    if (trainingGoal && trainingGoal.trim()) {
      basePersona += `\n\n業務員的訓練目標：\n${trainingGoal}\n請根據這個目標調整你的回應，幫助他練習。\n`;
    }

    basePersona += `
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

    return basePersona;
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

      let silenceDuration = 700;
      if (attitude === "skeptical" || attitude === "avoidant") {
        silenceDuration = 400;
      }

      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: voice,
            instructions: buildPersona(),
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: silenceDuration,
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
      
      if (data.type) {
        log(`📨 Event: ${data.type}`);
      }
      
      if (data.type === "session.updated") {
        log("Session updated confirmed ✅");
        setIsTimerActive(true);
      }
      
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
      
      if (data.type === "response.audio_transcript.delta") {
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
          
          if (currentUserSpeechRef.current) {
            performLiveAnalysis(currentUserSpeechRef.current, aiText);
          }
          
          currentAISpeechRef.current = "";
        }
      }
      
      if (data.type === "response.done") {
        log("AI responded ✅");
        
        if (data.response?.output && data.response.output.length > 0) {
          const output = data.response.output[0];
          if (output.content && output.content.length > 0) {
            const textContent = output.content.find((c: any) => c.type === "text");
            if (textContent && textContent.text) {
              const aiText = textContent.text;
              log(`🤖 客戶(backup): ${aiText}`);
              
              setConversationHistory(prev => {
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

  function performLiveAnalysis(userSpeech: string, aiResponse: string) {
    const alerts: string[] = [];
    
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
      setLiveFeedback(prev => [...alerts, ...prev].slice(0, 5));
    }
  }

  function generateBasicReport() {
    const report: string[] = [];
    
    if (conversationHistory.length === 0) {
      report.push("📊 本次練習沒有記錄到對話內容");
      return report;
    }
    
    report.push(`📊 基礎分析報告 - ${conversationHistory.length} 個回合`);
    report.push("");
    
    const userTurns = conversationHistory.filter(t => t.role === "user");
    const aiTurns = conversationHistory.filter(t => t.role === "assistant");
    
    if (userTurns.length === 0) {
      report.push("⚠️ 未捕捉到您的發言內容，可能是語音轉文字功能異常");
      return report;
    }
    
    let commandingCount = 0;
    let apologizingCount = 0;
    let questionCount = 0;
    
    userTurns.forEach(turn => {
      if (turn.content.includes("應該") || turn.content.includes("一定") || 
          turn.content.includes("必須")) {
        commandingCount++;
      }
      const apologies = (turn.content.match(/對不起|抱歉|不好意思/g) || []).length;
      if (apologies >= 2) {
        apologizingCount++;
      }
      if (turn.content.includes("嗎") || turn.content.includes("?")) {
        questionCount++;
      }
    });
    
    let resistanceCount = 0;
    let positiveCount = 0;
    
    aiTurns.forEach(turn => {
      if (turn.content.includes("不需要") || turn.content.includes("沒興趣")) {
        resistanceCount++;
      }
      if (turn.content.includes("可以") || turn.content.includes("好") || 
          turn.content.includes("沒問題")) {
        positiveCount++;
      }
    });
    
    report.push("【快速評估】");
    report.push("");
    
    if (commandingCount > userTurns.length * 0.3) {
      report.push(`⚠️ 使用較多命令式語言（${commandingCount}次）`);
    }
    
    if (questionCount > userTurns.length * 0.3) {
      report.push(`✅ 善用提問（${questionCount}次）`);
    }
    
    if (positiveCount > aiTurns.length * 0.5) {
      report.push(`✅ 客戶回應積極（${positiveCount}次正面回應）`);
    }
    
    if (resistanceCount > 0) {
      report.push(`🛑 客戶明確拒絕（${resistanceCount}次）`);
    }
    
    report.push("");
    report.push("正在生成 AI 深度分析，請稍候...");
    
    return report;
  }

  async function generateAIAnalysis() {
    setIsAnalyzing(true);
    
    try {
      const transcript = conversationHistory.map(turn => 
        `${turn.role === 'user' ? '業務員' : '客戶'}: ${turn.content}`
      ).join('\n');
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          attitude,
          topic,
          gender,
          age,
          job
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.report;
      } else {
        console.error('Analysis failed:', data.error);
        return ['❌ AI 分析失敗，請稍後再試'];
      }
    } catch (error) {
      console.error('Analysis error:', error);
      return ['❌ AI 分析失敗，請檢查網路連線'];
    } finally {
      setIsAnalyzing(false);
    }
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
    const basicReport = generateBasicReport();
    setFinalReport(basicReport);
    setShowReport(true);
    
    generateAIAnalysis().then(aiReport => {
      setFinalReport(prev => [
        ...prev.filter(line => line !== "正在生成 AI 深度分析，請稍候..."),
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "🤖 AI 深度分析（by Claude）",
        "",
        ...aiReport
      ]);
    });
    
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
              態度姿態
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
              <option value="neutral">😐 中立態度（基礎）</option>
              <option value="avoidant">🚶 迴避態度（中難）</option>
              <option value="skeptical">🤨 質疑態度（高難）</option>
              <option value="has_insurance">📋 已有保險（實戰）</option>
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
              客戶聲音
            </label>
            <select 
              value={voice} 
              onChange={(e) => setVoice(e.target.value)}
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
              <option value="alloy">Alloy（中性、平衡）</option>
              <option value="echo">Echo（男性、溫暖）</option>
              <option value="shimmer">Shimmer（女性、溫柔）</option>
              <option value="ash">Ash（男性、沉穩）</option>
              <option value="ballad">Ballad（中性、平和）</option>
              <option value="coral">Coral（女性、明亮）</option>
              <option value="sage">Sage（女性、成熟）</option>
              <option value="verse">Verse（男性、年輕）</option>
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
              場景
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
              <option value="objection_handling">🔄 處理異議</option>
            </select>
          </div>

          {topic === "objection_handling" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
                color: "#636e72"
              }}>
                處理什麼異議？
              </label>
              <input 
                value={objectionDetail} 
                onChange={(e) => setObjectionDetail(e.target.value)}
                disabled={connected || countdown !== null}
                placeholder="例如：價格太貴、要再考慮、已經買了..."
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
          )}

          {/* 進階設定 */}
          <div style={{ marginTop: 20 }}>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={connected || countdown !== null}
              style={{
                width: "100%",
                padding: "10px",
                background: "#f8f9fa",
                border: "1px dashed #dfe6e9",
                borderRadius: 8,
                cursor: (connected || countdown !== null) ? "not-allowed" : "pointer",
                color: "#636e72",
                fontSize: 14,
                fontWeight: 600
              }}
            >
              {showAdvanced ? "▼ 收起進階設定" : "▶ 進階設定（自訂場景）"}
            </button>
            
            {showAdvanced && (
              <div style={{ marginTop: 15, padding: 15, background: "#f8f9fa", borderRadius: 8 }}>
                <label style={{ 
                  display: "block", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 8,
                  color: "#636e72"
                }}>
                  📝 自訂場景說明（選填）
                </label>
                <textarea
                  value={customScenario}
                  onChange={(e) => setCustomScenario(e.target.value)}
                  disabled={connected || countdown !== null}
                  placeholder="例如：&#10;• 客戶剛生小孩，想推薦兒童保險&#10;• 客戶說保費太貴&#10;• 練習向老朋友推薦保險&#10;• 客戶的老公在國泰買了保險"
                  style={{
                    width: "100%",
                    minHeight: 80,
                    padding: 10,
                    fontSize: 14,
                    border: "1px solid #dfe6e9",
                    borderRadius: 8,
                    resize: "vertical",
                    fontFamily: "inherit",
                    background: (connected || countdown !== null) ? "#f5f5f5" : "white"
                  }}
                />
                
                <label style={{ 
                  display: "block", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginTop: 15, 
                  marginBottom: 8,
                  color: "#636e72"
                }}>
                  🎯 我的目標（選填）
                </label>
                <textarea
                  value={trainingGoal}
                  onChange={(e) => setTrainingGoal(e.target.value)}
                  disabled={connected || countdown !== null}
                  placeholder="例如：&#10;• 練習前 30 秒的開場破冰&#10;• 學會挖掘客戶真正的需求&#10;• 練習處理「我要考慮」的推託&#10;• 學會不直接攻擊競品"
                  style={{
                    width: "100%",
                    minHeight: 60,
                    padding: 10,
                    fontSize: 14,
                    border: "1px solid #dfe6e9",
                    borderRadius: 8,
                    resize: "vertical",
                    fontFamily: "inherit",
                    background: (connected || countdown !== null) ? "#f5f5f5" : "white"
                  }}
                />
                
                <div style={{ 
                  marginTop: 10, 
                  fontSize: 12, 
                  color: "#636e72", 
                  lineHeight: 1.5 
                }}>
                  💡 提示：這些設定會讓 AI 客戶更貼近你想練習的情境
                </div>
              </div>
            )}
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
                <div style={{
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "white",
                  background: "#00b894",
                  border: "none",
                  borderRadius: 8,
                  textAlign: "center",
                  marginBottom: 12
                }}>
                  🎙️ 麥克風已啟動 - 可直接對話
                </div>
                
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

      {/* 完整分析報告 */}
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
          
          {isAnalyzing && (
            <div style={{
              background: "#e3f2fd",
              padding: 16,
              borderRadius: 8,
              marginBottom: 20,
              textAlign: "center"
            }}>
              <span style={{ fontSize: 14, color: "#0984e3" }}>
                🤖 AI 正在深度分析對話內容，請稍候...
              </span>
            </div>
          )}
          
          <div style={{
            background: "#f8f9fa",
            padding: 20,
            borderRadius: 8,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            lineHeight: 1.8,
            maxHeight: 600,
            overflow: "auto"
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
