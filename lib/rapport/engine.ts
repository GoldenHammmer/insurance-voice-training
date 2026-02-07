// 客情分析引擎 - 核心邏輯模組
// 此引擎負責分析對話內容、匹配規則、計算客情分數

import { 
  RAPPORT_RULES, 
  getRelevantRules,
  getPositiveRules,
  getNegativeRules,
  type RapportRule, 
  type Scenario, 
  type CustomerType,
  type RuleType
} from './rules';

// 分析結果的資料結構
export interface AnalysisResult {
  matchedRules: RapportRule[];
  rapportChange: number;
  totalImpact: number;
  detectedPosture?: string;
  suggestedStrategy?: string;
  responseGuide?: string;
}

// 客情狀態的資料結構
export interface RapportStatus {
  score: number;
  level: 'danger' | 'warning' | 'good';
  color: string;
  label: string;
  description: string;
  advice: string;
}

// 客情事件記錄的資料結構
export interface RapportEvent {
  timestamp: Date;
  speaker: 'user' | 'assistant';
  utterance: string;
  matchedRule?: RapportRule;
  scoreBefore: number;
  scoreAfter: number;
  change: number;
}

/**
 * 分析單句話語，識別可能的語意模式
 * 這是引擎的核心函數，採用雙軌分析策略
 */
export function analyzeUtterance(
  utterance: string,
  scenario: Scenario,
  customerType: CustomerType,
  speaker: 'user' | 'assistant'
): AnalysisResult {
  // 初始化結果
  const result: AnalysisResult = {
    matchedRules: [],
    rapportChange: 0,
    totalImpact: 0
  };

  // 文字預處理：轉小寫、去除多餘空白
  const normalizedUtterance = utterance.toLowerCase().trim();

  // 如果文字太短（少於2個字），跳過分析
  if (normalizedUtterance.length < 2) {
    return result;
  }

  // 雙軌分析策略
  let relevantRules: RapportRule[];
  
  if (speaker === 'assistant') {
    // 客戶發言 → 檢查負面規則
    relevantRules = getNegativeRules(scenario, customerType);
  } else {
    // 業務員發言 → 檢查正向規則
    relevantRules = getPositiveRules(scenario);
  }

  // 對每個規則進行匹配檢查
  for (const rule of relevantRules) {
    if (isRuleMatched(normalizedUtterance, rule, utterance)) {
      result.matchedRules.push(rule);
    }
  }

  // 如果有匹配的規則，計算影響並選擇最重要的建議
  if (result.matchedRules.length > 0) {
    // 計算總影響（考慮規則權重）
    result.totalImpact = result.matchedRules.reduce(
      (sum, rule) => sum + (rule.rapportImpactScore * rule.weight),
      0
    );

    // 客情變化取整數
    result.rapportChange = Math.round(result.totalImpact);

    // 選擇影響最大的規則作為主要建議來源
    const primaryRule = result.matchedRules.reduce((prev, current) => {
      const prevImpact = Math.abs(prev.rapportImpactScore * prev.weight);
      const currentImpact = Math.abs(current.rapportImpactScore * current.weight);
      return currentImpact > prevImpact ? current : prev;
    });

    result.detectedPosture = primaryRule.satir_posture;
    result.suggestedStrategy = primaryRule.rapportStrategy;
    result.responseGuide = primaryRule.responseGuide;
  }

  return result;
}

/**
 * 檢查特定規則是否匹配當前的話語
 * 採用關鍵字匹配 + 句法特徵檢查 + 台灣口語去歧義的混合策略
 */
