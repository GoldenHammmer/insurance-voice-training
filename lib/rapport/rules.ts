// 客情規則庫 - 基於薩提爾冰山理論與台灣語用學研究
// 此規則庫包含25個語意模式，涵蓋電話約訪、商品銷售和爭議處理三大場景

// 場景類型定義
export type Scenario = "phone_invite" | "product_marketing" | "objection_handling";

// 客戶類型定義（對應到系統中的態度設定）
export type CustomerType = "neutral" | "avoidant" | "skeptical" | "has_insurance";

// 薩提爾應對姿態類型
export type SatirPosture = "placating" | "blaming" | "super_reasonable" | "irrelevant";

// 單一規則的資料結構
export interface RapportRule {
  id: string;                          // 規則唯一識別碼
  scenario: Scenario;                  // 適用場景
  customerType: CustomerType;          // 適用客戶類型
  satir_posture: SatirPosture;        // 對應的薩提爾姿態
  keywords: string[];                  // 關鍵字列表（用於快速匹配）
  sentencePatterns?: string[];         // 句法模式描述（可選，用於更精確的判斷）
  intentClassification: string;        // 意圖分類標籤
  psychologyExplanation: string;       // 心理機制說明
  rapportStrategy: string;             // 應對策略
  responseGuide: string;               // 話術指引範例
  rapportImpactScore: number;          // 客情影響分數（負數表示降低，正數表示提升）
  weight: number;                      // 規則權重（某些規則影響力更大）
}

// ============================================
// 場景一：電話約訪 (Tele-Appointment)
// ============================================

// 迴避態度：假性忙碌與反射性拒絕
const teleAvoidantBusyExcuse: RapportRule = {
  id: "tele_avoidant_busy_excuse",
  scenario: "phone_invite",
  customerType: "avoidant",
  satir_posture: "irrelevant",
  keywords: ["開會", "開車", "在忙", "沒空", "趕時間", "忙"],
  sentencePatterns: ["短句", "狀態描述", "結束對話請求"],
  intentClassification: "假性忙碌 (False Busy)",
  psychologyExplanation: "薩提爾『打岔型』：並非真的在忙，而是啟動『反射性拒絕』機制，避免認知負擔。這是大腦為了節省認知資源的自動防衛反應。",
  rapportStrategy: "突破反射防衛：不爭辯忙碌事實，改用『15秒鉤子』換取注意力。接受其忙碌框架，但要求極小承諾。",
  responseGuide: "好，只耽誤您15秒，這通電話主要目的是...",
  rapportImpactScore: -5,
  weight: 1.0
};

const teleAvoidantSendInfo: RapportRule = {
  id: "tele_avoidant_send_info_only",
  scenario: "phone_invite",
  customerType: "avoidant",
  satir_posture: "irrelevant",
  keywords: ["寄信", "寄資料", "傳真", "看一看", "有興趣再說", "email", "寄給我"],
  sentencePatterns: ["索取資料動作", "未來不確定承諾"],
  intentClassification: "敷衍打發 (Brush-off)",
  psychologyExplanation: "典型的『軟性拒絕』。透過答應看資料來結束通話，實際上收到後不會閱讀。這是台灣高語境文化中避免直接拒絕的策略。",
  rapportStrategy: "門檻策略：『資料很多，為了不浪費您時間，我只寄您最需要的，請問您幾歲？』強迫互動。",
  responseGuide: "資料很多，為了精準，請問您...",
  rapportImpactScore: -5,
  weight: 1.0
};

// 質疑態度：信任測試與隱私焦慮
const teleSkepticalDataSource: RapportRule = {
  id: "tele_skeptical_data_source",
  scenario: "phone_invite",
  customerType: "skeptical",
  satir_posture: "blaming",
  keywords: ["怎麼有電話", "誰給你的", "個資", "哪裡拿到", "亂槍打鳥", "隱私"],
  sentencePatterns: ["反問句", "質疑來源", "負面情緒詞"],
  intentClassification: "信任測試 (Trust Test)",
  psychologyExplanation: "薩提爾『指責型』：因缺乏安全感而先發制人，測試業務員的誠信與正當性。這反映了台灣社會對詐騙的高度警戒。",
  rapportStrategy: "一致性應對 (Congruence)：誠實告知來源（如問卷、舊客介紹），不閃躲，展現專業的一致性。",
  responseGuide: "是您上個月在網路上填寫了...，所以我特地...",
  rapportImpactScore: -8,
  weight: 1.5
};

