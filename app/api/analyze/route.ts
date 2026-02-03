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
      rapportData  // 新增：接收客情資料
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
      max_tokens: 2000,
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
  // 態度類型的中文描述
  const attitudeLabels: Record<string, string> = {
    neutral: "中立態度（基礎）",
    avoidant: "迴避態度（中難）",
    skeptical: "質疑態度（高難）",
    has_insurance: "已有保險（實戰）",
  };

  // 場景類型的中文描述
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

  // 如果有客情資料，加入客情分析的指引
  if (rapportData && rapportData.summary) {
    prompt += `

${rapportData.summary}

【分析框架說明】
本次訓練使用了基於「薩提爾冰山理論」和「台灣語用學」的客情分析系統。系統即時追蹤了對話過程中的客戶信任度變化，識別了關鍵的語意模式，並記錄了每次客情變化的觸發因素。

薩提爾冰山理論認為，人的外在行為（水平面以上）只是內在運作的一小部分，水平面以下包含了感受、觀點、期待、渴望與自我。在純文字分析中，我們透過句法結構與詞彙選擇來推導客戶的深層心理狀態。

系統識別的四種應對姿態：
1. 討好型（Placating）：忽略自己真實感受，使用模糊限制語、被動語態，表面順從但實際無意願
2. 指責型（Blaming）：為保護自己而先發制人，使用反問句、負面評價詞、絕對化副詞
3. 超理智型（Super-Reasonable）：忽略人與感受，使用專業術語、複雜句型、強調因果邏輯
4. 打岔型（Irrelevant）：避開壓力而轉移焦點，話題斷裂、答非所問、使用無意義填充詞

台灣高語境文化特色：
- 客戶很少直接表達「拒絕」或「不滿」，以免損害雙方面子
- 「我再考慮看看」、「回去跟太太商量」、「最近比較忙」等都是「軟性拒絕」的代名詞
- 「是不錯啦，但是...」是典型的「假性同意」，重點在轉折詞之後
- 沉默、單字回應（喔、嗯）代表消極抵抗和禮貌性敷衍
`;
  }

  prompt += `

請提供專業的訓練分析報告，包含以下維度：

1. 【整體表現概述】
   - 簡要總結業務員在這次訓練中的整體表現
   - 特別指出做得最好的 2-3 個亮點
   - 指出最需要改進的 1-2 個問題

2. 【對話技巧分析】
   - 開場方式是否恰當
   - 提問技巧的運用（開放式 vs. 封閉式）
   - 聆聽與回應的品質
   - 異議處理的方式
`;

  if (rapportData && rapportData.summary) {
    prompt += `
3. 【客情管理分析】⭐ 重點分析區域
   - 客情整體軌跡：從初始 ${rapportData.initialScore} 分變化到最終 ${rapportData.finalScore} 分，總體${rapportData.finalScore - rapportData.initialScore >= 0 ? "提升" : "下降"} ${Math.abs(rapportData.finalScore - rapportData.initialScore)} 分
   - 如果有客情變化事件，請分析：
     * 哪些時刻客情顯著提升？業務員做對了什麼？
     * 哪些時刻客情顯著下降？觸發了什麼語意模式？背後的心理機制是什麼？
     * 業務員是否注意到客戶的應對姿態（討好型、指責型、超理智型、打岔型）？
     * 業務員的回應策略是否適配客戶的心理狀態？
   - 客情管理的優勢與待改進之處
   - 具體建議：下次面對類似客戶時，應該如何調整策略以更好地建立信任？

4. 【具體改進建議】
`;
  } else {
    prompt += `
3. 【具體改進建議】
`;
  }

  prompt += `   - 針對本次訓練中暴露的問題，提供 3-5 條具體、可操作的改進建議
   - 每條建議要說明：(1) 問題是什麼 (2) 為什麼這樣做不好 (3) 應該怎麼做
   - 建議要具體到可以在下次訓練中立即實踐

${rapportData && rapportData.summary ? "5" : "4"}. 【鼓勵與總結】
   - 以正面、鼓勵的語氣總結
   - 強調成長的可能性和訓練的價值
   - 給予下一步行動的方向

【分析要求】
- 使用繁體中文撰寫
- 語氣專業但友善，像資深前輩在指導後輩
- 避免空泛的讚美或批評，所有評價都要有具體的對話內容作為依據
- 特別關注台灣保險銷售的文化特性
${rapportData && rapportData.summary ? "- 客情管理分析是本次報告的重點，請深入探討業務員如何影響客戶的信任度" : ""}
- 不要使用項目符號或編號列表，請用完整的段落和句子來表達
- 使用適當的分段來組織內容，但不要使用標題編號
- 保持自然的敘述流暢性

請開始你的專業分析。`;

  return prompt;
}
