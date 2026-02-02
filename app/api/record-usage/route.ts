import Redis from 'ioredis';

export async function POST(req: Request) {
  let redis: Redis | null = null;
  
  try {
    const { testCode, duration } = await req.json();
    
    if (!testCode) {
      return Response.json({
        success: false,
        error: '缺少測試碼'
      }, { status: 400 });
    }

    redis = new Redis(process.env.REDIS_URL!);
    
    const key = `testcode:${testCode}`;
    const dataStr = await redis.get(key);
    
    if (!dataStr) {
      await redis.quit();
      return Response.json({
        success: false,
        error: '測試碼不存在'
      }, { status: 404 });
    }

    const codeData = JSON.parse(dataStr);
    
    if (codeData.maxUses !== -1) {
      codeData.usedCount = (codeData.usedCount || 0) + 1;
    }
    
    codeData.lastUsedAt = new Date().toISOString();
    
    await redis.set(key, JSON.stringify(codeData));
    await redis.quit();

    return Response.json({
      success: true,
      message: '使用記錄已更新',
      remaining: codeData.maxUses === -1 ? -1 : codeData.maxUses - codeData.usedCount
    });

  } catch (error) {
    console.error('記錄錯誤:', error);
    
    if (redis) {
      try {
        await redis.quit();
      } catch (e) {
        console.error('關閉連線失敗:', e);
      }
    }
    
    return Response.json({
      success: false,
      error: '記錄失敗'
    }, { status: 500 });
  }
}
