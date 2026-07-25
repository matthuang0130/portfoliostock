'use client';

export default function DeleteButton({ symbol }: { symbol: string }) {
  return (
    <button 
      type="submit" 
      className="text-red-500 hover:text-red-700 text-sm font-semibold border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition"
      onClick={(e) => {
        if (!window.confirm(`確定要刪除這筆 ${symbol} 的紀錄嗎？`)) {
          e.preventDefault(); // 取消送出表單
        }
      }}
    >
      刪除
    </button>
  );
}