'use client';

import { useState } from 'react';
import DeleteButton from './DeleteButton';
import { deleteTransaction } from '../actions';

export default function StockRow({ stock, transactions, stockName }: { stock: any, transactions: any[], stockName: string }) {
  // 控制是否展開明細的狀態
  const [isOpen, setIsOpen] = useState(false);

  const shares = Number(stock.total_shares);
  const cost = Number(stock.net_cost);
  const dividends = Number(stock.total_dividends);
  const currentPrice = stock.currentPrice;
  
  const avgPrice = shares > 0 ? (cost / shares).toFixed(2) : '0.00';
  const marketValue = shares * currentPrice;
  const pnl = marketValue - cost + dividends;
  const pnlPercent = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : '0.00';
  
  // 深色模式專用的紅綠漲跌色
  const pnlColorClass = pnl > 0 ? 'text-red-400' : pnl < 0 ? 'text-green-400' : 'text-slate-300';
  const sign = pnl > 0 ? '+' : '';

  const actionNameMap: Record<string, string> = {
    'BUY': '買進',
    'SELL': '賣出',
    'CASH_DIVIDEND': '現金股利',
    'STOCK_DIVIDEND': '股票股利',
  };

  return (
    <>
      {/* 主列：顯示庫存總計 (深色模式樣式) */}
      <tr 
        onClick={() => setIsOpen(!isOpen)} 
        className="border-b border-slate-700 hover:bg-slate-800 transition text-sm cursor-pointer"
        title="點擊展開/收合交易明細"
      >
        <td className="py-4 px-2 font-bold flex items-center">
          <span className="mr-2 text-slate-500 text-xs">{isOpen ? '▼' : '▶'}</span>
          <span className="text-slate-200">{stock.symbol}</span>
          {stockName && (
            <span className="ml-2 text-xs font-semibold text-blue-200 bg-blue-900/50 border border-blue-700/50 px-2 py-1 rounded-md shadow-sm">
              {stockName}
            </span>
          )}
        </td>
        <td className="py-4 px-2 text-right text-slate-200">{shares.toLocaleString()}</td>
        <td className="py-4 px-2 text-right text-slate-400">${avgPrice}</td>
        <td className="py-4 px-2 text-right font-medium text-blue-400">${currentPrice.toFixed(2)}</td>
        <td className="py-4 px-2 text-right text-slate-200">${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
        <td className="py-4 px-2 text-right text-slate-400">${dividends.toLocaleString()}</td>
        <td className={`py-4 px-2 text-right font-bold ${pnlColorClass}`}>
          {sign}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} <br/>
          <span className="text-xs">({sign}{pnlPercent}%)</span>
        </td>
      </tr>

      {/* 展開的明細列 (深色模式樣式) */}
      {isOpen && (
        <tr className="bg-slate-900/50 border-b-2 border-slate-700">
          <td colSpan={7} className="p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-inner">
              <h4 className="text-sm font-bold text-slate-300 mb-3">【{stock.symbol}】 歷史交易明細</h4>
              {transactions.length === 0 ? (
                <p className="text-sm text-slate-500">尚無明細</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-600 text-slate-400">
                      <th className="py-2 px-2">日期</th>
                      <th className="py-2 px-2">動作</th>
                      <th className="py-2 px-2 text-right">數量</th>
                      <th className="py-2 px-2 text-right">單價</th>
                      <th className="py-2 px-2 text-right">總金額</th>
                      <th className="py-2 px-2 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="py-2 px-2 text-slate-400">{tx.trade_date}</td>
                        <td className="py-2 px-2 text-slate-400">{actionNameMap[tx.action_type] || tx.action_type}</td>
                        <td className="py-2 px-2 text-right text-slate-300">{tx.shares.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-slate-400">${tx.price.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-slate-300">${tx.total_amount.toLocaleString()}</td>
                        <td className="py-2 px-2 text-center">
                          {/* 刪除按鈕 */}
                          <form action={deleteTransaction}>
                            <input type="hidden" name="id" value={tx.id} />
                            <DeleteButton symbol={tx.symbol} />
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}