const teleSkepticalUnwantedCall: RapportRule = {
  id: "tele_skeptical_unwanted_cold_call",
  scenario: "phone_invite",
  customerType: "skeptical",
  satir_posture: "blaming",
  keywords: ["不需要", "推銷", "很煩", "又是保險", "別打來"],
  sentencePatterns: ["直接否定句", "厭惡情緒詞"],
  intentClassification: "硬性拒絕 (Hard Rejection)",
  psychologyExplanation: "過往可能有不好的推銷經驗，產生刻板印象。這是一種防衛性的攻擊反應。",
  rapportStrategy: "去標籤化策略：『我不是來推銷保單，而是來通知一個您可能忽略的權益。』",
  responseGuide: "理解您常接電話，但我今天打來是因為...",
  rapportImpactScore: -9,
  weight: 1.5
};

// 中立態度：誘因驅動與無效回應
const teleNeutralCuriosity: RapportRule = {
  id: "tele_neutral_curiosity",
  scenario: "phone_invite",
  customerType: "neutral",
  satir_posture: "placating",
  keywords: ["什麼東西", "送什麼", "抽獎", "免費", "贈品"],
  sentencePatterns: ["針對贈品利益的提問"],
  intentClassification: "誘因驅動 (Incentive Driven)",
  psychologyExplanation: "對保險無感，只對『貪小便宜』有感。薩提爾『討好型』(順從慾望)。",
  rapportStrategy: "鉤子策略：利用贈品作為見面理由，但強調『名額有限』，製造稀缺性。",
  responseGuide: "這個健檢禮很搶手，我特地留一份給您，明天方便...",
  rapportImpactScore: -2,
  weight: 0.8
};

const teleNeutralHurried: RapportRule = {
  id: "tele_neutral_hurried",
  scenario: "phone_invite",
  customerType: "neutral",
  satir_posture: "irrelevant",
  keywords: ["快點", "重點", "然後呢", "趕時間", "講重點"],
  sentencePatterns: ["催促詞", "短句"],
  intentClassification: "時間施壓 (Time Pressure)",
  psychologyExplanation: "耐心極低，準備掛斷的前兆。並非真的趕時間，而是話題無趣。",
  rapportStrategy: "直球對決：直接講出最核心利益點 (Killer Benefit)，放棄鋪陳與寒暄。",
  responseGuide: "好，重點是這張保單能幫您節稅xx元...",
  rapportImpactScore: -6,
  weight: 1.2
};

// 已有保險：專業傲慢與飽和感
const teleInsuredSaturation: RapportRule = {
  id: "tele_insured_saturation",
  scenario: "phone_invite",
  customerType: "has_insurance",
  satir_posture: "super_reasonable",
  keywords: ["買滿了", "足夠", "幾十張", "不用了", "很多張"],
  sentencePatterns: ["完成式", "飽和狀態描述", "拒絕"],
  intentClassification: "能力防衛罩 (Competence Shield)",
  psychologyExplanation: "薩提爾『超理智型』：透過展現已有資源來維持優越感，拒絕被推銷。",
  rapportStrategy: "賦權策略 (Validating)：肯定其觀念，轉化為『保單健檢』。不挑戰既有決策，而是尋找動態缺口。",
  responseGuide: "您觀念很棒！但醫療技術在變，這份舊保單可能...",
  rapportImpactScore: -6,
  weight: 1.2
};

