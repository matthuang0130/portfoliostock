// app/lib/stockApi.ts

export async function fetchCurrentPrice(symbol: string, fallbackPrice: number): Promise<number> {
  try {
    const today = new Date();
    const pastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = pastWeek.toISOString().split('T')[0];

    // 抓取環境變數裡的金鑰
    const token = process.env.FINMIND_TOKEN;
    
    // 如果有金鑰，就把它轉換成網址參數格式；如果沒有，就維持空白字串
    const tokenParam = token ? `&token=${token}` : '';

    // 把 tokenParam 接在網址最後面
    const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate}${tokenParam}`;
    
    const response = await fetch(apiUrl, { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`連線 FinMind 失敗: ${response.status}`);
    }

    const json = await response.json();

    if (json.msg === 'success' && json.data && json.data.length > 0) {
      const latestData = json.data[json.data.length - 1];
      return latestData.close; 
    } else {
      console.warn(`[警告] FinMind 找不到 ${symbol} 報價，啟用防呆機制。`);
      return fallbackPrice; 
    }

  } catch (error) {
    console.error(`抓取 ${symbol} 發生例外錯誤:`, error);
    return fallbackPrice; 
  }
}
// app/lib/stockApi.ts (接在最下面)

export async function getStockNames(): Promise<Record<string, string>> {
  try {
    const token = process.env.FINMIND_TOKEN;
    const tokenParam = token ? `&token=${token}` : '';
    const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo${tokenParam}`;
    
    // 這個清單不會每天變，我們設定快取 24 小時 (86400秒) 以節省效能
    const response = await fetch(apiUrl, { next: { revalidate: 86400 } });
    if (!response.ok) return {};
    
    const json = await response.json();
    const map: Record<string, string> = {};
    
    // 把撈回來的資料轉換成 { "0050": "元大台灣50", "2330": "台積電" } 的字典格式
    if (json.msg === 'success' && Array.isArray(json.data)) {
      json.data.forEach((item: any) => {
        map[item.stock_id] = item.stock_name;
      });
    }
    return map;
  } catch (error) {
    console.error('抓取股票名稱失敗:', error);
    return {};
  }
}