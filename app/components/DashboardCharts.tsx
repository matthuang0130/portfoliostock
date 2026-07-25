'use client';

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { recordAssetSnapshot } from '../actions';

export default function DashboardCharts({ 
  dividendData, 
  snapshotData, 
  currentTotalValue, 
  currentTotalCost,
  accountId // 🌟 接收目前的帳號 ID
}: { 
  dividendData: any[], 
  snapshotData: any[],
  currentTotalValue: number,
  currentTotalCost: number,
  accountId: string
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSnapshot = async () => {
    setIsSaving(true);
    // 🌟 如果是在總覽模式，帳號 ID 設為 0，否則轉為數字
    const targetId = accountId === 'all' ? 0 : Number(accountId);
    await recordAssetSnapshot(targetId, currentTotalValue, currentTotalCost);
    setIsSaving(false);
    alert('已成功記錄今日總資產快照！');
  };

  const sortedDividends = [...dividendData].sort((a, b) => a.year - b.year);
  
  const formattedSnapshots = snapshotData.map(snap => ({
    date: new Date(snap.record_date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
    value: Number(snap.total_value)
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      
      {/* 歷年配息長條圖 */}
      <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700">
        <h2 className="text-sm font-bold text-slate-400 mb-4">📊 歷年配息長條圖</h2>
        {sortedDividends.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500">尚無配息紀錄</div>
        ) : (
          <div className="h-48 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedDividends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val/1000}k`} width={60} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, '配息總額']}
                />
                <Bar dataKey="dividend" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 總資產趨勢折線圖 */}
      <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-slate-400">📈 總資產變化趨勢</h2>
          <button 
            onClick={handleSaveSnapshot} 
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1 px-3 rounded shadow transition"
          >
            {isSaving ? '記錄中...' : '📸 記錄今日結算'}
          </button>
        </div>
        {formattedSnapshots.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500">
            <p>目前尚無歷史資產快照</p>
            <p className="text-xs mt-2 text-slate-600">請點擊右上方按鈕記錄第一筆</p>
          </div>
        ) : (
          <div className="h-48 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedSnapshots} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${(val/10000).toFixed(0)}w`} width={60} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, '總市值']}
                />
                <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}