const teleInsuredFriendAgent: RapportRule = {
  id: "tele_insured_friend_agent",
  scenario: "phone_invite",
  customerType: "has_insurance",
  satir_posture: "placating",
  keywords: ["跟朋友買", "人情", "親戚在做", "不好意思", "朋友是業務"],
  sentencePatterns: ["人際關係詞", "忠誠度聲明"],
  intentClassification: "人情障礙 (Loyalty Barrier)",
  psychologyExplanation: "台灣重人情 (Guanxi)。背叛朋友會有罪惡感。對原業務員是『討好型』。",
  rapportStrategy: "互補策略：不取代朋友，強調『第二意見』或『補足朋友沒做的』。",
  responseGuide: "朋友服務很好，我只是幫您做個客觀的第二意見...",
  rapportImpactScore: -5,
  weight: 1.0
};

// ============================================
// 場景二：商品銷售 (Product Sales)
// ============================================

// 中立態度：假性同意與無效溝通
const salesNeutralPassiveListening: RapportRule = {
  id: "sales_neutral_passive_listening",
  scenario: "product_marketing",
  customerType: "neutral",
  satir_posture: "placating",
  keywords: ["喔", "嗯", "是喔", "嘿", "好", "嗯嗯"],
  sentencePatterns: ["單字回應", "極短句", "無主動提問"],
  intentClassification: "禮貌性敷衍 (Polite Disengagement)",
  psychologyExplanation: "薩提爾『討好型』：不想當面拒絕傷和氣，但實際上心不在焉（人在心不在）。",
  rapportStrategy: "喚醒策略：使用封閉式二擇一問題，或突然改變語速來抓回注意力。",
  responseGuide: "陳先生，關於這點您比較在意保障額度還是保費？",
  rapportImpactScore: -3,
  weight: 0.8
};

const salesNeutralAmbiguousAffirmation: RapportRule = {
  id: "sales_neutral_ambiguous_affirmation",
  scenario: "product_marketing",
  customerType: "neutral",
  satir_posture: "placating",
  keywords: ["是不錯", "還可以", "沒意見", "都可以", "不錯啦"],
  sentencePatterns: ["弱肯定詞", "無延伸意見", "語尾助詞"],
  intentClassification: "假性同意 (Pseudo Agreement)",
  psychologyExplanation: "表面順從但內心無動感。在台灣語境中，『是不錯啦』通常意味著『但我不會買』。",
  rapportStrategy: "測試性收單：既然沒意見，就嘗試推進成交，逼出真實異議。",
  responseGuide: "既然覺得不錯，那我們試算一下保費，看哪個方案適合？",
  rapportImpactScore: -4,
  weight: 0.9
};

const salesNeutralSilent: RapportRule = {
  id: "sales_neutral_silent",
  scenario: "product_marketing",
  customerType: "neutral",
  satir_posture: "irrelevant",
  keywords: ["...", "嗯哼"],
  sentencePatterns: ["極低詞彙密度", "長時間停頓"],
  intentClassification: "沉默抗拒 (Silent Resistance)",
  psychologyExplanation: "沉默是強大的防衛。薩提爾『打岔/抽離』。讓業務員尷尬而自亂陣腳。",
  rapportStrategy: "鏡像沉默：業務員也保持沉默，製造適度壓力，迫使客戶開口。",
  responseGuide: "(保持微笑與沉默，等待客戶開口)",
  rapportImpactScore: -8,
  weight: 1.3
};

// 迴避態度：權威轉移與軟性拒絕
const salesAvoidantSoftRejectionConsider: RapportRule = {
  id: "sales_avoidant_soft_rejection_consider",
  scenario: "product_marketing",
  customerType: "avoidant",
  satir_posture: "placating",
  keywords: ["再看看", "考慮一下", "再研究", "回去想", "不急", "想一想"],
  sentencePatterns: ["模糊時間詞", "延遲行動動詞"],
  intentClassification: "軟性拒絕 - 推託 (Soft Rejection - Deferral)",
  psychologyExplanation: "台灣語用特色：『考慮』通常等於『拒絕』。害怕當面衝突，給雙方台階下。",
  rapportStrategy: "具體化策略：直接詢問『考慮的具體點』是預算還是條款，不讓話題懸空。",
  responseGuide: "了解，通常考慮是因為預算還是條款細節？",
  rapportImpactScore: -7,
  weight: 1.2
};

