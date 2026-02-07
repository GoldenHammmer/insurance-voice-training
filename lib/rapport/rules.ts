// 客情規則庫 - 基於薩提爾冰山理論與台灣語用學研究
// 此規則庫包含 40 個語意模式：25 個負面規則 + 15 個正向規則

// 場景類型定義
export type Scenario = "phone_invite" | "product_marketing" | "objection_handling";

// 客戶類型定義（對應到系統中的態度設定）
export type CustomerType = "neutral" | "avoidant" | "skeptical" | "has_insurance";

// 薩提爾應對姿態類型
export type SatirPosture = "placating" | "blaming" | "super_reasonable" | "irrelevant" | "congruent";

// 規則類型：negative 表示客戶的負面反應，positive 表示業務員的正向行為
export type RuleType = "negative" | "positive";

// 單一規則的資料結構
export interface RapportRule {
  id: string;
  ruleType: RuleType;
  scenario: Scenario | Scenario[];
  customerType?: CustomerType;
  satir_posture: SatirPosture;
  keywords: string[];
  sentencePatterns?: string[];
  intentClassification: string;
  psychologyExplanation: string;
  rapportStrategy: string;
  responseGuide: string;
  rapportImpactScore: number;
  weight: number;
}

// ============================================
// 正向規則：業務員的高信任感語言模式
// ============================================

const positiveEmpathy: RapportRule = {
  id: "positive_empathy_expression",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["我理解", "我明白", "我了解", "我知道", "我感覺得到", "我能體會"],
  sentencePatterns: ["同理心詞彙", "對客戶感受的確認"],
  intentClassification: "同理心表達 (Empathy Expression)",
  psychologyExplanation: "薩提爾一致性溝通的核心。透過語言明確表達對客戶感受的理解，降低杏仁核的防衛反應，促進催產素釋放，建立情感連結。",
  rapportStrategy: "在客戶表達困難或疑慮時，立即給予同理，讓客戶感到被理解而非被推銷。",
  responseGuide: "我完全理解您的考量...",
  rapportImpactScore: 5,
  weight: 1.2
};

const positiveFaceSaving: RapportRule = {
  id: "positive_face_saving_buffer",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["很正常", "可以理解", "很多人", "這是合理的", "我也會這樣想", "確實"],
  sentencePatterns: ["正常化客戶觀點", "避免直接否定"],
  intentClassification: "面子保護緩衝 (Face-Saving Buffer)",
  psychologyExplanation: "台灣高語境文化的核心技巧。先肯定客戶的想法或顧慮是正常的，保護其面子，然後再進行觀念引導。避免讓客戶感到被指正或批評。",
  rapportStrategy: "當客戶有錯誤觀念或異議時，先正常化其想法，再進行 Pacing and Leading。",
  responseGuide: "這個想法很正常，很多客戶一開始也這樣認為...",
  rapportImpactScore: 4,
  weight: 1.0
};

const positiveEmpowerment: RapportRule = {
  id: "positive_empowerment_validation",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["您很內行", "您的觀念很好", "您很精明", "您很懂", "您說得對", "您很專業", "您很有遠見"],
  sentencePatterns: ["肯定客戶能力", "讚美客戶特質"],
  intentClassification: "賦權與肯定 (Empowerment & Validation)",
  psychologyExplanation: "特別適用於指責型和超理智型客戶。透過肯定其能力和判斷，滿足其優越感需求，將其從對立面轉化為盟友。基於薩提爾的賦權策略。",
  rapportStrategy: "面對挑剔或展現專業知識的客戶，不要反駁，而是肯定其標準高、眼光好。",
  responseGuide: "您對這些細節這麼在意，可見您是非常謹慎的人...",
  rapportImpactScore: 6,
  weight: 1.3
};

const positiveSafetyProvision: RapportRule = {
  id: "positive_safety_provision",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["我們會陪著您", "不用擔心", "很安全", "穩健", "我們一步一步", "我會協助您", "放心"],
  sentencePatterns: ["提供安全感", "陪伴承諾"],
  intentClassification: "安全感提供 (Safety Provision)",
  psychologyExplanation: "特別適用於討好型客戶。討好型客戶害怕做錯決定，需要強大的安全感和引導。透過承諾陪伴和支持，降低其決策焦慮。",
  rapportStrategy: "當客戶表現猶豫或焦慮時，提供明確的支持和陪伴承諾。",
  responseGuide: "別擔心，我們會一步一步陪著您完成，您不需要一個人承擔。",
  rapportImpactScore: 5,
  weight: 1.1
};

