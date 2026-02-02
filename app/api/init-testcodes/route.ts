import Redis from 'ioredis';

export async function GET() {
  let redis: Redis | null = null;
  
  try {
    // 連接到 Redis
    redis = new Redis(process.env.REDIS_URL!);
    
    // 測試碼配置
    const testCodes = [
      // 管理員碼
      { 
        code: "ADMIN-2026", 
        type: "admin",
        maxUses: -1,
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
      
      await redis.set(key, JSON.stringify(value));
      results.push({ code: tc.code, status: 'created' });
    }

    // 關閉連線
    await redis.quit();

    return Response.json({
      success: true,
      message: `成功建立 ${results.length} 個測試碼`,
      testCodes: results
    });

  } catch (error) {
    console.error('初始化錯誤:', error);
    
    // 如果有連線，確保關閉
    if (redis) {
      try {
        await redis.quit();
      } catch (e) {
        // 忽略關閉連線時的錯誤
      }
    }
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
```

這個新版本的程式碼做了幾個重要的改變。首先，它使用 `ioredis` 套件而不是 `@vercel/kv`，這樣就可以直接使用你現有的 `REDIS_URL` 環境變數。其次，它在每次操作完成後會正確地關閉 Redis 連線，這在 serverless 環境中是很重要的最佳實踐。

### 第三步：提交修改並等待部署

在 GitHub 上提交這兩個檔案的修改。Vercel 會自動偵測到變更並開始部署。你可以在 GitHub 的 commit 頁面看到部署進度，通常需要兩到三分鐘。

### 第四步：再次訪問初始化 API

部署完成後，再次訪問這個網址：
```
https://insurance-voice-training.vercel.app/api/init-testcodes