const salesAvoidantAuthorityDeferral: RapportRule = {
  id: "sales_avoidant_authority_deferral",
  scenario: "product_marketing",
  customerType: "avoidant",
  satir_posture: "placating",
  keywords: ["問老婆", "問老公", "家人", "商量", "作主", "太太", "先生"],
  sentencePatterns: ["推託對象", "第三方", "決策權轉移"],
  intentClassification: "決策權轉移 (Authority Deferral)",
  psychologyExplanation: "利用『不在場的第三方』作為拒絕的理由，避免承擔直接拒絕的心理壓力。",
  rapportStrategy: "盟友策略：將其變成盟友，詢問『若您自己決定會買嗎？』釐清真實意願。",
  responseGuide: "如果不考慮家人的意見，您自己喜歡這份規劃嗎？",
  rapportImpactScore: -6,
  weight: 1.1
};

const salesAvoidantBudgetExcuse: RapportRule = {
  id: "sales_avoidant_budget_excuse",
  scenario: "product_marketing",
  customerType: "avoidant",
  satir_posture: "irrelevant",
  keywords: ["沒錢", "太貴", "手頭緊", "最近花費大", "吃土", "負擔不起"],
  sentencePatterns: ["經濟困難詞彙", "拒絕購買"],
  intentClassification: "價格抗拒 (Price Resistance)",
  psychologyExplanation: "可能是真沒錢，也可能是『價值<價格』的婉轉說法。薩提爾『打岔型』。",
  rapportStrategy: "拆解策略：將總價拆解為『每天幾元』，或詢問『若不考慮預算』來測試真偽。",
  responseGuide: "若不看價格，這個保障內容是您需要的嗎？",
  rapportImpactScore: -7,
  weight: 1.1
};

const salesAvoidantSelfDeprecating: RapportRule = {
  id: "sales_avoidant_self_deprecating",
  scenario: "product_marketing",
  customerType: "avoidant",
  satir_posture: "placating",
  keywords: ["我不懂啦", "我很笨", "你決定就好", "隨緣", "看你"],
  sentencePatterns: ["自我貶低詞", "放棄思考"],
  intentClassification: "依賴卸責 (Dependency)",
  psychologyExplanation: "薩提爾『討好型』極致。害怕做錯決定，乾脆不做決定或全聽別人的。",
  rapportStrategy: "引導與保證：給予極大的安全感與簡單選項，『多數人都選這個』。",
  responseGuide: "別擔心，這個方案是最多人選的標準配備，很安全。",
  rapportImpactScore: -4,
  weight: 0.9
};

// 質疑態度：價值挑戰與比較心態
const salesSkepticalPriceCompare: RapportRule = {
  id: "sales_skeptical_price_compare",
  scenario: "product_marketing",
  customerType: "skeptical",
  satir_posture: "blaming",
  keywords: ["別家", "便宜", "網路上", "CP值", "貴", "比較"],
  sentencePatterns: ["比較級句子", "引用外部資訊"],
  intentClassification: "價值挑戰 (Value Challenge)",
  psychologyExplanation: "薩提爾『指責型』：透過貶低產品價值來爭取談判籌碼或證明自己精明。",
  rapportStrategy: "差異化策略：認同價格差異，立即轉向『價值/理賠服務』的獨特性說明。",
  responseGuide: "沒錯，網路確實便宜，但理賠時我們多了專人服務...",
  rapportImpactScore: -5,
  weight: 1.2
};

const salesSkepticalFinePrint: RapportRule = {
  id: "sales_skeptical_fine_print",
  scenario: "product_marketing",
  customerType: "skeptical",
  satir_posture: "blaming",
  keywords: ["陷阱", "文字遊戲", "不賠", "看清楚", "條款", "除外"],
  sentencePatterns: ["負面名詞", "警告語氣"],
  intentClassification: "信任斷層 (Trust Gap)",
  psychologyExplanation: "深層恐懼：害怕被騙。薩提爾『指責型』背後是對受傷的焦慮。",
  rapportStrategy: "透明化策略：主動指出『除外責任』條款，展現比客戶更嚴謹的誠實。",
  responseGuide: "您很內行，這條款確實要注意，我帶您看第10條...",
  rapportImpactScore: -9,
  weight: 1.5
};

