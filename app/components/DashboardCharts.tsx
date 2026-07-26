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
  accountId = '1',
}: {
  dividendData: { year: number; dividend: number }[];
  realizedPnlData?: { year: number; pnl: number }[];
  holdingsData: { symbol: string; symbolName?: string; marketValue: number }[];
  dividendDetails?: { id: number; symbol: string; symbol_name?: string; trade_date: string; total_amount: number }[];
  snapshotData?: any[];
  currentTotalValue?: number;
  currentTotalCost?: number;
  accountId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'REALIZED_PNL' | 'DIVIDEND'>('REALIZED_PNL');
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#fbbf24', '#94a3b8'];

  const totalMarketValue = holdingsData.reduce((sum, item) => sum + item.marketValue, 0);
  const formattedPieData = (() => {
    if (holdingsData.length <= 6) return holdingsData;
    const topHoldings = holdingsData.slice(0, 5);
    const otherValue = holdingsData.slice(5).reduce((sum, item) => sum + item.marketValue, 0);
    return [...topHoldings, { symbol: '其他標的', symbolName: '其他持股', marketValue: otherValue }];
  })();

  // 1. 篩選與加總配息（依據股票標的合併）
  const filteredDividendsRaw = dividendDetails.filter(d => {
    if (selectedYear === 'ALL') return true;
    const payYear = new Date(d.trade_date).getFullYear();
    return payYear === Number(selectedYear);
  });

  const aggregatedDividends = (() => {
    const map: { [symbol: string]: { symbol: string; symbol_name: string; total_amount: number; count: number } } = {};

    filteredDividendsRaw.forEach(item => {
      const sym = item.symbol;
      if (!map[sym]) {
        map[sym] = {
          symbol: sym,
          symbol_name: item.symbol_name || '',
          total_amount: 0,
          count: 0,
        };
      }
      map[sym].total_amount += Number(item.total_amount || 0);
      map[sym].count += 1;
    });

    return Object.values(map).sort((a, b) => b.total_amount - a.total_amount);
  })();

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
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realizedPnlData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
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
                <BarChart data={dividendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
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
        <h3 className="text-sm font-bold text-slate-300 mb-2">🍰 庫存資產占比</h3>
        {holdingsData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500 text-xs">尚無庫存資料</div>
        ) : (
          <div className="flex flex-1 items-center justify-between gap-4 min-h-0">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={formattedPieData} dataKey="marketValue" nameKey="symbol" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {formattedPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val: any, name: any, item: any) => {
                      const nameText = item?.payload?.symbolName ? `${item.payload.symbol} ${item.payload.symbolName}` : item?.payload?.symbol;
                      return [`$${Number(val).toLocaleString()} (${((Number(val) / totalMarketValue) * 100).toFixed(1)}%)`, nameText];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 flex flex-col gap-2 overflow-y-auto pr-1 max-h-[240px]">
              {formattedPieData.map((item, idx) => {
                const percent = ((item.marketValue / totalMarketValue) * 100).toFixed(1);
                const nameLabel = item.symbolName ? `${item.symbol} ${item.symbolName}` : item.symbol;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/50 p-2 rounded border border-slate-800/80">
                    <div className="flex items-center gap-2 truncate pr-1">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-bold text-slate-200 truncate" title={nameLabel}>{nameLabel}</span>
                    </div>
                    <span className="font-mono text-slate-400 pl-1 flex-shrink-0">{percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 🌟 歷史配息領取明細：按標的加總合併卡片 */}
      {activeTab === 'DIVIDEND' && (
        <div className="col-span-1 lg:col-span-2">
          <details className="group bg-slate-900 rounded-xl border border-slate-800 transition-all duration-200" open>
            <summary className="p-4 cursor-pointer flex justify-between items-center select-none text-sm hover:bg-slate-800/40 rounded-xl transition">
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-bold">🎁 各標的累積領息總額</span>
                <span className="text-xs text-slate-500 font-normal">（共 {aggregatedDividends.length} 檔標的）</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddModal(true);
                  }}
                  className="bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded text-xs font-bold transition"
                >
                  ➕ 手動新增配息
                </button>
                <span className="text-xs text-slate-400 font-medium group-open:inline hidden">收起明細 ▴</span>
                <span className="text-xs text-sky-400 font-medium group-open:hidden inline">點擊展開明細 ▾</span>
              </div>
            </summary>

            <div className="p-5 pt-0 border-t border-slate-800/60 mt-1 flex flex-col gap-3">
              <div className="flex justify-end gap-1 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedYear('ALL')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${selectedYear === 'ALL' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  全部年份
                </button>
                {dividendData.map(d => (
                  <button
                    type="button"
                    key={d.year}
                    onClick={() => setSelectedYear(d.year)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold ${selectedYear === d.year ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {d.year}年
                  </button>
                ))}
              </div>

              {aggregatedDividends.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">查無配息紀錄，點擊上方按鈕手動新增</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {aggregatedDividends.map((item) => (
                    <div key={item.symbol} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs hover:border-slate-700 transition">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-100 text-sm">{item.symbol}</span>
                          {item.symbol_name && (
                            <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                              {item.symbol_name}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1">
                          累積領取 {item.count} 次
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 font-extrabold text-base pr-1">
                          +${item.total_amount.toLocaleString()}
                        </span>

                        {/* 清除該股票配息 */}
                        <form action="/api/dividends" method="POST" className="inline">
                          <input type="hidden" name="action_type" value="DELETE_SYMBOL" />
                          <input type="hidden" name="symbol" value={item.symbol} />
                          <input type="hidden" name="account_id" value={accountId === 'all' ? '0' : accountId} />
                          <button
                            type="submit"
                            onClick={(e) => {
                              if (!confirm(`確定要清除【${item.symbol}】的配息紀錄重新手動輸入嗎？`)) {
                                e.preventDefault();
                              }
                            }}
                            className="text-[10px] text-slate-500 hover:text-red-400 bg-slate-900 hover:bg-red-950/50 px-1.5 py-1 rounded border border-slate-800 transition"
                            title="清空此標的配息重新填寫"
                          >
                            🗑️
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* 手動新增彈窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-amber-400 mb-4 flex justify-between items-center">
              <span>➕ 手動補登現金股利</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
            </h3>

            <form action="/api/dividends" method="POST" className="flex flex-col gap-3 text-xs">
              <input type="hidden" name="action_type" value="ADD" />
              <input type="hidden" name="account_id" value={accountId === 'all' ? '1' : accountId} />

              <div>
                <label className="text-slate-400 block mb-1">股票代號 (例如: 1423)</label>
                <input 
                  type="text" 
                  name="symbol" 
                  required 
                  placeholder="請輸入股票代號"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">股票名稱 (選填)</label>
                <input 
                  type="text" 
                  name="symbol_name" 
                  placeholder="例如: 利華"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">配息日期 (除息或發放日)</label>
                <input 
                  type="date" 
                  name="trade_date" 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">實領配息總額 (NT$)</label>
                <input 
                  type="number" 
                  name="total_amount" 
                  required 
                  placeholder="例如: 97200"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-amber-400 font-mono font-bold text-sm"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded font-bold transition"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="w-1/2 bg-amber-600 hover:bg-amber-500 text-white p-2 rounded font-bold transition"
                >
                  確定新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}