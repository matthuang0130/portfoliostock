'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton() {
  // 用來偵測表單是否正在送出中
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full font-bold py-2 px-4 rounded transition shadow-sm border 
        ${pending 
          ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
        }`}
    >
      {pending ? '寫入中...' : '➕ 新增紀錄'}
    </button>
  );
}