const salesSkepticalReputation: RapportRule = {
  id: "sales_skeptical_reputation",
  scenario: "product_marketing",
  customerType: "skeptical",
  satir_posture: "blaming",
  keywords: ["網評", "負評", "那家公司", "新聞", "爛", "評價"],
  sentencePatterns: ["引用公司負面消息", "質疑"],
  intentClassification: "公司信任危機 (Company Distrust)",
  psychologyExplanation: "將對公司的印象投射到業務員身上。薩提爾『指責型』。",
  rapportStrategy: "切割與承諾：承認公司過去問題，強調『我』個人的服務承諾與差異。",
  responseGuide: "公司確實有改進空間，但我保證我的服務是...",
  rapportImpactScore: -9,
  weight: 1.5
};

const salesSkepticalReturnRate: RapportRule = {
  id: "sales_skeptical_return_rate",
  scenario: "product_marketing",
  customerType: "skeptical",
  satir_posture: "super_reasonable",
  keywords: ["利率", "定存", "股票", "通膨", "划不來", "報酬率"],
  sentencePatterns: ["金融商品比較", "負面評價"],
  intentClassification: "投資比較 (Investment Comparison)",
  psychologyExplanation: "將保險錯誤定錨為投資商品。薩提爾『超理智』，只看數字忽略風險。",
  rapportStrategy: "風險重新定錨：強調保險的『槓桿』與『保本』功能，非單純投報率。",
  responseGuide: "股票賺錢很快，但保險是為了留住錢，這是風險管理。",
  rapportImpactScore: -6,
  weight: 1.2
};

// 已有保險：知識主導
const salesInsuredKnowItAll: RapportRule = {
  id: "sales_insured_know_it_all",
  scenario: "product_marketing",
  customerType: "has_insurance",
  satir_posture: "super_reasonable",
  keywords: ["那個我知道", "不用解釋", "我看過", "簡單講", "懂"],
  sentencePatterns: ["打斷句", "知識宣稱"],
  intentClassification: "主導權展示 (Dominance Display)",
  psychologyExplanation: "薩提爾『超理智』控制狂。不喜歡處於『被教導』的低位。",
  rapportStrategy: "請教策略：滿足其優越感，『既然您懂，想請教您怎麼看這點？』",
  responseGuide: "您是行家！那這部分我就不贅述，直接看重點...",
  rapportImpactScore: -7,
  weight: 1.3
};

// ============================================
// 場景三：爭議處理 (Dispute Resolution)
// ============================================

const disputeSkepticalPreExisting: RapportRule = {
  id: "dispute_skeptical_pre_existing",
  scenario: "objection_handling",
  customerType: "skeptical",
  satir_posture: "blaming",
  keywords: ["沒說", "不知情", "既往症", "硬凹", "亂講", "沒告訴我"],
  sentencePatterns: ["否認句", "指責句"],
  intentClassification: "義務否認 (Denial of Duty)",
  psychologyExplanation: "面對拒賠風險，啟動『指責型』防衛，否認自身的告知義務。",
  rapportStrategy: "法理情兼顧：先同理其挫折感，再客觀呈現投保時的健告文件。",
  responseGuide: "我理解這讓人錯愕，但根據健告書上的紀錄...",
  rapportImpactScore: -10,
  weight: 1.8
};

const disputeInsuredLegalThreat: RapportRule = {
  id: "dispute_insured_legal_threat",
  scenario: "objection_handling",
  customerType: "has_insurance",
  satir_posture: "blaming",
  keywords: ["金管會", "評議中心", "媒體", "蘋果", "存證信函", "告你"],
  sentencePatterns: ["機構名詞", "威脅", "期限條件句"],
  intentClassification: "升級威脅 (Escalation Threat)",
  psychologyExplanation: "薩提爾『超理智』+『指責』。利用外部權威施壓，尋求快速解決。",
  rapportStrategy: "降溫策略：不被威脅激怒，冷靜重申處理誠意，並提供正規申訴管道以示無懼。",
  responseGuide: "這是您的權利，但我更希望能幫您直接解決問題...",
  rapportImpactScore: -10,
  weight: 1.8
};

