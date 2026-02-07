import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      transcript, 
      attitude, 
      topic, 
      gender, 
      age, 
      job,
      rapportData
    } = body;

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: "缺少對話記錄" },
        { status: 400 }
      );
    }

    // 建立分析提示詞
    const analysisPrompt = buildAnalysisPrompt(
      transcript,
      attitude,
      topic,
      gender,
      age,
      job,
      rapportData
    );

    // 呼叫 Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,  // 從 2000 提升到 4000，確保報告不會被截斷
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    // 提取分析結果
    const content = message.content[0];
    let analysisText = "";

    if (content.type === "text") {
      analysisText = content.text;
    }

    // 將分析文本轉換為行陣列
    const reportLines = analysisText.split("\n").filter(line => line.trim());

    return NextResponse.json({
      success: true,
      report: reportLines,
    });
  } catch (error) {
    console.error("分析錯誤:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "未知錯誤",
      },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(
  transcript: string,
  attitude: string,
  topic: string,
  gender: string,
  age: number,
  job: string,
  rapportData?: any
): string {
  const attitudeLabels: Record<string, string> = {
    neutral: "中立態度（基礎）",
    avoidant: "迴避態度（中難）",
    skeptical: "質疑態度（高難）",
    has_insurance: "已有保險（實戰）",
  };

  const topicLabels: Record<string, string> = {
    phone_invite: "電話約訪",
    product_marketing: "商品推銷",
    objection_handling: "處理異議",
  };

  const attitudeLabel = attitudeLabels[attitude] || attitude;
  const topicLabel = topicLabels[topic] || topic;

  let prompt = `你是一位資深的保險銷售訓練專家，專精於分析業務員的對話表現並提供建設性的反饋。

訓練場景資訊：
- 場景：${topicLabel}
- 客戶類型：${gender === "male" ? "男性" : "女性"}，${age} 歲，職業為 ${job}
- 客戶態度：${attitudeLabel}

對話記錄：
${transcript}
`;

  if (rapportData && rapportData.summary) {
    prompt += `

${rapportData.summary}

【客情分析系統說明】
本次訓練使用了基於「薩提爾冰山理論」和「台灣語用學」的客情分析系統。這個系統不只追蹤客戶的負面反應（拒絕、抗拒、防備），更重要的是識別業務員的正向行為（同理心表達、誠實透明、賦權肯定等），讓訓練成為一個雙向互動的過程。

系統即時追蹤了對話過程中的信任度變化，識別了關鍵的語意模式，並記錄了每次客情變化的觸發因素。當業務員展現高信任感的語言模式時，客情會提升；當客戶表現出拒絕或防備時，客情會下降。

薩提爾冰山理論核心概念：
- 討好型（Placating）：忽略自己真實感受，表面順從但內心無意願
- 指責型（Blaming）：為保護自己而先發制人，用攻擊來掩飾不安全感  
- 超理智型（Super-Reasonable）：忽略情感，只關注邏輯和數據
- 打岔型（Irrelevant）：避開壓力而轉移焦點，逃避決策責任
- 一致性（Congruent）：真誠、平衡、既關注自己也尊重他人

台灣高語境文化特色：
- 客戶很少直接表達拒絕，使用軟性拒絕來維護雙方面子
- 「我再考慮看看」、「回去跟太太商量」通常是婉轉拒絕
- 「是不錯啦，但是...」重點在轉折詞之後
- 沉默或單字回應代表消極抵抗

正向行為的重要性：
本次分析中，你會看到業務員的某些話語帶來了客情提升。這些正向行為包括：
- 同理心表達：真正理解客戶的困境和感受
- 面子保護：避免讓客戶感到被指正或批評
- 賦權肯定：肯定客戶的判斷和能力
- 誠實透明：主動揭露產品風險和限制
- 尊重自主：給予決策空間，不強迫立即決定

這些正向行為是頂尖業務員的核心技能，值得在分析中給予讚賞和鼓勵。
`;
  }

  prompt += `

請提供專業的訓練分析報告，包含以下維度：

【整體表現概述】
簡要總結業務員在這次訓練中的整體表現。特別指出做得最好的 2-3 個亮點，以及最需要改進的 1-2 個問題。用自然的敘述方式呈現，而不是條列式。

【對話技巧分析】
分析業務員的對話技巧，包括：開場方式是否恰當、提問技巧的運用（開放式 vs. 封閉式）、聆聽與回應的品質、異議處理的方式。用流暢的段落描述，指出具體的對話片段作為例證。

${rapportData && rapportData.summary ? `
【客情管理分析】⭐ 本次報告的重點分析區域

這個部分非常重要，請深入分析客情管理的表現。

首先，描述客情的整體軌跡：從初始 ${rapportData.initialScore} 分變化到最終 ${rapportData.finalScore} 分，總體${rapportData.finalScore - rapportData.initialScore >= 0 ? "提升" : "下降"}了 ${Math.abs(rapportData.finalScore - rapportData.initialScore)} 分。這個變化反映了什麼？是業務員成功建立了信任，還是客戶的防備心逐漸加強？

接著，如果有客情變化事件，請重點分析：

當客情提升時，業務員做對了什麼？具體分析哪些話語觸發了正向規則。例如，是否使用了同理心表達？是否展現了誠實透明？是否給予了客戶尊重和掌控感？這些正向行為為什麼有效？背後的心理機制是什麼？

當客情下降時，發生了什麼？客戶說了什麼話觸發了負面規則？這反映了客戶的什麼心理狀態？是薩提爾的哪種應對姿態？業務員當時的回應是否適配客戶的心理需求？

特別關注業務員是否注意到客戶的應對姿態（討好型、指責型、超理智型、打岔型），以及業務員的回應策略是否與客戶的姿態相匹配。例如，面對指責型客戶時，是否展現了賦權和肯定？面對討好型客戶時，是否提供了安全感和引導？

分析客情管理的優勢與待改進之處。業務員在哪些方面展現了高信任感的語言模式？在哪些方面還需要加強？

最後，提供具體建議：下次面對類似客戶時，應該如何調整策略以更好地建立信任？哪些正向行為應該繼續保持和強化？哪些負面觸發點需要避免？

請用自然流暢的段落來撰寫這個分析，而不是條列式的要點。讓分析像是一位資深前輩在面對面指導，有溫度、有深度。

` : ""}

【具體改進建議】
針對本次訓練中暴露的問題，提供 3-5 條具體、可操作的改進建議。每條建議要說明：(1) 問題是什麼 (2) 為什麼這樣做不好 (3) 應該怎麼做。用完整的句子和段落來表達，而不是條列式。

【鼓勵與總結】
以正面、鼓勵的語氣總結。強調成長的可能性和訓練的價值，給予下一步行動的方向。用溫暖、支持的語調作結。

【重要寫作要求】
- 使用繁體中文撰寫
- 語氣專業但友善，像資深前輩在指導後輩
- 避免空泛的讚美或批評，所有評價都要有具體的對話內容作為依據
- 特別關注台灣保險銷售的文化特性
${rapportData && rapportData.summary ? "- 客情管理分析是本次報告的核心重點，請深入探討業務員如何透過語言建立或破壞信任" : ""}
- **不要使用項目符號、編號列表或標題編號**
- **用完整的段落和自然的敘述來組織內容**
- **保持段落之間的流暢過渡，就像在寫一篇文章而不是填表格**
- 在段落開頭可以用【】標記區塊標題，但內容必須是流暢的段落
- 適當分段來組織內容，但段落內部要保持自然的句子流動

請開始你的專業分析。`;

  return prompt;
}
