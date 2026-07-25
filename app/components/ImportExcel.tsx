'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { importTransactions } from '../actions';

function parseExcelDate(excelDate: any): string {
  if (!excelDate) return new Date().toISOString().split('T')[0];
  if (typeof excelDate === 'number' || !isNaN(Number(excelDate))) {
    const num = Number(excelDate);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  let str = String(excelDate).trim().replace(/\//g, '-');
  if (str.includes('T')) str = str.split('T')[0];
  return str;
}

export default function ImportExcel({ accountId }: { accountId: number }) {
  const [loading, setLoading] = useState(false);
  const [importMode, setImportMode] = useState<'INVENTORY' | 'HISTORY_PNL'>('INVENTORY');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: false });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      const parsedTransactions: any[] = [];

      jsonData.forEach((row) => {
        const rowStr = JSON.stringify(row);
        if (rowStr.includes('小計') || rowStr.includes('合計') || rowStr.includes('總計')) return;

        // 1. 代號與商品名稱 (對應 C 欄與 D 欄)
        const symbolRaw = String(row['代號'] || row['股票代號'] || row['symbol'] || '').trim();
        if (!symbolRaw) return;

        const symbolNameRaw = String(row['商品名稱'] || row['股票名稱'] || row['名稱'] || '').trim();

        // 2. 日期
        const tradeDateRaw = row['成交日期'] || row['日期'] || row['trade_date'];
        if (!tradeDateRaw || String(tradeDateRaw).includes('小計')) return;
        const formattedDate = parseExcelDate(tradeDateRaw);

        // 3. 股數與單價
        const sharesRaw = Number(row['成交數量'] || row['數量'] || row['股數'] || row['shares'] || 0);
        let priceRaw = Number(row['成交價'] || row['成交單價'] || row['單價'] || row['price'] || 0);
        const costRaw = Number(row['持有成本'] || 0);

        if (priceRaw === 0 && costRaw > 0 && sharesRaw > 0) {
          priceRaw = costRaw / sharesRaw;
        }

        const typeRaw = String(row['種類'] || row['動作'] || row['買賣別'] || row['交易類別'] || row['action_type'] || '').trim();

        if (importMode === 'INVENTORY') {
          // ---------------- 📊 模式 A：純匯入庫存 ----------------
          if (sharesRaw > 0) {
            parsedTransactions.push({
              account_id: accountId,
              symbol: symbolRaw,
              symbol_name: symbolNameRaw, // 🌟 抓取 Excel 名稱
              action_type: 'BUY',
              trade_date: formattedDate,
              shares: sharesRaw,
              price: priceRaw,
              total_amount: sharesRaw * priceRaw,
              realized_pnl: null,
              record_source: 'INVENTORY'
            });
          }

          const divVal = row['配息總額'] || row['累積配息'] || row['配息'] || row['現金股利'];
          const dividendAmountRaw = (divVal !== '' && divVal !== '-' && !isNaN(Number(divVal))) ? Number(divVal) : 0;

          if (dividendAmountRaw > 0) {
            parsedTransactions.push({
              account_id: accountId,
              symbol: symbolRaw,
              symbol_name: symbolNameRaw,
              action_type: 'CASH_DIVIDEND',
              trade_date: formattedDate,
              shares: 0,
              price: 0,
              total_amount: dividendAmountRaw,
              realized_pnl: null,
              record_source: 'INVENTORY'
            });
          }
        } else {
          // ---------------- 📜 模式 B：純匯入券商對帳單 (歷史損益) ----------------
          let actionType = 'BUY';
          if (
            typeRaw.includes('賣') || 
            typeRaw.includes('沖') || 
            typeRaw.includes('出') || 
            typeRaw.toUpperCase().includes('SELL')
          ) {
            actionType = 'SELL';
          } else if (typeRaw.includes('息') || typeRaw.includes('配') || typeRaw.toUpperCase().includes('DIVIDEND')) {
            actionType = 'CASH_DIVIDEND';
          }

          const pnlRaw = row['損益'] || row['已實現損益'] || row['客戶淨收付/損益'] || row['realized_pnl'];
          const realizedPnl = (pnlRaw !== '' && pnlRaw !== '-' && pnlRaw !== undefined && !isNaN(Number(pnlRaw))) 
            ? Number(pnlRaw) 
            : null;

          const totalAmountRaw = Number(row['成交金額'] || row['價金'] || (sharesRaw * priceRaw));

          parsedTransactions.push({
            account_id: accountId,
            symbol: symbolRaw,
            symbol_name: symbolNameRaw,
            action_type: actionType,
            trade_date: formattedDate,
            shares: sharesRaw,
            price: priceRaw,
            total_amount: totalAmountRaw,
            realized_pnl: realizedPnl,
            record_source: 'HISTORY_PNL'
          });
        }
      });

      if (parsedTransactions.length === 0) {
        alert('未讀取到有效的表格資料，請確認選擇的匯入模式與檔案格式！');
        setLoading(false);
        return;
      }

      const res = await importTransactions(parsedTransactions);
      if (res.success) {
        alert(`成功匯入 ${parsedTransactions.length} 筆資料！`);
        window.location.reload();
      } else {
        alert(`匯入失敗：${res.error}`);
      }
    } catch (err: any) {
      alert(`讀取檔案失敗：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-slate-300">選擇匯入類型：</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={() => setImportMode('INVENTORY')}
            className={`py-1.5 px-2 rounded text-xs font-bold border transition ${
              importMode === 'INVENTORY'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            📊 1. 庫存表 (當前持股)
          </button>
          <button
            type="button"
            onClick={() => setImportMode('HISTORY_PNL')}
            className={`py-1.5 px-2 rounded text-xs font-bold border transition ${
              importMode === 'HISTORY_PNL'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            📜 2. 券商對帳單 (已實現損益)
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-1">
        <label className="text-[11px] text-slate-400">
          {importMode === 'INVENTORY' 
            ? '上傳庫存表 Excel：僅更新當前持股張數與成本。' 
            : '上傳對帳單 Excel：只計算已實現損益，不影響庫存張數。'}
        </label>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          disabled={loading}
          className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer disabled:opacity-50"
        />
      </div>
      {loading && <span className="text-xs text-amber-400 animate-pulse">📄 資料處理中...</span>}
    </div>
  );
}