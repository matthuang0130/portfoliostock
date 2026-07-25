'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { importTransactions } from '../actions';

export default function ImportExcel({ accountId }: { accountId: number }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // 🌟 這裡把 accountId 傳給後端，告訴它要匯入哪個帳號
        await importTransactions(accountId, data);
        alert('✅ Excel 匯入成功！');
      } catch (error) {
        console.error('匯入錯誤:', error);
        alert('❌ 匯入失敗，請檢查檔案格式。');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-5 border border-dashed border-slate-600 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center">
      <h3 className="text-sm font-bold text-slate-300 mb-3">批次匯入點金靈庫存</h3>
      <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-2 px-4 rounded transition shadow-sm border border-slate-600">
        {isUploading ? '處理中...' : '📂 選擇 Excel 檔案'}
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>
      <p className="text-xs text-slate-500 mt-3 text-center">支援直接上傳從點金靈匯出的 .xlsx 檔</p>
    </div>
  );
}