const disputeSkepticalAgentError: RapportRule = {
  id: "dispute_skeptical_agent_error",
  scenario: "objection_handling",
  customerType: "skeptical",
  satir_posture: "blaming",
  keywords: ["當初", "業務員說", "亂賣", "沒講清楚", "騙我簽名"],
  sentencePatterns: ["過去式", "指責業務員行為"],
  intentClassification: "招攬不實指控 (Mis-selling Accusation)",
  psychologyExplanation: "薩提爾『指責型』。將責任外推給前手業務員，試圖獲得例外處理。",
  rapportStrategy: "同理但不認錯：同理其感受，但釐清事實，避免替前手業務員背黑鍋。",
  responseGuide: "當時的情況我沒參與，但現在我能幫您做的是...",
  rapportImpactScore: -10,
  weight: 1.8
};

const disputeNeutralConfusion: RapportRule = {
  id: "dispute_neutral_confusion",
  scenario: "objection_handling",
  customerType: "neutral",
  satir_posture: "placating",
  keywords: ["怎麼會", "我不懂", "複雜", "隨便啦", "麻煩", "不知道"],
  sentencePatterns: ["困惑詞", "放棄", "被動語態"],
  intentClassification: "習得無助 (Helplessness)",
  psychologyExplanation: "薩提爾『討好型』變體。面對複雜理賠流程感到無力，可能放棄權益或累積隱性不滿。",
  rapportStrategy: "簡化引導：擔任『導遊』角色，將流程拆解為簡單步驟，消除無助感。",
  responseGuide: "別擔心，我們只要補這張單子就好，我教您寫...",
  rapportImpactScore: -4,
  weight: 0.9
};

const disputeAvoidantGhosting: RapportRule = {
  id: "dispute_avoidant_ghosting",
  scenario: "objection_handling",
  customerType: "avoidant",
  satir_posture: "irrelevant",
  keywords: ["沒收到", "忘記", "太忙", "下次", "找不到"],
  sentencePatterns: ["遺忘忽略藉口", "拖延"],
  intentClassification: "流程拖延 (Process Stalling)",
  psychologyExplanation: "面對理賠補件的繁瑣感到逃避。薩提爾『打岔型』。",
  rapportStrategy: "便利性策略：提供『到府收件』或『拍照上傳』的最簡便路徑。",
  responseGuide: "沒關係，您現在拍給我，我幫您填。",
  rapportImpactScore: -6,
  weight: 1.1
};

// 將所有規則匯出為一個陣列
export const RAPPORT_RULES: RapportRule[] = [
  // 電話約訪場景
  teleAvoidantBusyExcuse,
  teleAvoidantSendInfo,
  teleSkepticalDataSource,
  teleSkepticalUnwantedCall,
  teleNeutralCuriosity,
  teleNeutralHurried,
  teleInsuredSaturation,
  teleInsuredFriendAgent,
  
  // 商品銷售場景
  salesNeutralPassiveListening,
  salesNeutralAmbiguousAffirmation,
  salesNeutralSilent,
  salesAvoidantSoftRejectionConsider,
  salesAvoidantAuthorityDeferral,
  salesAvoidantBudgetExcuse,
  salesAvoidantSelfDeprecating,
  salesSkepticalPriceCompare,
  salesSkepticalFinePrint,
  salesSkepticalReputation,
  salesSkepticalReturnRate,
  salesInsuredKnowItAll,
  
  // 爭議處理場景
  disputeSkepticalPreExisting,
  disputeInsuredLegalThreat,
  disputeSkepticalAgentError,
  disputeNeutralConfusion,
  disputeAvoidantGhosting
];

// 輔助函數：根據場景和客戶類型篩選相關規則
export function getRelevantRules(
  scenario: Scenario,
  customerType: CustomerType
): RapportRule[] {
  return RAPPORT_RULES.filter(
    rule => rule.scenario === scenario && rule.customerType === customerType
  );
}

// 輔助函數：根據規則ID查找特定規則
export function getRuleById(id: string): RapportRule | undefined {
  return RAPPORT_RULES.find(rule => rule.id === id);
}
