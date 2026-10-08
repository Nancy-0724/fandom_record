
import React, { useMemo, useRef, useState } from 'react';
import { Trophy, Star, Music, Zap, Sparkles, Smile, Minus, Plus, Medal, Download, Loader2, Share2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Group, GroupRatings } from '../types';

// @ts-ignore
import html2canvas from 'html2canvas';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onUpdateRatings: (groupId: string, ratings: GroupRatings) => void;
  isPage?: boolean;
}

const CRITERIA = [
  { key: 'songs', label: '歌曲', icon: <Music className="w-3 h-3" /> },
  { key: 'stage', label: '舞台', icon: <Zap className="w-3 h-3" /> },
  { key: 'variety', label: '綜藝感', icon: <Smile className="w-3 h-3" /> },
  { key: 'visual', label: '顏值', icon: <Sparkles className="w-3 h-3" /> },
] as const;

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, groups, onUpdateRatings, isPage }) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate overall sorted groups
  const sortedGroups = useMemo(() => {
    return [...groups].map(g => {
      const ratings = g.ratings || { songs: 0, stage: 0, variety: 0, visual: 0 };
      const total = ratings.songs + ratings.stage + ratings.variety + ratings.visual;
      return { ...g, ratings, total };
    }).sort((a, b) => b.total - a.total);
  }, [groups]);

  // Pre-calculate ranks for EACH criterion
  const criterionRanks = useMemo(() => {
    const ranks: Record<string, Record<string, number>> = {};
    CRITERIA.forEach(c => {
      const sortedByCriterion = [...groups]
        .map(g => ({ id: g.id, score: (g.ratings?.[c.key] || 0) }))
        .sort((a, b) => b.score - a.score);
      ranks[c.key] = {};
      sortedByCriterion.forEach((item, index) => {
        ranks[c.key][item.id] = index + 1;
      });
    });
    return ranks;
  }, [groups]);

  const handleAdjustRating = (groupId: string, key: keyof GroupRatings, delta: number) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const currentRatings = group.ratings || { songs: 0, stage: 0, variety: 0, visual: 0 };
    const newVal = Math.max(0, Math.min(10, currentRatings[key] + delta));
    onUpdateRatings(groupId, { ...currentRatings, [key]: newVal });
  };

  const getRankColorClasses = (groupId: string, criterionKey: string, score: number) => {
    if (score === 0) return 'bg-korean-bg text-korean-muted border-korean-border';
    const rank = criterionRanks[criterionKey]?.[groupId];
    const total = groups.length;
    if (rank === 1) return 'bg-amber-50 text-amber-700 border-amber-200 font-bold shadow-sm';
    if (rank <= 3) return 'bg-korean-sage/10 text-korean-sage border-korean-sage/20 font-bold';
    if (rank > total - 3 && total >= 4) return 'bg-korean-rose/5 text-korean-rose/60 border-korean-rose/10 opacity-80';
    return 'bg-white text-korean-stone border-korean-border shadow-sm';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Medal className="w-4 h-4 text-amber-400 fill-current" />;
    if (index === 1) return <Medal className="w-4 h-4 text-korean-sand fill-current" />;
    if (index === 2) return <Medal className="w-4 h-4 text-amber-700 fill-current" />;
    return <span className="text-[10px] font-bold text-korean-muted">{index + 1}</span>;
  };

  const handleExportImage = async () => {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      // @ts-ignore
      const canvas = await html2canvas(exportRef.current, {
        scale: 3, 
        backgroundColor: '#FDFCFB',
        useCORS: true,
        logging: false,
        onclone: (documentClone: any) => {
          const el = documentClone.querySelector('#export-content') as HTMLElement;
          if (el) { el.style.width = 'auto'; el.style.height = 'auto'; el.style.overflow = 'visible'; el.style.display = 'block'; }
        }
      });
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement('a');
      link.download = `Kpop-Power-Ranking-${new Date().getTime()}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("匯出圖片失敗");
    } finally { setIsExporting(false); }
  };

  const content = (
    <div className={`flex flex-col ${isPage ? 'h-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-korean-border overflow-hidden' : 'h-full'}`}>
      {isPage && (
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-korean-border flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold text-korean-stone tracking-tight">團體綜合戰力評比</h2>
          <button onClick={onClose} className="p-2 md:p-2.5 bg-korean-bg hover:bg-korean-sand/30 rounded-xl md:rounded-2xl transition-all text-korean-muted active:scale-95">
            <Trophy className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="bg-korean-bg/30 flex-1 overflow-hidden flex flex-col no-scrollbar max-w-full relative">
        <div className="px-4 md:px-8 py-3 md:py-4 bg-white border-b border-korean-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-korean-bg rounded-xl md:rounded-2xl flex items-center justify-center text-korean-sage">
                <Trophy className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
                <h4 className="text-xs md:text-sm font-bold text-korean-stone leading-none">戰力排行榜</h4>
                <p className="text-[9px] md:text-[10px] text-korean-muted font-bold uppercase mt-1 tracking-wider italic">Frozen Header & Sidebar</p>
            </div>
          </div>
          <button 
            onClick={handleExportImage}
            disabled={groups.length === 0 || isExporting}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold transition-all active:scale-95 shadow-sm
                ${isExporting ? 'bg-korean-bg text-korean-muted' : 'bg-korean-sage text-white hover:bg-korean-sage/90 shadow-korean-sage/20'}
                disabled:opacity-50`}
          >
            {isExporting ? <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" /> : <Download className="w-3 h-3 md:w-3.5 md:h-3.5" />}
            {isExporting ? '生成中' : '匯出評比圖'}
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-auto bg-korean-bg/30 custom-scrollbar pb-8 relative">
          {groups.length === 0 ? (
            <div className="p-12 md:p-20 text-center">
              <Star className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-korean-sand/30" />
              <p className="text-korean-stone font-bold text-sm md:text-base">尚未新增任何團體</p>
            </div>
          ) : (
            <div ref={exportRef} id="export-content" className="p-4 md:p-8 min-w-max inline-block bg-korean-bg/30">
                <div className="hidden block-for-export mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-korean-sage rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Trophy className="w-8 h-8" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-bold text-korean-stone tracking-tight">K-POP 男團綜合戰力分析表</h2>
                            <p className="text-[11px] text-korean-muted font-bold tracking-[0.2em] uppercase">My Personal Power Ranking Database</p>
                         </div>
                    </div>
                </div>

                <table className="border-separate border-spacing-0 rounded-[2rem] overflow-hidden shadow-xl shadow-korean-stone/5 bg-white border border-korean-border">
                  <thead className="relative z-40">
                    <tr>
                      <th className="p-4 text-left text-[11px] font-bold text-korean-muted uppercase tracking-widest bg-korean-bg sticky top-0 left-0 z-50 border-b border-r border-korean-border">
                        維度 / 團體
                      </th>
                      {sortedGroups.map((group, index) => (
                        <th key={group.id} className={`p-4 min-w-[120px] border-b border-korean-border sticky top-0 z-40 shadow-sm ${index === 0 ? 'bg-amber-50/50' : 'bg-white'}`}>
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center justify-center h-5">{getRankIcon(index)}</div>
                            <div className="text-xs font-bold text-korean-stone break-words line-clamp-2 w-full text-center leading-tight min-h-[2rem] flex items-center justify-center">
                              {group.name}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-korean-border">
                    {CRITERIA.map(c => (
                      <tr key={c.key} className="group hover:bg-korean-bg/20 transition-colors">
                        <td className="p-4 sticky left-0 z-30 bg-korean-bg/50 group-hover:bg-korean-bg border-r border-korean-border transition-colors shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-korean-muted shadow-sm border border-korean-border">
                                {c.icon}
                            </div>
                            <span className="text-xs font-bold text-korean-stone whitespace-nowrap">{c.label}</span>
                          </div>
                        </td>
                        {sortedGroups.map(group => {
                          const score = group.ratings?.[c.key] || 0;
                          const colorClasses = getRankColorClasses(group.id, c.key, score);
                          return (
                            <td key={`${group.id}-${c.key}`} className="p-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg leading-none transition-all border ${colorClasses}`}>
                                  <span className="pt-0.5">{score}</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all no-export">
                                  <button onClick={() => handleAdjustRating(group.id, c.key, -1)} className="p-1.5 hover:bg-korean-bg rounded-lg text-korean-muted active:scale-75 transition-all">
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleAdjustRating(group.id, c.key, 1)} className="p-1.5 hover:bg-korean-bg rounded-lg text-korean-muted active:scale-75 transition-all">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-korean-bg/30">
                      <td className="p-4 sticky left-0 z-30 bg-korean-bg/50 border-r border-korean-border transition-colors shadow-sm">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-korean-stone text-white shadow-md">
                                <Share2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-korean-stone">總體戰力</span>
                          </div>
                      </td>
                      {sortedGroups.map(group => (
                        <td key={`${group.id}-total`} className="p-4 text-center">
                           <div className={`inline-flex flex-col items-center justify-center min-w-[60px] p-2 rounded-2xl border transition-all shadow-md ${
                              group.total > 30 ? 'bg-korean-sage border-korean-sage text-white scale-105 font-bold' :
                              group.total > 20 ? 'bg-white border-korean-sage/30 text-korean-sage font-bold' :
                              'bg-white border-korean-border text-korean-muted font-bold'
                            }`}>
                               <span className="text-xl font-bold leading-none pt-0.5">{group.total}</span>
                               <span className="text-[9px] font-bold mt-1 opacity-80 tracking-tighter uppercase">Pts</span>
                            </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
            </div>
          )}
        </div>
      </div>
      {!isPage && (
        <div className="p-4 border-t border-korean-border bg-white rounded-b-[2.5rem] shrink-0">
          <button onClick={onClose} className="w-full py-2.5 text-korean-muted text-sm font-bold hover:text-korean-stone transition-colors">返回主畫面</button>
        </div>
      )}
      <style>{`
        .block-for-export { display: none; }
        #export-content .no-export { display: flex; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );

  if (isPage) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="團體綜合戰力評比">
      {content}
    </Modal>
  );
};
