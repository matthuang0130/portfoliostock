// app/lib/stockApi.ts

const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cleanSymbol(symbol: string): string {
  return String(symbol || '').trim().toUpperCase();
}

/**
 * 備援 1：Yahoo Finance
 */
async function fetchFromYahoo(symbol: string): Promise<number | null> {
  try {
    const code = cleanSymbol(symbol);
    const isTaiwanStock = /^\d{4}[A-Z]?$/.test(code);
    const primarySymbol = isTaiwanStock ? `${code}.TW` : code;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    };

    let res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${primarySymbol}?interval=1d&range=1d`, {
      headers,
      next: { revalidate: 300 }
    });

    if (!res.ok && isTaiwanStock) {
      res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${code}.TWO?interval=1d&range=1d`, {
        headers,
        next: { revalidate: 300 }
      });
    }

    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' && price > 0 ? price : null;
  } catch (e) {
    return null;
  }
}

/**
 * 備援 2：FinMind API
 */
async function fetchFromFinMind(symbol: string): Promise<number | null> {
  try {
    const code = cleanSymbol(symbol);
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const startDate = d.toISOString().split('T')[0];

    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${code}&start_date=${startDate}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      const lastRow = json.data[json.data.length - 1];
      const closePrice = parseFloat(lastRow.close);
      return !isNaN(closePrice) && closePrice > 0 ? closePrice : null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 🚀 核心股價獲取入口
 */
export async function fetchCurrentPrice(symbol: string, defaultPrice: number = 0): Promise<number> {
  const code = cleanSymbol(symbol);
  if (!code) return defaultPrice;

  const cached = priceCache.get(code);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.price;
  }

  let price = await fetchFromYahoo(code);
  if (price === null) price = await fetchFromFinMind(code);

  const finalPrice = price !== null ? price : defaultPrice;
  priceCache.set(code, { price: finalPrice, timestamp: now });

  return finalPrice;
}

/**
 * 🌟 股名完整涵蓋：同時抓取 上市 + 上櫃 + ETF Open Data
 */
export async function getStockNames(): Promise<Record<string, string>> {
  const nameMap: Record<string, string> = {};

  try {
    // 1. 上市股票 & ETF
    const twseRes = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', { next: { revalidate: 86400 } });
    if (twseRes.ok) {
      const list = await twseRes.json();
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item.Code && item.Name) nameMap[item.Code.trim()] = item.Name.trim();
        });
      }
    }
  } catch (e) {}

  try {
    // 2. 上櫃股票 & 興櫃 / 上櫃 ETF
    const tpexRes = await fetch('https://www.tpex.org.tw/openapi/v1/mops_all_listed_stocks', { next: { revalidate: 86400 } });
    if (tpexRes.ok) {
      const list = await tpexRes.json();
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item['公司代號'] && item['公司簡稱']) {
            nameMap[String(item['公司代號']).trim()] = String(item['公司簡稱']).trim();
          }
        });
      }
    }
  } catch (e) {}

  return nameMap;
}