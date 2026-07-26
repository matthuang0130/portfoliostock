'use client';

import { useState } from 'react';
import { deleteTransaction } from '../actions';

interface StockRowProps {
  stock: {
    symbol: string;
    symbol_name?: string;
    total_shares: number;
    cost: number;
    currentPrice: number;
    marketValue: number;
    dividends: number;
  };
  transactions: any[];
  stockName?: string;
}

export default function StockRow({ stock, transactions = [], stockName }: StockRowProps) {
  const [expanded, setExpanded] = useState(false);

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

  // 🌟 精準過濾與合併：只處理有買進或有配息的紀錄，徹底消滅空的「-」列
  const combinedRows = (() => {
    const rowMap: { [key: string]: any } = {};

    transactions.forEach((tx) => {
      const isBuy = tx.action_type === 'BUY' || tx.action_type === 'STOCK_DIVIDEND';
      const isDividend = tx.action_type === 'CASH_DIVIDEND';

      // 只有當是「買進」或「現金配息」時才進行處理
      if (!isBuy && !isDividend) return;

      const date = tx.trade_date;

      if (!rowMap[date]) {
        rowMap[date] = {
          id: tx.id,
          ids: [tx.id],
          date: date,
          shares: 0,
          price: 0,
          buyAmount: 0,
          dividendAmount: 0,
          hasBuy: false,
        };
      } else {
        rowMap[date].ids.push(tx.id);
      }

      if (isBuy) {
        rowMap[date].shares += Number(tx.shares || 0);
        rowMap[date].price = Number(tx.price || 0);
        rowMap[date].buyAmount += Number(tx.total_amount || 0);
        rowMap[date].hasBuy = true;
      } else if (isDividend) {
        rowMap[date].dividendAmount += Number(tx.total_amount || 0);
      }
    });

    // 徹底排除完全沒有買進金額也沒有配息金額的空白列
    return Object.values(rowMap)
      .filter((row: any) => row.buyAmount > 0 || row.dividendAmount > 0)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })();

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
        <td className="py-3 px-2 text-right font-medium">{shares.toLocaleString()} 股</td>

        {/* 平均成本 */}
        <td className="py-3 px-2 text-right">${avgCost.toFixed(2)}</td>

        {/* 當前市價 */}
        <td className="py-3 px-2 text-right">${price.toFixed(2)}</td>

        {/* 總市值 */}
        <td className="py-3 px-2 text-right font-semibold">${Math.round(marketValue).toLocaleString()}</td>

        {/* 累積配息 */}
        <td className="py-3 px-2 text-right text-amber-400 font-bold">
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

      {/* 🌟 點開後：絕無空白列！清晰顯示買進與同日配息 */}
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-slate-950 p-4 border-b border-slate-800">
            <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 shadow-inner">
              
              {/* 頂部大字表頭 */}
              <div className="grid grid-cols-12 text-sm font-extrabold text-slate-300 pb-3 border-b-2 border-slate-700 px-3 items-center">
                <div className="col-span-3 text-left">📅 交易日期</div>
                <div className="col-span-2 text-center">買進股數</div>
                <div className="col-span-2 text-center">成交單價</div>
                <div className="col-span-2 text-right text-sky-400">買進總價</div>
                <div className="col-span-2 text-right text-amber-400">現金股利</div>
                <div className="col-span-1 text-center">操作</div>
              </div>

              {/* 明細列表 */}
              {combinedRows.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center">無買進或配息紀錄</div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-800/60 max-h-[280px] overflow-y-auto">
                  {combinedRows.map((row: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="grid grid-cols-12 text-sm py-3 px-3 items-center text-slate-200 hover:bg-slate-800/50 transition font-mono"
                    >
                      {/* 1. 交易日期 */}
                      <div className="col-span-3 text-left font-bold text-slate-300">
                        {row.date}
                      </div>

                      {/* 2. 股數 */}
                      <div className="col-span-2 text-center font-semibold">
                        {row.hasBuy ? `${row.shares.toLocaleString()} 股` : '-'}
                      </div>

                      {/* 3. 成交單價 */}
                      <div className="col-span-2 text-center text-slate-400">
                        {row.hasBuy ? `$${row.price.toFixed(2)}` : '-'}
                      </div>

                      {/* 4. 買進總價 */}
                      <div className="col-span-2 text-right font-bold text-sky-300 text-base">
                        {row.buyAmount > 0 ? `$${row.buyAmount.toLocaleString()}` : '-'}
                      </div>

                      {/* 5. 現金股利 */}
                      <div className="col-span-2 text-right font-bold text-amber-400 text-base">
                        {row.dividendAmount > 0 ? `+$${row.dividendAmount.toLocaleString()}` : '-'}
                      </div>

                      {/* 6. 刪除按鈕 */}
                      <div className="col-span-1 text-center font-sans">
                        <form 
                          action={async () => {
                            for (const id of row.ids) {
                              const formData = new FormData();
                              formData.append('id', String(id));
                              await deleteTransaction(formData);
                            }
                          }} 
                          className="inline-block"
                        >
                          <button 
                            type="submit" 
                            className="text-xs text-red-400 hover:text-white hover:bg-red-600 bg-red-950/60 px-2.5 py-1 rounded border border-red-800/60 transition"
                          >
                            刪除
                          </button>
                        </form>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  );
}