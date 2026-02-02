import Redis from 'ioredis';

export async function POST(req: Request) {
  let redis: Redis | null = null;
  
  try {
    const { code } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return Response.json({
        success: false,
        error: '請提供測試碼'
      }, { status: 400 });
    }

    redis = new Redis(process.env.REDIS_URL!);
    
    const key = `testcode:${code}`;
    const dataStr = await redis.get(key);
    
    if (!dataStr) {
      await redis.quit();
      return Response.json({
        success: false,
        error: '測試碼不存在'
      }, { status: 404 });
    }

    const codeData = JSON.parse(dataStr);
    
    if (codeData.maxUses !== -1 && codeData.usedCount >= codeData.maxUses) {
      await redis.quit();
      return Response.json({
        success: false,
        error: '此測試碼已用完'
      }, { status: 403 });
    }

    await redis.quit();

    return Response.json({
      success: true,
      message: '驗證成功',
      codeData: {
        code: codeData.code,
        type: codeData.type,
        maxUses: codeData.maxUses,
        usedCount: codeData.usedCount,
        remaining: codeData.maxUses === -1 ? -1 : codeData.maxUses - codeData.usedCount
      }
    });

  } catch (error) {
    console.error('驗證錯誤:', error);
    
    if (redis) {
      try {
        await redis.quit();
      } catch (e) {
        console.error('關閉連線失敗:', e);
      }
    }
    
    return Response.json({
      success: false,
      error: '驗證失敗'
    }, { status: 500 });
  }
}