const positiveOpenQuestion: RapportRule = {
  id: "positive_open_ended_question",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["您覺得", "您認為", "您的想法", "請問", "想請教", "您希望", "您需要"],
  sentencePatterns: ["開放式問句", "徵詢意見"],
  intentClassification: "開放式探索問題 (Open-Ended Discovery)",
  psychologyExplanation: "展現對客戶意見的重視，給予其表達空間和掌控感。開放式問題能引導客戶自我探索需求，比封閉式問題更能建立信任。",
  rapportStrategy: "用開放式問題了解客戶真實需求，避免直接推銷或假設客戶需求。",
  responseGuide: "您覺得什麼樣的保障規劃會讓您比較安心？",
  rapportImpactScore: 3,
  weight: 0.9
};

const positiveHonestyFrame: RapportRule = {
  id: "positive_honesty_transparency",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["我要誠實說", "實話告訴您", "我必須坦白", "老實說", "據實說明", "透明地講"],
  sentencePatterns: ["誠實框架", "透明揭露"],
  intentClassification: "透明誠實框架 (Honesty Frame)",
  psychologyExplanation: "在台灣保險市場信任赤字的背景下，主動的誠實揭露是建立信任的關鍵。特別適用於投資型保單等敏感商品的說明。",
  rapportStrategy: "在說明產品風險或限制時，主動使用誠實框架，展現專業誠信。",
  responseGuide: "我要跟您誠實說明，這個商品確實有市場風險...",
  rapportImpactScore: 7,
  weight: 1.4
};

const positiveAutonomy: RapportRule = {
  id: "positive_decision_autonomy",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["不急", "慢慢考慮", "沒有壓力", "您決定就好", "不勉強", "隨時都可以", "給您時間"],
  sentencePatterns: ["尊重決策權", "減壓用語"],
  intentClassification: "尊重決策自主權 (Decision Autonomy)",
  psychologyExplanation: "降低客戶的杏仁核戒備反應。越是強調不強迫，客戶越感到安全，反而更願意考慮。這是反向心理學的應用。",
  rapportStrategy: "在適當時機表達不施壓，給予客戶心理空間。",
  responseGuide: "這個決定很重要，您慢慢考慮，沒有時間壓力。",
  rapportImpactScore: 4,
  weight: 1.0
};

const positiveConcreteSolution: RapportRule = {
  id: "positive_concrete_solution",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["具體來說", "我們可以", "有個方法", "這樣規劃", "舉例來說", "比如說", "實際上"],
  sentencePatterns: ["提供具體方案", "實例說明"],
  intentClassification: "具體方案提供 (Concrete Solution)",
  psychologyExplanation: "將抽象的保險概念轉化為具體可行的方案，降低認知負擔。具體性能增加可信度和可行性感知。",
  rapportStrategy: "當客戶表達預算或其他顧慮時，提供具體的、可操作的解決方案。",
  responseGuide: "具體來說，如果我們把保費分攤到每天，其實只是一杯咖啡的錢...",
  rapportImpactScore: 5,
  weight: 1.1
};

const positiveThirdPartyProof: RapportRule = {
  id: "positive_social_proof",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["很多客戶", "大家都", "大部分人", "我們服務過", "普遍的選擇", "市場上"],
  sentencePatterns: ["社會認證", "他人經驗"],
  intentClassification: "社會認證 (Social Proof)",
  psychologyExplanation: "利用從眾心理降低決策風險感知。特別適用於討好型客戶，他們傾向於跟隨多數人的選擇以避免犯錯。",
  rapportStrategy: "提供其他客戶的經驗或選擇，但要真實不能捏造。",
  responseGuide: "很多跟您情況類似的客戶都選擇這個方案，反應都很好。",
  rapportImpactScore: 4,
  weight: 1.0
};

const positivePersonalCommitment: RapportRule = {
  id: "positive_personal_commitment",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["我保證", "我承諾", "我負責", "我會確保", "您可以信任我", "我向您保證"],
  sentencePatterns: ["個人承諾", "責任擔當"],
  intentClassification: "個人服務承諾 (Personal Commitment)",
  psychologyExplanation: "將公司的抽象信任轉化為對業務員個人的信任。在台灣的關係文化中，人與人之間的信任往往強於對組織的信任。",
  rapportStrategy: "在適當時機做出個人服務承諾，但必須是自己能做到的。",
  responseGuide: "我向您保證，無論將來發生什麼狀況，我都會親自協助您處理理賠。",
  rapportImpactScore: 6,
  weight: 1.2
};

