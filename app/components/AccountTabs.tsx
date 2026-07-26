'use client';

// 🌟 移除 Next.js 的 Link，改用最穩定的傳統 a 標籤
export default function AccountTabs({ currentAccount }: { currentAccount: string }) {
  const tabs = [
    { id: '1', label: '帳號 1 (MATT積極)' },
    { id: '2', label: '帳號 2 (中秀 領息)' },
    { id: '3', label: '帳號 3 (吳悠悠 領息)' },
    { id: '4', label: '帳號 4 (FENNY)' },
    { id: '5', label: '帳號 5 (備用)' },
    { id: 'all', label: '🌐 所有帳號合併總覽' }
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {tabs.map(tab => {
        const isActive = currentAccount === tab.id;
        return (
          // 🌟 這裡把 <Link> 改成 <a>，確保每次點擊都強制向後端拿最新資料
          <a 
            key={tab.id} 
            href={`/?account=${tab.id}`} 
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm whitespace-nowrap border ${
              isActive 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}