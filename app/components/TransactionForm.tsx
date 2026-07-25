'use client';

import { addTransaction } from '../actions';
import SubmitButton from './SubmitButton';

export default function TransactionForm({ accountId }: { accountId: number }) {
  return (
    <form action={addTransaction} className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 flex flex-col gap-4">
      {/* 🌟 隱藏欄位：用來告訴後端這是新增到哪一個帳號 */}
      <input type="hidden" name="account_id" value={accountId} />
      
      <h2 className="text-lg font-bold text-slate-200 mb-2">新增交易紀錄</h2>
      
      <div>
        <label className="block text-sm font-semibold mb-1 text-slate-400">股票代號</label>
        <input 
          name="symbol" 
          placeholder="例如: 2330" 
          required 
          className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 transition" 
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1 text-slate-400">動作</label>
        <select 
          name="action_type" 
          className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 transition"
        >
          <option value="BUY">買進</option>
          <option value="SELL">賣出</option>
          <option value="CASH_DIVIDEND">現金股利</option>
          <option value="STOCK_DIVIDEND">股票股利</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1 text-slate-400">日期</label>
        <input 
          type="date" 
          name="trade_date" 
          defaultValue={new Date().toISOString().split('T')[0]} 
          required 
          className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 transition [color-scheme:dark]" 
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1 text-slate-400">股數</label>
        <input 
          type="number" 
          name="shares" 
          placeholder="若為配息請填 0" 
          required 
          className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 transition" 
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1 text-slate-400">單價 / 股利總額</label>
        <input 
          type="number" 
          step="0.01" 
          name="price" 
          placeholder="單價 (配息請填總額)" 
          required 
          className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 transition" 
        />
      </div>

      <div className="mt-2">
        <SubmitButton />
      </div>
    </form>
  );
}