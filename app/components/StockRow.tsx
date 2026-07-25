'use client';

import { useState } from 'react';
import { deleteTransaction } from '../actions';

interface StockRowProps {
  stock: {
    symbol: string;
    symbol_name?: string; // 🌟 資料庫存進來的商品名稱
    total_shares: number;
    cost: number;
    currentPrice: number;
    marketValue: number;
    dividends: number;
  };
  transactions: any[];
  stockName?: string; // 🌟 外部備用傳入的名稱
}

export default function StockRow({ stock, transactions, stockName }: StockRowProps) {
  const [expanded, setExpanded] = useState(false);

  // 🌟 強制優先讀取 Excel 存進資料庫的名稱，若無則降級讀取備用名稱
  const displayName = stock.symbol_name || stockName || '';

  const shares = Number(stock.total_shares || 0);
  const cost = Number(stock.cost || 0);
  const avgCost = shares > 0 ? cost / shares : 0;
  const price = Number(stock.currentPrice || 0);
  const marketValue = Number(stock.marketValue || shares * price);
  const dividends = Number(stock.dividends || 0);

  // 未實現損益 (不含息)
  const pnlNoDiv = marketValue - cost;
  // 未實現總報酬 (含息)
  const pnlTotal = pnlNoDiv + dividends;

  const pnlNoDivColor = pnlNoDiv > 0 ? 'text-red-400' : pnlNoDiv < 0 ? 'text-green-400' : 'text-slate-300';
  const pnlTotalColor = pnlTotal > 0 ? 'text-red-400' : pnlTotal < 0 ? 'text-green-400' : 'text-slate-300';

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-slate-800/50 cursor-pointer transition text-sm text-slate-200 border-b border-slate-800/60"
      >
        {/* 代號與股票名稱 */}
        <td className="py-3 px-2 font-bold">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
            <span className="text-slate-100 font-extrabold">{stock.symbol}</span>
            {displayName && (
              <span className="text-xs text-sky-400 font-semibold bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/50">
                {displayName}
              </span>
            )}
          </div>
        </td>

        {/* 庫存股數 */}
        <td className="py-3 px-2 text-right">{shares.toLocaleString()}</td>

        {/* 平均成本 */}
        <td className="py-3 px-2 text-right">${avgCost.toFixed(2)}</td>

        {/* 當前市價 */}
        <td className="py-3 px-2 text-right">${price.toFixed(2)}</td>

        {/* 總市值 */}
        <td className="py-3 px-2 text-right font-semibold">${Math.round(marketValue).toLocaleString()}</td>

        {/* 累積配息 */}
        <td className="py-3 px-2 text-right text-amber-400 font-medium">
          {dividends > 0 ? `$${Math.round(dividends).toLocaleString()}` : '-'}
        </td>

        {/* 未實現損益 (不含息) */}
        <td className={`py-3 px-2 text-right font-bold ${pnlNoDivColor}`}>
          {pnlNoDiv > 0 ? '+' : ''}${Math.round(pnlNoDiv).toLocaleString()}
        </td>

        {/* 含息總報酬 */}
        <td className={`py-3 px-2 text-right font-bold ${pnlTotalColor}`}>
          {pnlTotal > 0 ? '+' : ''}${Math.round(pnlTotal).toLocaleString()}
        </td>
      </tr>

      {/* 展開明細交易紀錄 */}
      {expanded && transactions && transactions.length > 0 && (
        <tr>
          <td colSpan={8} className="bg-slate-950/80 p-4 border-b border-slate-800">
            <div className="text-xs font-bold text-slate-400 mb-2">📜 歷史交易明細 ({stock.symbol} - {displayName})：</div>
            <div className="flex flex-col gap-1 text-xs">
              {transactions.map((tx: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-slate-300 py-1.5 border-b border-slate-900">
                  <span>{tx.trade_date}</span>
                  <span className={`font-bold ${tx.action_type === 'BUY' ? 'text-sky-400' : tx.action_type === 'SELL' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {tx.action_type === 'BUY' ? '買進' : tx.action_type === 'SELL' ? '賣出' : '現金配息'}
                  </span>
                  <span>{tx.shares > 0 ? `${tx.shares} 股` : '-'}</span>
                  <span>{tx.price > 0 ? `@ $${tx.price}` : '-'}</span>
                  <span className="font-semibold">${Number(tx.total_amount).toLocaleString()}</span>
                  
                  {/* 單筆刪除按鈕 (🌟 將 action 包裝成 Promise<void> 避免 TypeScript Build Error) */}
                  <form action={async (formData) => { await deleteTransaction(formData); }} className="inline-block">
                    <input type="hidden" name="id" value={tx.id} />
                    <button type="submit" className="text-[10px] text-red-400 hover:text-red-300 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40 ml-2">
                      刪除
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}