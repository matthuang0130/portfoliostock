import { neon } from '@neondatabase/serverless';
import TransactionForm from './components/TransactionForm';
import ImportExcel from './components/ImportExcel';
import ClearDataButton from './components/ClearDataButton';
import DashboardCharts from './components/DashboardCharts';
import AccountTabs from './components/AccountTabs';
import StockRow from './components/StockRow'; 
import { fetchCurrentPrice, getStockNames } from './lib/stockApi'; 

export const dynamic = 'force-dynamic';

export default async function Home(props: { searchParams: Promise<any> }) {
  const params = await props.searchParams;
  const currentAccount = params?.account || '1';
  const accId = currentAccount === 'all' ? 0 : Number(currentAccount);

  const sql = neon(process.env.DATABASE_URL!);
  const stockNameMap = await getStockNames();

  const holdings: any[] = currentAccount === 'all'
    ? await sql`
        SELECT symbol,
          SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END) AS total_shares,
          SUM(CASE WHEN action_type = 'BUY' THEN total_amount ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN total_amount ELSE 0 END) AS net_cost,
          SUM(CASE WHEN action_type = 'CASH_DIVIDEND' THEN total_amount ELSE 0 END) AS total_dividends
        FROM transactions GROUP BY symbol
        HAVING (SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END)) > 0
      `
    : await sql`
        SELECT symbol,
          SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END) AS total_shares,
          SUM(CASE WHEN action_type = 'BUY' THEN total_amount ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN total_amount ELSE 0 END) AS net_cost,
          SUM(CASE WHEN action_type = 'CASH_DIVIDEND' THEN total_amount ELSE 0 END) AS total_dividends
        FROM transactions WHERE account_id = ${accId} GROUP BY symbol
        HAVING (SUM(CASE WHEN action_type IN ('BUY', 'STOCK_DIVIDEND') THEN shares ELSE 0 END) - SUM(CASE WHEN action_type = 'SELL' THEN shares ELSE 0 END)) > 0
      `;

  const yearlyStatsRaw = currentAccount === 'all'
    ? await sql`SELECT EXTRACT(YEAR FROM trade_date)::int AS year, SUM(CASE WHEN action_type = 'CASH_DIVIDEND' THEN total_amount ELSE 0 END) AS yearly_dividend FROM transactions WHERE action_type = 'CASH_DIVIDEND' GROUP BY year ORDER BY year DESC`
    : await sql`SELECT EXTRACT(YEAR FROM trade_date)::int AS year, SUM(CASE WHEN action_type = 'CASH_DIVIDEND' THEN total_amount ELSE 0 END) AS yearly_dividend FROM transactions WHERE account_id = ${accId} AND action_type = 'CASH_DIVIDEND' GROUP BY year ORDER BY year DESC`;

  let snapshots: any[] = [];
  try {
    snapshots = await sql`SELECT record_date, total_value FROM asset_snapshots WHERE account_id = ${accId} ORDER BY record_date ASC`;
  } catch (e) {}

  const rawTransactions = currentAccount === 'all'
    ? await sql`SELECT id, symbol, action_type, trade_date, shares, price, total_amount FROM transactions ORDER BY trade_date DESC, id DESC`
    : await sql`SELECT id, symbol, action_type, trade_date, shares, price, total_amount FROM transactions WHERE account_id = ${accId} ORDER BY trade_date DESC, id DESC`;

  const formattedTransactions = rawTransactions.map((tx: any) => ({
    ...tx, 
    symbol: String(tx.symbol || ''),
    trade_date: new Date(tx.trade_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    shares: Number(tx.shares), 
    price: Number(tx.price), 
    total_amount: Number(tx.total_amount)
  }));

  const yearlyDividends = yearlyStatsRaw.map((row: any) => ({ year: Number(row.year), dividend: Number(row.yearly_dividend) }));

  let sumCost = 0; let sumMarketValue = 0;
  const holdingsWithPrices = await Promise.all(
    holdings.map(async (stock: any) => {
      const symbol = String(stock.symbol || '');
      const shares = Number(stock.total_shares || 0); 
      const cost = Number(stock.net_cost || 0);
      const avgPrice = shares > 0 ? (cost / shares) : 0;
      const currentPrice = await fetchCurrentPrice(symbol, avgPrice);
      const marketValue = shares * currentPrice; 
      const dividends = Number(stock.total_dividends || 0);
      sumCost += cost; sumMarketValue += marketValue;
      return { ...stock, symbol, currentPrice, marketValue, cost, dividends };
    })
  );
  holdingsWithPrices.sort((a, b) => b.marketValue - a.marketValue);

  const sumPnl = sumMarketValue - sumCost;
  const pnlPercent = sumCost > 0 ? ((sumPnl / sumCost) * 100).toFixed(2) : '0.00';
  const pnlColor = sumPnl > 0 ? 'text-red-400' : sumPnl < 0 ? 'text-green-400' : 'text-slate-300';
  const pnlSign = sumPnl > 0 ? '+' : '';

  return (
    <main className="p-8 flex flex-col gap-6 bg-slate-950 min-h-screen font-sans">
      
      <AccountTabs currentAccount={currentAccount} />

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        
        {/* 左側操作區塊 */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          {currentAccount === 'all' ? (
            <div className="bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-800 text-center flex flex-col items-center justify-center h-full">
              <span className="text-5xl mb-4">🌐</span>
              <h3 className="text-xl font-bold text-slate-200 mb-2">總覽模式</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                此模式僅供檢視所有帳戶的合併資產。<br/><br/>
                若要新增交易或匯入 Excel，請點擊上方頁籤切換至特定帳戶。
              </p>
            </div>
          ) : (
            <>
              {/* 主要表單：手動新增 */}
              <TransactionForm accountId={accId} />

              {/* 🌟 摺疊工具區塊：匯入與清空 */}
              <details className="group bg-slate-900 rounded-xl border border-slate-800 transition-all duration-200">
                <summary className="p-4 font-semibold text-slate-300 cursor-pointer flex justify-between items-center select-none text-sm hover:text-slate-100">
                  <span>📂 批次匯入與資料管理</span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform text-xs">▼</span>
                </summary>
                <div className="p-4 pt-0 flex flex-col gap-4 border-t border-slate-800/50 mt-2">
                  <div className="pt-2">
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

        {/* 右側資訊區塊 */}
        <div className="w-full lg:w-2/3 flex flex-col">
          <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="text-sm font-bold text-slate-400 mb-1">{currentAccount === 'all' ? '合併總市值' : '當前帳戶總市值'}</div>
              <div className="text-4xl font-black text-slate-100">${sumMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="flex gap-8 text-right bg-slate-800 p-4 rounded-lg border border-slate-700 w-full md:w-auto">
              <div>
                <div className="text-xs text-slate-400 mb-1">總投入成本</div>
                <div className="text-lg font-bold text-slate-200">${sumCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">未實現損益</div>
                <div className={`text-xl font-bold ${pnlColor}`}>
                  {pnlSign}${sumPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} 
                  <span className="text-sm ml-1 opacity-80">({pnlSign}{pnlPercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          <DashboardCharts 
            dividendData={yearlyDividends} 
            snapshotData={snapshots} 
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
                    <th className="py-3 px-2 font-semibold text-right">配息</th>
                    <th className="py-3 px-2 font-semibold text-right">未實現損益</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {holdingsWithPrices.map((stock: any, idx: number) => (
                    <StockRow 
                      key={idx} stock={stock} 
                      transactions={formattedTransactions.filter((tx: any) => tx.symbol === stock.symbol)} 
                      stockName={stockNameMap[stock.symbol]} 
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