'use client';

import { useState, useRef } from 'react';
import { 
  clearAccountData, 
  clearInventoryData, 
  clearHistoryPnlData, 
  exportDividends, 
  restoreDividends 
} from '../actions';

export default function ClearDataButton({ accountId }: { accountId: number }) {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 僅清除庫存
  const handleClearInventory = async () => {
    if (window.confirm('⚠️ 確定要【僅清空庫存資料】嗎？\n\n這不會影響你的歷史對帳單損益與配息紀錄。')) {
      setLoadingType('inventory');
      await clearInventoryData(accountId);
      setLoadingType(null);
      alert('庫存資料已清空，現在可以上傳最新的庫存 Excel 了！');
    }
  };

  // 2. 僅清除歷史對帳單
  const handleClearHistoryPnl = async () => {
    if (window.confirm('⚠️ 確定要【僅清空歷史對帳單損益】嗎？\n\n這不會影響你的當前庫存與配息紀錄。')) {
      setLoadingType('pnl');
      await clearHistoryPnlData(accountId);
      setLoadingType(null);
      alert('歷史對帳單紀錄已清空！');
    }
  };

  // 3. 全清
  const handleClearAll = async () => {
    if (window.confirm('⚠️ 警告：確定要【完全清空】此帳號的所有資料嗎？（含庫存、對帳單、配息）')) {
      setLoadingType('all');
      await clearAccountData(accountId);
      setLoadingType(null);
      alert('所有資料已完全重置！');
    }
  };

  // 4. 匯出配息 JSON
  const handleExportDividends = async () => {
    setIsExporting(true);
    try {
      const res = await exportDividends(accountId);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          alert('目前沒有有效的配息紀錄可供備份！');
          return;
        }
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const accName = accountId === 0 ? 'ALL' : `acc${accountId}`;
        const fileName = `dividend_backup_${accName}_${today}.json`;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        alert(`成功匯出 ${res.data.length} 筆配息紀錄！\n檔名：${fileName}`);
      } else {
        alert(`匯出失敗：${res.error}`);
      }
    } catch (err: any) {
      alert(`匯出發生錯誤：${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 5. 還原配息 JSON
  const handleRestoreDividends = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const dividends = JSON.parse(text);

      if (!Array.isArray(dividends)) {
        throw new Error('無效的備份檔案格式！');
      }

      const res = await restoreDividends(dividends);
      if (res.success) {
        alert(`成功還原 ${dividends.length} 筆配息紀錄！`);
        window.location.reload();
      } else {
        alert(`還原失敗：${res.error}`);
      }
    } catch (err: any) {
      alert(`讀取或還原備份失敗：${err.message}`);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 🎁 配息安全備份與還原區 */}
      <div className="p-4 border border-amber-900/50 rounded-xl bg-amber-950/20 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1">
          <span>🎁 配息資料獨立備份</span>
        </h3>
        <p className="text-[11px] text-amber-500/80 leading-relaxed">
          可獨立將「手動配息」匯出備份，日後重置資料時可隨時一鍵還原。
        </p>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={handleExportDividends}
            disabled={isExporting}
            className="bg-amber-900/80 hover:bg-amber-800 text-amber-100 text-xs font-bold py-1.5 px-3 rounded border border-amber-700/80 transition disabled:opacity-50"
          >
            {isExporting ? '匯出中...' : '📥 備份配息 JSON'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold py-1.5 px-3 rounded border border-slate-700 transition disabled:opacity-50"
          >
            {isRestoring ? '還原中...' : '📤 還原配息 JSON'}
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestoreDividends}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* ⚠️ 分類清除區 */}
      <div className="p-4 border border-red-900/50 rounded-xl bg-red-950/20 flex flex-col gap-2">
        <h3 className="text-xs font-bold text-red-400 mb-1">⚠️ 選擇性資料清除</h3>
        
        <button 
          onClick={handleClearInventory}
          disabled={loadingType !== null}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-1.5 px-3 rounded transition border border-slate-700 w-full text-xs text-left flex justify-between items-center"
        >
          <span>📊 僅清空當前庫存 (INVENTORY)</span>
          <span className="text-[10px] text-slate-400">{loadingType === 'inventory' ? '清除中...' : '執行'}</span>
        </button>

        <button 
          onClick={handleClearHistoryPnl}
          disabled={loadingType !== null}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-1.5 px-3 rounded transition border border-slate-700 w-full text-xs text-left flex justify-between items-center"
        >
          <span>📜 僅清空歷史對帳單 (HISTORY_PNL)</span>
          <span className="text-[10px] text-slate-400">{loadingType === 'pnl' ? '清除中...' : '執行'}</span>
        </button>

        <div className="border-t border-red-900/40 my-1"></div>

        <button 
          onClick={handleClearAll}
          disabled={loadingType !== null}
          className="bg-red-900/80 hover:bg-red-800 text-red-100 font-bold py-1.5 px-3 rounded transition border border-red-700 w-full text-xs text-left flex justify-between items-center"
        >
          <span>🗑️ 完全清空此帳號所有資料</span>
          <span className="text-[10px] text-red-200">{loadingType === 'all' ? '清除中...' : '全清'}</span>
        </button>
      </div>
    </div>
  );
}