function isRuleMatched(
  normalizedUtterance: string, 
  rule: RapportRule,
  originalUtterance: string
): boolean {
  // 第一層檢查：關鍵字匹配
  const hasKeyword = rule.keywords.some(keyword => 
    normalizedUtterance.includes(keyword.toLowerCase())
  );

  if (!hasKeyword) {
    return false;
  }

  // 台灣口語去歧義化檢查
  const disambiguation = disambiguateTaiwaneseExpression(originalUtterance);
  
  // 特殊處理：「不好意思」的歧義
  if (normalizedUtterance.includes('不好意思')) {
    // 如果規則期待的是拒絕，但實際上是禮貌性發語詞，則不匹配
    if (rule.intentClassification.includes('拒絕') && disambiguation.isPoliteOpening) {
      return false;
    }
    // 如果規則期待的是禮貌，但實際上是拒絕，則不匹配
    if (rule.intentClassification.includes('禮貌') && disambiguation.isRejection) {
      return false;
    }
  }

  // 特殊處理：「考慮」的歧義
  if (normalizedUtterance.includes('考慮')) {
    // 如果是真實考慮（有具體對象），則某些軟性拒絕規則不應觸發
    if (disambiguation.isGenuineConsideration && 
        rule.intentClassification.includes('Soft Rejection')) {
      return false;
    }
  }

  // 第二層檢查：句法特徵
  if (!rule.sentencePatterns || rule.sentencePatterns.length === 0) {
    return true; // 如果沒有句法限制，關鍵字匹配就足夠
  }

  // 檢查是否為短句（用於識別敷衍、催促等）
  if (rule.sentencePatterns.includes('短句') && originalUtterance.length > 20) {
    return false;
  }

  // 檢查是否為反問句（用於識別質疑態度）
  if (rule.sentencePatterns.includes('反問句')) {
    const hasQuestionMark = originalUtterance.includes('?') || originalUtterance.includes('？');
    const hasQuestionWord = /誰|什麼|為什麼|怎麼|哪裡|嗎/.test(originalUtterance);
    if (!hasQuestionMark && !hasQuestionWord) {
      return false;
    }
  }

  // 檢查是否包含比較級（用於識別價格比較）
  if (rule.sentencePatterns.includes('比較級') || 
      rule.sentencePatterns.includes('比較級句子')) {
    const hasComparison = /比|更|較|還/.test(originalUtterance);
    if (!hasComparison) {
      return false;
    }
  }

  // 檢查是否包含否定詞（用於識別拒絕）
  if (rule.sentencePatterns.includes('否定句') || 
      rule.sentencePatterns.includes('拒絕') ||
      rule.sentencePatterns.includes('直接否定句')) {
    const hasNegation = /不|沒|別|甭|免/.test(originalUtterance);
    if (!hasNegation) {
      return false;
    }
  }

  // 檢查是否為開放式問句（正向規則）
  if (rule.sentencePatterns.includes('開放式問句')) {
    const hasOpenQuestion = /您覺得|您認為|您的想法|請問|想請教|您希望|您需要/.test(originalUtterance);
    if (!hasOpenQuestion) {
      return false;
    }
  }

  // 檢查是否包含同理心詞彙（正向規則）
  if (rule.sentencePatterns.includes('同理心詞彙')) {
    const hasEmpathy = /我理解|我明白|我了解|我知道|我感覺|我能體會/.test(originalUtterance);
    if (!hasEmpathy) {
      return false;
    }
  }

  // 所有檢查都通過，確認匹配
  return true;
}

/**
 * 計算更新後的客情分數
 * 確保分數在合理範圍內（0-100），並考慮邊界效應
 */
export function calculateNewRapportScore(
  currentScore: number,
  change: number
): number {
  let newScore = currentScore + change;

  // 邊界效應：分數越低，提升越難；分數越高，下降影響較小
  if (change > 0 && currentScore < 30) {
    // 低分時提升困難，效果打七折
    newScore = currentScore + (change * 0.7);
  } else if (change > 0 && currentScore > 70) {
    // 高分時提升效益遞減，效果打八折
    newScore = currentScore + (change * 0.8);
  } else if (change < 0 && currentScore > 70) {
    // 高分時有信任儲備，下降影響打八折
    newScore = currentScore + (change * 0.8);
  } else if (change < 0 && currentScore < 30) {
    // 低分時下降影響加劇，效果放大到1.2倍
    newScore = currentScore + (change * 1.2);
  }

  // 確保分數在 0-100 範圍內
  return Math.max(0, Math.min(100, Math.round(newScore)));
}

/**
 * 根據當前客情分數獲取狀態資訊
 * 包含等級、顏色、描述和建議
 */
export function getRapportStatus(score: number): RapportStatus {
  if (score < 30) {
    return {
      score,
      level: 'danger',
      color: '#ef4444',
      label: '關係危險',
      description: '客戶防備心很重，隨時可能中斷對話',
      advice: '立即調整策略，避免推銷話術，專注建立信任'
    };
  } else if (score < 70) {
    return {
      score,
      level: 'warning',
      color: '#f59e0b',
      label: '關係普通',
      description: '客戶願意聽但還沒有信任',
      advice: '使用開放式問題，展現同理心，逐步建立連結'
    };
  } else {
    return {
      score,
      level: 'good',
      color: '#10b981',
      label: '關係良好',
      description: '客戶對你有信任感，願意深入交流',
      advice: '保持當前節奏，可以適度引入產品討論'
    };
  }
}

/**
 * 分析完整的對話歷史，生成客情變化軌跡
 * 用於訓練結束後的深度分析
 */
export function analyzeConversationHistory(
  conversationTurns: Array<{ role: 'user' | 'assistant', content: string }>,
  scenario: Scenario,
  customerType: CustomerType,
  initialScore: number = 50
): {
  events: RapportEvent[];
  finalScore: number;
  trajectory: number[];
  criticalMoments: RapportEvent[];
} {
  const events: RapportEvent[] = [];
  const trajectory: number[] = [initialScore];
  let currentScore = initialScore;

  // 逐輪分析對話
  for (const turn of conversationTurns) {
    const analysis = analyzeUtterance(
      turn.content,
      scenario,
      customerType,
      turn.role
    );

    // 如果這輪對話觸發了規則，記錄事件
    if (analysis.matchedRules.length > 0) {
      const scoreBefore = currentScore;
      currentScore = calculateNewRapportScore(currentScore, analysis.rapportChange);

      const event: RapportEvent = {
        timestamp: new Date(),
        speaker: turn.role,
        utterance: turn.content,
        matchedRule: analysis.matchedRules[0],
        scoreBefore,
        scoreAfter: currentScore,
        change: analysis.rapportChange
      };

      events.push(event);
    }

    trajectory.push(currentScore);
  }

  // 識別關鍵時刻（客情變化超過 5 分的事件）
  const criticalMoments = events.filter(event => Math.abs(event.change) >= 5);

  return {
    events,
    finalScore: currentScore,
    trajectory,
    criticalMoments
  };
}

