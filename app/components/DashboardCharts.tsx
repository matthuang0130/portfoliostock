'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Rectangle
} from 'recharts';

export default function DashboardCharts({
  dividendData,
  realizedPnlData = [],
  holdingsData,
  dividendDetails = [],
}: {
  dividendData: { year: number; dividend: number }[];
  realizedPnlData?: { year: number; pnl: number }[];
  holdingsData: { symbol: string; marketValue: number }[];
  dividendDetails?: { id: number; symbol: string; symbol_name?: string; trade_date: string; total_amount: number }[];
  snapshotData?: any[];
  currentTotalValue?: number;
  currentTotalCost?: number;
  accountId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'REALIZED_PNL' | 'DIVIDEND'>('REALIZED_PNL');
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');

  const COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#fbbf24', '#94a3b8'];

  const totalMarketValue = holdingsData.reduce((sum, item) => sum + item.marketValue, 0);
  const formattedPieData = (() => {
    if (holdingsData.length <= 6) return holdingsData;
    const topHoldings = holdingsData.slice(0, 5);
    const otherValue = holdingsData.slice(5).reduce((sum, item) => sum + item.marketValue, 0);
    return [...topHoldings, { symbol: '其他標的', marketValue: otherValue }];
  })();

  const filteredDividends = dividendDetails.filter(d => {
    if (selectedYear === 'ALL') return true;
    const y = new Date(d.trade_date).getFullYear();
    return y === selectedYear;
  });

  // 🌟 自訂無亮白框的 ActiveBar 渲染元件
  const renderCustomActiveBar = (props: any) => {
    return <Rectangle {...props} stroke="none" strokeWidth={0} fillOpacity={0.85} />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-6 select-none">
      
      {/* 左區塊：歷年已實現損益 / 歷年配息 */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col h-[340px]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('REALIZED_PNL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'REALIZED_PNL'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              📈 歷年已實現損益
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DIVIDEND')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'DIVIDEND'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              🎁 歷年配息
            </button>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0">
          {activeTab === 'REALIZED_PNL' ? (
            realizedPnlData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <span>📄 尚無已實現損益紀錄</span>
                <span className="text-[11px] text-slate-600">（請至左側選單上傳「券商對帳單 Excel」）</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realizedPnlData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }} className="outline-none focus:outline-none [&_*]:outline-none">
                  <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '已實現損益']}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]} activeBar={renderCustomActiveBar}>
                    {realizedPnlData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#ef4444' : '#22c55e'} stroke="none" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            dividendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-xs">尚無配息紀錄</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dividendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }} className="outline-none focus:outline-none [&_*]:outline-none">
                  <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '年度總配息']}
                  />
                  <Bar dataKey="dividend" fill="#0284c7" radius={[4, 4, 0, 0]} activeBar={renderCustomActiveBar} />
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </div>
      </div>

      {/* 右區塊：庫存資產占比 */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col h-[340px]">
        <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
          <span>🍰 庫存資產占比</span>
        </h3>
        
        {holdingsData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500 text-xs">尚無庫存資料</div>
        ) : (
          <div className="flex flex-1 items-center justify-between gap-4 min-h-0">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart className="outline-none focus:outline-none [&_*]:outline-none">
                  <Pie data={formattedPieData} dataKey="marketValue" nameKey="symbol" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {formattedPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()} (${((Number(val) / totalMarketValue) * 100).toFixed(1)}%)`, '市值']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 flex flex-col gap-2 overflow-y-auto pr-1 max-h-[240px]">
              {formattedPieData.map((item, idx) => {
                const percent = ((item.marketValue / totalMarketValue) * 100).toFixed(1);
                return (
                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/50 p-2 rounded border border-slate-800/80">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-bold text-slate-200 truncate">{item.symbol}</span>
                    </div>
                    <span className="font-mono text-slate-400 pl-2">{percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 🌟 切換至配息頁籤時，下方展開【可折疊】的歷史配息明細 */}
      {activeTab === 'DIVIDEND' && (
        <div className="col-span-1 lg:col-span-2">
          <details className="group bg-slate-900 rounded-xl border border-slate-800 transition-all duration-200">
            <summary className="p-4 cursor-pointer flex justify-between items-center select-none text-sm hover:bg-slate-800/40 rounded-xl transition">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">🎁 配息歷史領取明細</span>
                <span className="text-xs text-slate-500 font-normal">（共 {dividendDetails.length} 筆紀錄）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-sky-400 font-medium group-open:hidden">點擊展開明細 ▾</span>
                <span className="text-xs text-slate-400 font-medium hidden group-open:inline">收起明細 ▴</span>
              </div>
            </summary>

            <div className="p-5 pt-0 border-t border-slate-800/60 mt-1 flex flex-col gap-3">
              {/* 年份快速篩選按鈕 */}
              <div className="flex justify-end gap-1 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedYear('ALL')}
                  className={`px-2 py-1 rounded text-[11px] font-bold ${selectedYear === 'ALL' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  全部年份
                </button>
                {dividendData.map(d => (
                  <button
                    type="button"
                    key={d.year}
                    onClick={() => setSelectedYear(d.year)}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${selectedYear === d.year ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {d.year}年
                  </button>
                ))}
              </div>

              {filteredDividends.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">查無此年份配息紀錄</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {filteredDividends.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-500">{item.trade_date}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-slate-200">{item.symbol}</span>
                          {item.symbol_name && (
                            <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                              {item.symbol_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-amber-400 font-bold text-sm">
                        +${Number(item.total_amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      )}

    </div>
  );
}