const positiveValueReframe: RapportRule = {
  id: "positive_value_reframe",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["不是費用而是", "這代表", "真正的價值", "長遠來看", "換個角度", "其實是"],
  sentencePatterns: ["重新框架", "價值轉化"],
  intentClassification: "價值重新框架 (Value Reframing)",
  psychologyExplanation: "NLP 的核心技巧。將客戶認知中的「成本」重新框架為「投資」或「保障」，改變其心理帳戶的分類。",
  rapportStrategy: "當客戶關注價格時,重新框架為價值、保障或責任。",
  responseGuide: "這不只是一筆費用，這代表著您對家人的承諾和責任。",
  rapportImpactScore: 5,
  weight: 1.1
};

const positiveGuanxiBuilding: RapportRule = {
  id: "positive_guanxi_connection",
  ruleType: "positive",
  scenario: ["phone_invite", "product_marketing"],
  satir_posture: "congruent",
  keywords: ["有緣", "認識您是我的榮幸", "交個朋友", "長期合作", "互相照應", "建立關係"],
  sentencePatterns: ["關係建立", "人情連結"],
  intentClassification: "關係資本建立 (Guanxi Building)",
  psychologyExplanation: "台灣商業文化的核心。將交易關係轉化為人際關係，建立長期的互惠網絡。這符合台灣的集體主義文化價值觀。",
  rapportStrategy: "在適當時機表達希望建立長期關係而非一次性交易。",
  responseGuide: "能認識您是我的榮幸，希望未來能有機會為您服務。",
  rapportImpactScore: 4,
  weight: 1.0
};

const positiveStructureProvision: RapportRule = {
  id: "positive_structure_guidance",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["我們分三個步驟", "首先", "接下來", "最後", "整個流程", "讓我說明"],
  sentencePatterns: ["提供結構", "步驟說明"],
  intentClassification: "結構與引導提供 (Structure Provision)",
  psychologyExplanation: "薩提爾變革模型中的關鍵。在客戶面對複雜資訊感到混亂時，提供清晰的結構能降低焦慮，增加掌控感。",
  rapportStrategy: "將複雜的保險資訊拆解為清晰的步驟或架構。",
  responseGuide: "讓我用三個步驟跟您說明這個規劃...",
  rapportImpactScore: 3,
  weight: 0.9
};

const positiveFlexibility: RapportRule = {
  id: "positive_flexibility_adaptation",
  ruleType: "positive",
  scenario: ["product_marketing", "objection_handling"],
  satir_posture: "congruent",
  keywords: ["我們可以調整", "彈性規劃", "客製化", "配合您的", "有其他方案", "可以修改"],
  sentencePatterns: ["展現彈性", "客製化意願"],
  intentClassification: "彈性與適應性 (Flexibility & Adaptation)",
  psychologyExplanation: "展現願意為客戶調整方案的態度，讓客戶感到被重視。避免給人「一套方案賣給所有人」的制式化印象。",
  rapportStrategy: "當客戶表達特殊需求或預算限制時，展現調整意願。",
  responseGuide: "這個方案我們可以根據您的預算來調整，不是固定的。",
  rapportImpactScore: 4,
  weight: 1.0
};

const positiveRiskAwareness: RapportRule = {
  id: "positive_risk_disclosure",
  ruleType: "positive",
  scenario: ["product_marketing"],
  satir_posture: "congruent",
  keywords: ["必須注意", "有風險", "除外責任", "限制條件", "這點要特別說明", "可能的狀況"],
  sentencePatterns: ["風險揭露", "限制說明"],
  intentClassification: "主動風險揭露 (Proactive Risk Disclosure)",
  psychologyExplanation: "反向操作的信任建立。主動揭露產品限制和風險，展現專業誠信，反而能增加客戶對業務員的信任。",
  rapportStrategy: "在客戶詢問前，主動說明產品的限制和除外責任。",
  responseGuide: "這個商品確實很好，但有幾點除外責任我必須跟您說明清楚...",
  rapportImpactScore: 6,
  weight: 1.3
};

// ============================================
// 場景一：電話約訪 (Tele-Appointment)
// 負面規則
// ============================================