/**
 * 生成客情分析摘要文本
 * 用於傳遞給 Claude 進行深度分析
 */
export function generateRapportSummary(
  events: RapportEvent[],
  finalScore: number,
  initialScore: number = 50
): string {
  const lines: string[] = [];

  lines.push('=== 客情管理分析 ===');
  lines.push('');
  lines.push(`初始客情分數：${initialScore}`);
  lines.push(`最終客情分數：${finalScore}`);
  lines.push(`總體變化：${finalScore - initialScore > 0 ? '+' : ''}${finalScore - initialScore}`);
  lines.push('');

  if (events.length === 0) {
    lines.push('本次對話未偵測到顯著的客情變化事件。');
  } else {
    lines.push(`偵測到 ${events.length} 個客情變化事件：`);
    lines.push('');

    // 分別統計正向和負向事件
    const positiveEvents = events.filter(e => e.change > 0);
    const negativeEvents = events.filter(e => e.change < 0);

    if (positiveEvents.length > 0) {
      lines.push(`正向事件（${positiveEvents.length}次）：`);
      positiveEvents.forEach((event, index) => {
        lines.push(`${index + 1}. ${event.speaker === 'user' ? '業務員' : '客戶'}說：「${event.utterance.substring(0, 50)}${event.utterance.length > 50 ? '...' : ''}」`);
        if (event.matchedRule) {
          lines.push(`   識別模式：${event.matchedRule.intentClassification}`);
        }
        lines.push(`   客情變化：${event.scoreBefore} → ${event.scoreAfter} (+${event.change})`);
        lines.push('');
      });
    }

    if (negativeEvents.length > 0) {
      lines.push(`負向事件（${negativeEvents.length}次）：`);
      negativeEvents.forEach((event, index) => {
        lines.push(`${index + 1}. ${event.speaker === 'user' ? '業務員' : '客戶'}說：「${event.utterance.substring(0, 50)}${event.utterance.length > 50 ? '...' : ''}」`);
        if (event.matchedRule) {
          lines.push(`   識別模式：${event.matchedRule.intentClassification}`);
          lines.push(`   心理分析：${event.matchedRule.psychologyExplanation}`);
        }
        lines.push(`   客情變化：${event.scoreBefore} → ${event.scoreAfter} (${event.change})`);
        lines.push('');
      });
    }
  }

  return lines.join('\n');
}

/**
 * 根據客戶類型獲取初始客情分數
 * 不同態度的客戶有不同的起始信任度
 */
export function getInitialRapportScore(customerType: CustomerType): number {
  switch (customerType) {
    case 'neutral':
      return 50;
    case 'avoidant':
      return 45;
    case 'skeptical':
      return 40;
    case 'has_insurance':
      return 45;
    default:
      return 50;
  }
}

/**
 * 台灣口語去歧義化輔助函數
 * 處理一些特殊的多義詞彙
 */
export function disambiguateTaiwaneseExpression(
  utterance: string
): {
  isPoliteOpening: boolean;
  isRejection: boolean;
  isGenuineConsideration: boolean;
} {
  const result = {
    isPoliteOpening: false,
    isRejection: false,
    isGenuineConsideration: false
  };

  // 「不好意思」的歧義處理
  if (utterance.includes('不好意思')) {
    // 如果在句首且後面接提問，通常是禮貌性發語詞
    if (utterance.startsWith('不好意思') && (utterance.includes('請問') || utterance.includes('想'))) {
      result.isPoliteOpening = true;
    }
    // 如果在句中且後接拒絕動詞，通常是拒絕
    else if (utterance.includes('不好意思') && (utterance.includes('不需要') || utterance.includes('不用'))) {
      result.isRejection = true;
    }
  }

  // 「考慮」的歧義處理
  if (utterance.includes('考慮')) {
    // 如果包含具體考慮對象，可能是真實考慮
    if (/考慮.{1,5}(預算|時間|家人|條款|內容|方案)/.test(utterance)) {
      result.isGenuineConsideration = true;
    }
    // 如果只說「考慮一下」「再考慮」，通常是軟性拒絕
    else if (utterance.match(/^.{0,10}(再)?考慮(一下|看看)?$/)) {
      result.isRejection = true;
    }
  }

  // 「了解」的歧義處理
  if (utterance.includes('了解')) {
    // 如果只說「了解」且後面沒有內容，通常是終止話題
    if (utterance.trim() === '了解' || utterance.trim() === '了解。') {
      result.isRejection = true;
    }
  }

  return result;
}
