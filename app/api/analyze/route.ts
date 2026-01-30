import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  try {
    const { transcript, attitude, topic, gender, age, job } = await req.json();
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const analysisPrompt = `你是一位專業的保險業務訓練教練，精通薩提爾溝通模式和 NLP 技巧。

請分析以下這段保險業務員與客戶的對話練習：

客戶設定：
- 性別：${gender === "male" ? "男性" : "女性"}
- 年齡：${age} 歲
- 職業：${job}
- 態度：${attitude === "skeptical" ? "質疑" : attitude === "avoidant" ? "迴避" : attitude === "data_only" ? "數據導向" : "中立"}
- 情境：${topic === "phone_invite" ? "電話約訪" : topic === "product_marketing" ? "商品推銷" : "客情維護"}

對話內容：
${transcript}

請提供以下分析（請用繁體中文，並使用台灣的用語習慣）：

1. 薩提爾溝通姿態分析
   - 指責姿態：是否使用命令、要求的語言
   - 討好姿態：是否過度道歉
   - 超理智姿態：是否只談數據缺少情感
   - 一致性溝通：是否真誠直接

2. NLP 技巧運用
   - 呼應技巧：是否重複客戶用詞建立共鳴
   - 引導技巧：是否用引導語言讓客戶想像

3. 提問品質
   - 開放式vs封閉式問題比例
   - 是否深入探詢需求

4. 應對策略評估
   - 策略是否符合客戶態度
   - 做得好的地方
   - 需要改進的地方

5. 具體改進建議（3-5個，附範例對話）

請條列式呈現，避免學術術語，要讓業務員能直接理解應用。`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20250514",  // 使用正確的模型名稱
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: analysisPrompt
      }]
    });

    const report = message.content[0].type === 'text' 
      ? message.content[0].text.split('\n') 
      : [];

    return Response.json({ 
      success: true,
      report 
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ 
      success: false,
      error: 'Failed to analyze conversation' 
    }, { status: 500 });
  }
}