const teleAvoidantBusyExcuse: RapportRule = {
  id: "tele_avoidant_busy_excuse",
  ruleType: "negative",
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
  ruleType: "negative",
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

const teleSkepticalDataSource: RapportRule = {
  id: "tele_skeptical_data_source",
  ruleType: "negative",
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
  ruleType: "negative",
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

const teleNeutralCuriosity: RapportRule = {
  id: "tele_neutral_curiosity",
  ruleType: "negative",
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
  ruleType: "negative",
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

const teleInsuredSaturation: RapportRule = {
  id: "tele_insured_saturation",
  ruleType: "negative",
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
  ruleType: "negative",
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
// 負面規則（部分規則同時適用於異議處理）
// ============================================

const salesNeutralPassiveListening: RapportRule = {
  id: "sales_neutral_passive_listening",
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
  customerType: "neutral",
  satir_posture: "placating",
  keywords: ["喔", "嗯", "是喔", "嘿", "好"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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

const salesAvoidantSoftRejectionConsider: RapportRule = {
  id: "sales_avoidant_soft_rejection_consider",
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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

const salesSkepticalPriceCompare: RapportRule = {
  id: "sales_skeptical_price_compare",
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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

const salesInsuredKnowItAll: RapportRule = {
  id: "sales_insured_know_it_all",
  ruleType: "negative",
  scenario: ["product_marketing", "objection_handling"],
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
// 負面規則
// ============================================

const disputeSkepticalPreExisting: RapportRule = {
  id: "dispute_skeptical_pre_existing",
  ruleType: "negative",
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
  ruleType: "negative",
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
  ruleType: "negative",
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
  ruleType: "negative",
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
  ruleType: "negative",
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

// ============================================
// 匯出所有規則
// ============================================

export const RAPPORT_RULES: RapportRule[] = [
  // 正向規則（15個）
  positiveEmpathy,
  positiveFaceSaving,
  positiveEmpowerment,
  positiveSafetyProvision,
  positiveOpenQuestion,
  positiveHonestyFrame,
  positiveAutonomy,
  positiveConcreteSolution,
  positiveThirdPartyProof,
  positivePersonalCommitment,
  positiveValueReframe,
  positiveGuanxiBuilding,
  positiveStructureProvision,
  positiveFlexibility,
  positiveRiskAwareness,
  
  // 電話約訪場景（8個）
  teleAvoidantBusyExcuse,
  teleAvoidantSendInfo,
  teleSkepticalDataSource,
  teleSkepticalUnwantedCall,
  teleNeutralCuriosity,
  teleNeutralHurried,
  teleInsuredSaturation,
  teleInsuredFriendAgent,
  
  // 商品銷售場景（14個，部分同時適用於異議處理）
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
  
  // 爭議處理場景（5個）
  disputeSkepticalPreExisting,
  disputeInsuredLegalThreat,
  disputeSkepticalAgentError,
  disputeNeutralConfusion,
  disputeAvoidantGhosting
];

// 輔助函數：根據場景和客戶類型篩選相關規則
export function getRelevantRules(
  scenario: Scenario,
  customerType: CustomerType,
  ruleType?: RuleType
): RapportRule[] {
  return RAPPORT_RULES.filter(rule => {
    // 檢查場景匹配（支援單一場景或多場景陣列）
    const scenarioMatch = Array.isArray(rule.scenario) 
      ? rule.scenario.includes(scenario)
      : rule.scenario === scenario;
    
    // 檢查客戶類型匹配（正向規則沒有 customerType，所以跳過檢查）
    const customerTypeMatch = rule.ruleType === "positive" || rule.customerType === customerType;
    
    // 檢查規則類型匹配（如果有指定）
    const ruleTypeMatch = !ruleType || rule.ruleType === ruleType;
    
    return scenarioMatch && customerTypeMatch && ruleTypeMatch;
  });
}

// 輔助函數：根據規則ID查找特定規則
export function getRuleById(id: string): RapportRule | undefined {
  return RAPPORT_RULES.find(rule => rule.id === id);
}

// 輔助函數：獲取所有正向規則
export function getPositiveRules(scenario?: Scenario): RapportRule[] {
  return RAPPORT_RULES.filter(rule => {
    if (rule.ruleType !== "positive") return false;
    if (!scenario) return true;
    return Array.isArray(rule.scenario) 
      ? rule.scenario.includes(scenario)
      : rule.scenario === scenario;
  });
}

// 輔助函數：獲取所有負面規則
export function getNegativeRules(scenario?: Scenario, customerType?: CustomerType): RapportRule[] {
  return RAPPORT_RULES.filter(rule => {
    if (rule.ruleType !== "negative") return false;
    
    const scenarioMatch = !scenario || (
      Array.isArray(rule.scenario) 
        ? rule.scenario.includes(scenario)
        : rule.scenario === scenario
    );
    
    const customerTypeMatch = !customerType || rule.customerType === customerType;
    
    return scenarioMatch && customerTypeMatch;
  });
}
