import { neon } from '@neondatabase/serverless';
import TransactionForm from './components/TransactionForm';
import ImportExcel from './components/ImportExcel';
import ClearDataButton from './components/ClearDataButton';
import DashboardCharts from './components/DashboardCharts';
import AccountTabs from './components/AccountTabs';
import StockRow from './components/StockRow'; 
import { fetchCurrentPrice, getStockNames } from './lib/stockApi'; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(props: { searchParams: Promise<any> }) {
  const params = await props.searchParams;
  const currentAccount = params?.account || '1';
  const accId = currentAccount === 'all' ? 0 : Number(currentAccount);

  const sql = neon(process.env.DATABASE_URL!);
  const stockNameMap = await getStockNames();

  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS symbol_name VARCHAR(100);`;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS record_source VARCHAR(20) DEFAULT 'INVENTORY';`;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC;`;

  // 1. 純持股庫存與成本
  const holdings: any[] = currentAccount === 'all'
    ? await sql`
        SELECT symbol,
          MAX(symbol_name) AS symbol_name,
          SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END) AS total_shares,
          SUM(CASE WHEN action_type IN ('BUY') THEN total_amount ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN total_amount ELSE 0 END) AS net_cost
        FROM transactions 
        WHERE (record_source IS NULL OR record_source = 'INVENTORY')
        GROUP BY symbol
        HAVING (SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END)) > 0
      `
    : await sql`
        SELECT symbol,
          MAX(symbol_name) AS symbol_name,
          SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END) AS total_shares,
          SUM(CASE WHEN action_type IN ('BUY') THEN total_amount ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN total_amount ELSE 0 END) AS net_cost
        FROM transactions 
        WHERE account_id = ${accId} AND (record_source IS NULL OR record_source = 'INVENTORY')
        GROUP BY symbol
        HAVING (SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END)) > 0
      `;

  // 🌟 2. 查詢對帳單 (HISTORY_PNL) 的歷史紀錄日期範圍 (起訖時間)
  const pnlDateRange = currentAccount === 'all'
    ? await sql`
        SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date 
        FROM transactions 
        WHERE record_source = 'HISTORY_PNL'
      `
    : await sql`
        SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date 
        FROM transactions 
        WHERE account_id = ${accId} AND record_source = 'HISTORY_PNL'
      `;

  const minPnlDate = pnlDateRange[0]?.min_date ? new Date(pnlDateRange[0].min_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) : null;
  const maxPnlDate = pnlDateRange[0]?.max_date ? new Date(pnlDateRange[0].max_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) : null;

  // 3. 抓取現金配息明細
  const rawDividendDetails = currentAccount === 'all'
    ? await sql`SELECT id, symbol, symbol_name, trade_date, total_amount FROM transactions WHERE action_type = 'CASH_DIVIDEND' AND total_amount > 0 ORDER BY trade_date DESC`
    : await sql`SELECT id, symbol, symbol_name, trade_date, total_amount FROM transactions WHERE account_id = ${accId} AND action_type = 'CASH_DIVIDEND' AND total_amount > 0 ORDER BY trade_date DESC`;

  const dividendDetails = rawDividendDetails.map((tx: any) => ({
    id: tx.id,
    symbol: String(tx.symbol || ''),
    symbol_name: tx.symbol_name || stockNameMap[String(tx.symbol)] || '',
    trade_date: new Date(tx.trade_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    total_amount: Math.round(Number(tx.total_amount || 0))
  }));

  // 4. 股票配息映射表
  const symbolDividendMap: { [symbol: string]: number } = {};
  dividendDetails.forEach(item => {
    symbolDividendMap[item.symbol] = (symbolDividendMap[item.symbol] || 0) + item.total_amount;
  });

  // 5. 年度柱狀圖統計
  const yearlyDividendsMap: { [year: number]: number } = {};
  dividendDetails.forEach(item => {
    const y = new Date(item.trade_date).getFullYear();
    yearlyDividendsMap[y] = (yearlyDividendsMap[y] || 0) + item.total_amount;
  });

  const yearlyDividends = Object.keys(yearlyDividendsMap)
    .map(year => ({ year: Number(year), dividend: yearlyDividendsMap[Number(year)] }))
    .sort((a, b) => a.year - b.year);

  // 6. 已實現損益
  const yearlyRealizedPnlRaw = currentAccount === 'all'
    ? await sql`
        SELECT EXTRACT(YEAR FROM trade_date)::int AS year, SUM(realized_pnl) AS yearly_pnl 
        FROM transactions WHERE realized_pnl IS NOT NULL AND realized_pnl != 0
        GROUP BY year ORDER BY year ASC
      `
    : await sql`
        SELECT EXTRACT(YEAR FROM trade_date)::int AS year, SUM(realized_pnl) AS yearly_pnl 
        FROM transactions 
        WHERE (account_id = ${accId} OR account_id::text = ${String(accId)}) AND realized_pnl IS NOT NULL AND realized_pnl != 0
        GROUP BY year ORDER BY year ASC
      `;

  let snapshots: any[] = [];
  try {
    snapshots = await sql`SELECT record_date, total_value FROM asset_snapshots WHERE account_id = ${accId} ORDER BY record_date ASC`;
  } catch (e) {}

  const rawTransactions = currentAccount === 'all'
    ? await sql`SELECT id, symbol, symbol_name, action_type, trade_date, shares, price, total_amount FROM transactions ORDER BY trade_date DESC, id DESC`
    : await sql`SELECT id, symbol, symbol_name, action_type, trade_date, shares, price, total_amount FROM transactions WHERE account_id = ${accId} ORDER BY trade_date DESC, id DESC`;

  const formattedTransactions = rawTransactions.map((tx: any) => ({
    ...tx, 
    symbol: String(tx.symbol || ''),
    symbol_name: tx.symbol_name ? String(tx.symbol_name) : stockNameMap[String(tx.symbol)] || '',
    trade_date: new Date(tx.trade_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    shares: Number(tx.shares), 
    price: Number(tx.price), 
    total_amount: Number(tx.total_amount)
  }));

  const yearlyRealizedPnl = yearlyRealizedPnlRaw.map((row: any) => ({ year: Number(row.year), pnl: Number(row.yearly_pnl) }));
  const totalRealizedPnl = yearlyRealizedPnl.reduce((acc, curr) => acc + curr.pnl, 0);

  let sumCost = 0; let sumMarketValue = 0; let sumDividends = 0;
  const holdingsWithPrices = await Promise.all(
    holdings.map(async (stock: any) => {
      const symbol = String(stock.symbol || '');
      const symbolName = stock.symbol_name || stockNameMap[symbol] || '';
      const shares = Number(stock.total_shares || 0); 
      const cost = Number(stock.net_cost || 0);
      const avgPrice = shares > 0 ? (cost / shares) : 0;
      const currentPrice = await fetchCurrentPrice(symbol, avgPrice);
      const marketValue = shares * currentPrice; 
      
      const dividends = symbolDividendMap[symbol] || 0;
      
      sumCost += cost; sumMarketValue += marketValue; sumDividends += dividends;
      return { ...stock, symbol, symbolName, currentPrice, marketValue, cost, dividends };
    })
  );
  holdingsWithPrices.sort((a, b) => b.marketValue - a.marketValue);

  const sumPnlNoDividend = sumMarketValue - sumCost; 
  const sumPnlTotal = sumPnlNoDividend + sumDividends;  

  const pnlPercentNoDividend = sumCost > 0 ? ((sumPnlNoDividend / sumCost) * 100).toFixed(2) : '0.00';
  const pnlPercentTotal = sumCost > 0 ? ((sumPnlTotal / sumCost) * 100).toFixed(2) : '0.00';

  const pnlColorNoDiv = sumPnlNoDividend > 0 ? 'text-red-400' : sumPnlNoDividend < 0 ? 'text-green-400' : 'text-slate-300';
  const pnlColorTotal = sumPnlTotal > 0 ? 'text-red-400' : sumPnlTotal < 0 ? 'text-green-400' : 'text-slate-300';
  const realizedPnlColor = totalRealizedPnl > 0 ? 'text-red-400' : totalRealizedPnl < 0 ? 'text-green-400' : 'text-slate-300';

  return (
    <main className="p-8 flex flex-col gap-6 bg-slate-950 min-h-screen font-sans">
      <AccountTabs currentAccount={currentAccount} />

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          {currentAccount === 'all' ? (
            /* 🌐 合併總覽模式 */
            <div className="flex flex-col gap-4">
              <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 text-center flex flex-col items-center justify-center">
                <span className="text-4xl mb-2">🌐</span>
                <h3 className="text-lg font-bold text-slate-200 mb-1">所有帳號合併總覽</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  可在此處一次性【備份】或【還原】全部帳號的配息資料。
                </p>
              </div>

              <details className="group bg-slate-900 rounded-xl border border-slate-800 transition-all duration-200" open>
                <summary className="p-4 font-semibold text-slate-300 cursor-pointer flex justify-between items-center select-none text-sm hover:text-slate-100">
                  <span>📂 全帳號資料管理與備份</span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform text-xs">▼</span>
                </summary>
                <div className="p-4 pt-0 flex flex-col gap-4 border-t border-slate-800/50 mt-2">
                  {/* 🌟 提示全帳號對帳單涵蓋日期 */}
                  {minPnlDate && maxPnlDate && (
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 text-xs flex flex-col gap-1">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        📜 全帳號已匯入對帳單範圍
                      </span>
                      <span className="font-mono text-slate-200 font-bold">
                        {minPnlDate} ～ {maxPnlDate}
                      </span>
                    </div>
                  )}
                  <div className="pt-2">
                    <ClearDataButton accountId={accId} />
                  </div>
                </div>
              </details>
            </div>
          ) : (
            /* 📌 個別帳號模式 */
            <>
              <TransactionForm accountId={accId} />
              <details className="group bg-slate-900 rounded-xl border border-slate-800 transition-all duration-200" open>
                <summary className="p-4 font-semibold text-slate-300 cursor-pointer flex justify-between items-center select-none text-sm hover:text-slate-100">
                  <span>📂 批次匯入與資料管理</span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform text-xs">▼</span>
                </summary>
                <div className="p-4 pt-0 flex flex-col gap-4 border-t border-slate-800/50 mt-2">
                  
                  {/* 🌟 醒目提示：目前帳號已匯入的交易紀錄範圍 */}
                  <div className="pt-2">
                    {minPnlDate && maxPnlDate ? (
                      <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/50 text-xs flex flex-col gap-1.5 mb-2">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          📜 已匯入對帳單時間範圍
                        </span>
                        <span className="font-mono text-emerald-200 font-bold text-sm">
                          {minPnlDate} ～ {maxPnlDate}
                        </span>
                        <span className="text-[11px] text-slate-400 leading-normal">
                          💡 下次定期匯入請選取 <strong className="text-amber-300 font-mono">{maxPnlDate}</strong> 之後的日期。
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 text-xs text-slate-400 mb-2">
                        📜 目前尚無歷史對帳單紀錄
                      </div>
                    )}

                    <ImportExcel accountId={accId} />
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <ClearDataButton accountId={accId} />
                  </div>
                </div>
              </details>
            </>
          )}
        </div>

        <div className="w-full lg:w-2/3 flex flex-col">
          <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
              <div className="text-sm font-bold text-slate-400 mb-1">{currentAccount === 'all' ? '合併總市值' : '當前帳戶總市值'}</div>
              <div className="text-4xl font-black text-slate-100">${sumMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 w-full xl:w-auto text-right">
              <div>
                <div className="text-xs text-slate-400 mb-1">總投入成本</div>
                <div className="text-base font-bold text-slate-200">${sumCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">未實現損益 <span className="text-[10px] opacity-75">(不含息)</span></div>
                <div className={`text-base font-bold ${pnlColorNoDiv}`}>
                  {sumPnlNoDividend > 0 ? '+' : ''}${sumPnlNoDividend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <div className="text-xs font-normal opacity-80">{sumPnlNoDividend > 0 ? '+' : ''}{pnlPercentNoDividend}%</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-amber-400 font-bold mb-1">含息未實現總報酬</div>
                <div className={`text-base font-bold ${pnlColorTotal}`}>
                  {sumPnlTotal > 0 ? '+' : ''}${sumPnlTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <div className="text-xs font-normal opacity-80">{sumPnlTotal > 0 ? '+' : ''}{pnlPercentTotal}%</div>
                </div>
              </div>

              <div className="border-l border-slate-700/80 pl-4">
                <div className="text-xs text-emerald-400 font-bold mb-1">歷史已實現總損益</div>
                <div className={`text-base font-black ${realizedPnlColor}`}>
                  {totalRealizedPnl > 0 ? '+' : ''}${totalRealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>

          <DashboardCharts 
            dividendData={yearlyDividends} 
            realizedPnlData={yearlyRealizedPnl}
            snapshotData={snapshots} 
            holdingsData={holdingsWithPrices}
            dividendDetails={dividendDetails}
            currentTotalValue={sumMarketValue} 
            currentTotalCost={sumCost} 
            accountId={currentAccount}
          />

          <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 w-full mt-6">
            <h2 className="text-xl font-bold mb-6 text-slate-200">庫存清單明細</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-sm">
                    <th className="py-3 px-2 font-semibold">標的</th>
                    <th className="py-3 px-2 font-semibold text-right">庫存</th>
                    <th className="py-3 px-2 font-semibold text-right">平均成本</th>
                    <th className="py-3 px-2 font-semibold text-right">市價</th>
                    <th className="py-3 px-2 font-semibold text-right">市值</th>
                    <th className="py-3 px-2 font-semibold text-right">累積配息</th>
                    <th className="py-3 px-2 font-semibold text-right">未實現損益 <span className="text-xs font-normal text-slate-500">(不含息)</span></th>
                    <th className="py-3 px-2 font-semibold text-right">含息總報酬</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {holdingsWithPrices.map((stock: any, idx: number) => (
                    <StockRow 
                      key={idx} 
                      stock={stock} 
                      transactions={formattedTransactions.filter((tx: any) => tx.symbol === stock.symbol)} 
                      stockName={stock.symbolName || stock.symbol_name || stockNameMap[stock.symbol]} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}