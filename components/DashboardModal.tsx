
import React, { useMemo } from 'react';
import { Trophy, Users, Calendar, Heart, Activity, TrendingUp, Hourglass, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Group } from '../types';
import { dateToTotalMonths } from '../utils';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  isPage?: boolean;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({ isOpen, onClose, groups, isPage }) => {
  
  const stats = useMemo(() => {
    const now = new Date();
    // 使用本地年月計算當前總月份數，避免時區偏差
    const currentTotalMonths = now.getFullYear() * 12 + now.getMonth();
    
    let earliestTotalMonths: number | null = null;
    let activeCount = 0;
    let fadedCount = 0;
    let unstanCount = 0;
    
    let biasCount = 0; // Rank 1
    let ultCount = 0;  // Rank 2
    let totalMembers = 0;

    const yearlyIntake: Record<number, { count: number; names: string[] }> = {};

    groups.forEach(g => {
        // 1. Member Stats
        totalMembers += g.members.length;
        g.members.forEach(m => {
            if (m.rank === 1) biasCount++;
            if (m.rank === 2) ultCount++;
        });

        // 2. Status Determination & Timeline Logic
        const sortedTimeline = [...(g.timeline || [])].sort((a, b) => a.date.localeCompare(b.date));
        
        let isCurrentlyUnstanned = !!g.unstanDate;
        let isCurrentlyFaded = false;
        let effectiveStartDateStr = g.stanDate;

        if (sortedTimeline.length > 0) {
            const latest = sortedTimeline[sortedTimeline.length - 1];
            if (latest.type === 'unstan') { isCurrentlyUnstanned = true; isCurrentlyFaded = false; }
            else if (latest.type === 'fade') { isCurrentlyFaded = true; isCurrentlyUnstanned = false; }
            else { isCurrentlyUnstanned = false; isCurrentlyFaded = false; }

            const firstStan = sortedTimeline.find(t => t.type === 'stan');
            if (firstStan) effectiveStartDateStr = firstStan.date;
        }

        if (isCurrentlyUnstanned) unstanCount++;
        else if (isCurrentlyFaded) fadedCount++;
        else activeCount++;

        // 3. Yearly Intake & Earliest Date
        if (effectiveStartDateStr && effectiveStartDateStr.length >= 4) {
            const year = parseInt(effectiveStartDateStr.substring(0, 4));
            if (!isNaN(year)) {
                if (!yearlyIntake[year]) yearlyIntake[year] = { count: 0, names: [] };
                yearlyIntake[year].count += 1;
                yearlyIntake[year].names.push(g.name);

                const tMonths = dateToTotalMonths(effectiveStartDateStr);
                if (earliestTotalMonths === null || tMonths < earliestTotalMonths) {
                    earliestTotalMonths = tMonths;
                }
            }
        }
    });

    // Overall Fan Age (Time from first stan to now)
    let fanAge = "0 天";
    if (earliestTotalMonths !== null) {
        const monthDiff = currentTotalMonths - earliestTotalMonths;
        if (monthDiff >= 12) {
            fanAge = `${(monthDiff / 12).toFixed(1)} 年`;
        } else {
            // 估算天數 (一個月約 30.44 天)
            const estDays = Math.floor(monthDiff * 30.44);
            fanAge = `${estDays} 天`;
        }
    }

    const years = Object.keys(yearlyIntake).map(Number).sort((a, b) => a - b);
    const maxIntake = Math.max(...Object.values(yearlyIntake).map(v => v.count), 1);
    
    const chartData = [];
    if (years.length > 0) {
        const startY = years[0];
        const endY = Math.max(years[years.length - 1], now.getFullYear());
        for (let y = startY; y <= endY; y++) {
            chartData.push({ 
                year: y, 
                count: yearlyIntake[y]?.count || 0,
                names: yearlyIntake[y]?.names || []
            });
        }
    }

    // 4. Stan Anniversaries
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const anniversaries: { name: string; years: number; logo?: string }[] = [];

    groups.forEach(g => {
        if (g.stanDate) {
            const [stanY, stanM] = g.stanDate.split('-').map(Number);
            if (stanM === currentMonth && stanY < currentYear) {
                anniversaries.push({
                    name: g.name,
                    years: currentYear - stanY,
                    logo: g.logoUrl
                });
            }
        }
    });

    return {
        activeCount, fadedCount, unstanCount,
        biasCount, ultCount, totalMembers,
        fanAge, chartData, maxIntake,
        anniversaries
    };
  }, [groups]);

  const totalGroups = groups.length || 1;
  const activeDeg = (stats.activeCount / totalGroups) * 360;
  const fadeDeg = (stats.fadedCount / totalGroups) * 360;
  
  const pieStyle = {
      background: `conic-gradient(
        #96A291 0deg ${activeDeg}deg,
        #EAE3D9 ${activeDeg}deg ${activeDeg + fadeDeg}deg,
        #FDFCFB ${activeDeg + fadeDeg}deg 360deg
      )`
  };

  const content = (
    <div className={`flex flex-col ${isPage ? 'h-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-korean-border overflow-hidden' : 'h-full'}`}>
      {isPage && (
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-korean-border flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold text-korean-stone tracking-tight">追星數據儀表板</h2>
          <button onClick={onClose} className="p-2 md:p-2.5 bg-korean-bg hover:bg-korean-sand/30 rounded-xl md:rounded-2xl transition-all text-korean-muted active:scale-95">
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-korean-bg/30 space-y-4 md:space-y-6 custom-scrollbar">
        
        {/* Anniversary Alerts */}
        {stats.anniversaries.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-3.5 h-3.5 md:w-4 h-4 text-korean-rose" />
              <h4 className="text-[10px] md:text-xs font-bold text-korean-muted uppercase tracking-widest">入坑周年紀念</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {stats.anniversaries.map((ann, idx) => (
                <div key={idx} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-korean-rose/20 shadow-sm flex items-center gap-3 md:gap-4 animate-pop-in">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-korean-rose/5 flex items-center justify-center overflow-hidden border border-korean-rose/10 shrink-0">
                    {ann.logo ? (
                      <img src={ann.logo} alt={ann.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Heart className="w-5 h-5 md:w-6 md:h-6 text-korean-rose/30" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] md:text-sm font-bold text-korean-stone leading-tight break-words">
                      入坑 <span className="text-korean-rose">{ann.name}</span> 已經滿 <span className="text-base md:text-lg text-korean-rose mx-0.5">{ann.years}</span> 年了！
                    </p>
                    <p className="text-[9px] md:text-[10px] text-korean-muted font-bold uppercase mt-0.5 tracking-wider italic opacity-60">Happy Anniversary</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-korean-border shadow-sm flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-transform hover:scale-[1.02]">
                <div className="p-2 md:p-2.5 bg-korean-bg text-korean-sage rounded-xl md:rounded-2xl mb-0.5 md:mb-1">
                    <Hourglass className="w-3.5 h-3.5 md:w-4 h-4" />
                </div>
                <span className="text-lg md:text-xl font-bold text-korean-stone">{stats.fanAge}</span>
                <span className="text-[9px] md:text-[10px] text-korean-muted font-bold uppercase tracking-wider">追星資歷</span>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-korean-border shadow-sm flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-transform hover:scale-[1.02]">
                <div className="p-2 md:p-2.5 bg-korean-bg text-korean-sage rounded-xl md:rounded-2xl mb-0.5 md:mb-1">
                    <Activity className="w-3.5 h-3.5 md:w-4 h-4" />
                </div>
                <span className="text-lg md:text-xl font-bold text-korean-stone">{stats.activeCount}</span>
                <span className="text-[9px] md:text-[10px] text-korean-muted font-bold uppercase tracking-wider">現役團體</span>
            </div>
             <div className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-korean-border shadow-sm flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-transform hover:scale-[1.02] col-span-2 sm:col-span-1">
                <div className="p-2 md:p-2.5 bg-korean-bg text-korean-rose rounded-xl md:rounded-2xl mb-0.5 md:mb-1">
                    <Heart className="w-3.5 h-3.5 md:w-4 h-4" />
                </div>
                <span className="text-lg md:text-xl font-bold text-korean-stone">{stats.biasCount + stats.ultCount}</span>
                <span className="text-[9px] md:text-[10px] text-korean-muted font-bold uppercase tracking-wider">本命總數</span>
            </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-korean-border shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 md:mb-6">
                <TrendingUp className="w-3.5 h-3.5 md:w-4 h-4 text-korean-sage" />
                <h3 className="text-[13px] md:text-sm font-bold text-korean-stone tracking-tight">入坑年份趨勢</h3>
            </div>
            
            {stats.chartData.length > 0 ? (
                <div className="flex items-end gap-2 md:gap-3 h-40 md:h-48 pt-6 md:pt-8 pb-2 px-2 md:px-4 overflow-x-auto no-scrollbar">
                    {stats.chartData.map((d) => (
                        <div key={d.year} className="flex-1 min-w-[30px] flex flex-col items-center gap-2 group relative h-full justify-end">
                             <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-korean-stone text-white text-[10px] px-3 py-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 whitespace-normal min-w-[120px] max-w-[180px] z-10 pointer-events-none shadow-xl border border-white/10">
                                <div className="font-bold border-b border-white/10 pb-1 mb-1">{d.year}年 ({d.count}團)</div>
                                <div className="opacity-90 leading-tight break-words">
                                  {d.names.length > 0 ? d.names.join(', ') : '無'}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-korean-stone"></div>
                             </div>
                             
                             <div className="w-full flex-1 flex items-end justify-center">
                                 <div 
                                    className={`w-full max-w-[16px] md:max-w-[24px] rounded-t-lg md:rounded-t-xl transition-all relative ${d.count > 0 ? 'bg-korean-sage group-hover:bg-korean-sage/80 shadow-sm' : 'bg-korean-bg'}`}
                                    style={{ height: d.count > 0 ? `${(d.count / stats.maxIntake) * 100}%` : '6px' }}
                                 >
                                 </div>
                             </div>
                             <span className="text-[9px] md:text-[10px] text-korean-muted font-bold font-mono tracking-tighter">
                                {d.year.toString().slice(2)}
                             </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-32 md:h-40 flex flex-col items-center justify-center text-korean-muted text-[11px] md:text-xs border border-dashed border-korean-border rounded-[1.5rem] md:rounded-[2rem] bg-korean-bg/30">
                    <Calendar className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 opacity-30" />
                    <p className="font-bold">暫無時間資料</p>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-korean-border shadow-sm flex flex-col items-center">
                 <h3 className="text-[11px] md:text-xs font-bold text-korean-muted mb-4 w-full text-left uppercase tracking-wider">狀態分佈</h3>
                 <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full mb-4 md:mb-6 shadow-inner border-4 border-korean-bg" style={pieStyle}>
                    <div className="absolute inset-4 md:inset-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[11px] md:text-xs font-bold text-korean-stone">{groups.length} 團</span>
                    </div>
                 </div>
                 <div className="w-full space-y-2 md:space-y-2.5 px-1 md:px-2">
                    <div className="flex items-center justify-between text-[10px] md:text-[11px]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-korean-sage"></div>
                            <span className="text-korean-stone font-bold">坑底/回坑</span>
                        </div>
                        <span className="font-bold text-korean-sage">{Math.round((stats.activeCount/totalGroups)*100)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] md:text-[11px]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-korean-sand"></div>
                            <span className="text-korean-stone font-bold">淡坑</span>
                        </div>
                        <span className="font-bold text-korean-sand">{Math.round((stats.fadedCount/totalGroups)*100)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] md:text-[11px]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-korean-bg"></div>
                            <span className="text-korean-stone font-bold">退坑</span>
                        </div>
                        <span className="font-bold text-korean-muted">{Math.round((stats.unstanCount/totalGroups)*100)}%</span>
                    </div>
                 </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-korean-border shadow-sm flex flex-col">
                 <h3 className="text-[11px] md:text-xs font-bold text-korean-muted mb-4 text-left uppercase tracking-wider">本命金字塔</h3>
                 <div className="flex-1 flex flex-col justify-center items-center gap-2">
                    <div className="w-1/3 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl md:rounded-2xl py-1.5 md:py-2 text-center shadow-sm relative group transition-transform hover:scale-105">
                        <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5 absolute -left-2 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 text-amber-400" />
                        <span className="text-[11px] md:text-xs font-bold">{stats.ultCount}</span>
                    </div>
                    <div className="w-2/3 bg-korean-rose/5 border border-korean-rose/10 text-korean-rose rounded-xl md:rounded-2xl py-1.5 md:py-2 text-center shadow-sm relative transition-transform hover:scale-105">
                        <Heart className="w-3 h-3 md:w-3.5 md:h-3.5 absolute -left-2 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 text-korean-rose/50" />
                        <span className="text-[11px] md:text-xs font-bold">{stats.biasCount}</span>
                    </div>
                    <div className="w-full bg-korean-bg border border-korean-border text-korean-stone rounded-xl md:rounded-2xl py-1.5 md:py-2 text-center shadow-sm relative transition-transform hover:scale-105">
                        <Users className="w-3 h-3 md:w-3.5 md:h-3.5 absolute -left-2 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 text-korean-muted" />
                        <span className="text-[11px] md:text-xs font-bold">{stats.totalMembers}</span>
                    </div>
                 </div>
                 <p className="text-[9px] md:text-[10px] text-center text-korean-muted mt-4 font-bold uppercase tracking-widest">總計人數</p>
            </div>
        </div>

      </div>
      {!isPage && (
        <div className="p-4 border-t border-korean-border bg-white rounded-b-[2.5rem]">
          <button onClick={onClose} className="w-full py-2.5 text-korean-muted text-sm font-bold hover:text-korean-stone transition-colors">關閉</button>
        </div>
      )}
    </div>
  );

  if (isPage) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="追星數據儀表板">
      {content}
    </Modal>
  );
};
