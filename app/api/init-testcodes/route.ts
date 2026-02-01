import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // 測試碼配置
    const testCodes = [
      // 管理員碼
      { 
        code: "ADMIN-2026", 
        type: "admin",
        maxUses: -1,  // -1 代表無限次
        description: "管理員測試碼"
      },
      
      // VIP 測試者（5 次）
      { 
        code: "VIP-001", 
        type: "vip",
        maxUses: 5,
        description: "VIP 測試者 #1"
      },
      { 
        code: "VIP-002", 
        type: "vip",
        maxUses: 5,
        description: "VIP 測試者 #2"
      },
      { 
        code: "VIP-003", 
        type: "vip",
        maxUses: 5,
        description: "VIP 測試者 #3"
      },
      
      // 標準測試者（3 次）
      { 
        code: "TEST-001", 
        type: "standard",
        maxUses: 3,
        description: "標準測試者 #1"
      },
      { 
        code: "TEST-002", 
        type: "standard",
        maxUses: 3,
        description: "標準測試者 #2"
      },
      { 
        code: "TEST-003", 
        type: "standard",
        maxUses: 3,
        description: "標準測試者 #3"
      },
      
      // 快速驗證者（1 次）
      { 
        code: "TRIAL-001", 
        type: "trial",
        maxUses: 1,
        description: "試用測試者 #1"
      },
    ];

    // 寫入 Redis
    const results = [];
    for (const tc of testCodes) {
      const key = `testcode:${tc.code}`;
      const value = {
        code: tc.code,
        type: tc.type,
        maxUses: tc.maxUses,
        usedCount: 0,
        description: tc.description,
        createdAt: new Date().toISOString(),
        lastUsedAt: null
      };
      
      await kv.set(key, value);
      results.push({ code: tc.code, status: 'created' });
    }

    return Response.json({
      success: true,
      message: `成功建立 ${results.length} 個測試碼`,
      testCodes: results
    });

  } catch (error) {
    console.error('初始化錯誤:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
