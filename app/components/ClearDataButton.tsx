'use client';

import { useState } from 'react';
import { clearAllTransactions } from '../actions';

export default function ClearDataButton({ accountId }: { accountId: number }) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    const confirmClear = window.confirm('⚠️ 警告：確定要清空此帳號的所有交易紀錄嗎？\n\n此動作無法復原！建議您確定手邊有最新的 Excel 備份後再執行。');
    
    if (confirmClear) {
      setIsClearing(true);
      // 🌟 告訴後端只要清空目前的帳號就好
      await clearAllTransactions(accountId);
      setIsClearing(false);
      alert('該帳號的資料已成功清空！');
    }
  };

  return (
    <div className="p-5 border border-red-900/50 rounded-xl bg-red-950/20 flex flex-col items-center justify-center">
      <h3 className="text-sm font-bold text-red-400 mb-3">危險操作區</h3>
      <button 
        onClick={handleClear}
        disabled={isClearing}
        className="bg-red-900 hover:bg-red-800 text-red-100 font-semibold py-2 px-4 rounded transition shadow-sm border border-red-800 w-full"
      >
        {isClearing ? '處理中...' : '🗑️ 一鍵清空目前帳號'}
      </button>
      <p className="text-xs text-red-500/70 mt-3 text-center">
        如資料混亂，可先清空再重新匯入。
      </p>
    </div>
  );
}