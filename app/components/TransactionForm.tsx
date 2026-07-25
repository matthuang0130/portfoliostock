'use client';

import { useState } from 'react';
import { addTransaction } from '../actions';

export default function TransactionForm({ accountId }: { accountId: number }) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'BUY' | 'SELL' | 'CASH_DIVIDEND'>('BUY');
  const [symbol, setSymbol] = useState('');
  const [symbolName, setSymbolName] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [dividendAmount, setDividendAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('account_id', String(accountId));
      formData.append('symbol', symbol.trim().toUpperCase());
      formData.append('symbol_name', symbolName.trim());
      formData.append('action_type', actionType);
      formData.append('trade_date', tradeDate);

      if (actionType === 'CASH_DIVIDEND') {
        formData.append('shares', '0');
        formData.append('price', '0');
        formData.append('total_amount', dividendAmount);
      } else {
        const s = Number(shares);
        const p = Number(price);
        formData.append('shares', String(s));
        formData.append('price', String(p));
        formData.append('total_amount', String(s * p));
      }

      const res = await addTransaction(formData);
      if (res.success) {
        alert('交易紀錄新增成功！');
        // 重置表單
        setSymbol('');
        setSymbolName('');
        setShares('');
        setPrice('');
        setDividendAmount('');
      } else {
        alert(`新增失敗：${res.error}`);
      }
    } catch (err: any) {
      alert(`發生錯誤：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
        <span>➕ 手動新增交易 / 配息</span>
      </h3>

      {/* 動作類型選擇 */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActionType('BUY')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border ${
            actionType === 'BUY'
              ? 'bg-sky-600 text-white border-sky-500'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          買進
        </button>
        <button
          type="button"
          onClick={() => setActionType('SELL')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border ${
            actionType === 'SELL'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          賣出
        </button>
        <button
          type="button"
          onClick={() => setActionType('CASH_DIVIDEND')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border ${
            actionType === 'CASH_DIVIDEND'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          🎁 現金配息
        </button>
      </div>

      {/* 標的與股名 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">股票代號 *</label>
          <input
            type="text"
            required
            placeholder="例如：2330"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">股票名稱 (選填)</label>
          <input
            type="text"
            placeholder="例如：台積電"
            value={symbolName}
            onChange={(e) => setSymbolName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* 交易日期 */}
      <div>
        <label className="text-[11px] font-semibold text-slate-400 block mb-1">交易 / 配息日期 *</label>
        <input
          type="date"
          required
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* 動態切換：買賣顯示股數/單價，配息顯示總金額 */}
      {actionType === 'CASH_DIVIDEND' ? (
        <div>
          <label className="text-[11px] font-bold text-amber-400 block mb-1">現金配息總金額 ($) *</label>
          <input
            type="number"
            required
            step="any"
            placeholder="請輸入發放的配息總金額"
            value={dividendAmount}
            onChange={(e) => setDividendAmount(e.target.value)}
            className="w-full bg-slate-950 border border-amber-800/80 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">股數 *</label>
            <input
              type="number"
              required
              placeholder="例如：1000"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">成交單價 ($) *</label>
            <input
              type="number"
              required
              step="any"
              placeholder="例如：1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-lg text-xs transition disabled:opacity-50"
      >
        {loading ? '處理中...' : actionType === 'CASH_DIVIDEND' ? '➕ 確認新增現金配息' : '➕ 確認新增交易紀錄'}
      </button>
    </form>
  );
}