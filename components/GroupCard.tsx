
import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Pencil, ChevronUp, ChevronDown, CalendarHeart, Crown, Heart, Users, CalendarOff } from 'lucide-react';
import { Group, Member } from '../types';
import { MemberGrid } from './MemberGrid';

interface GroupCardProps {
  group: Group;
  isFirst: boolean;
  isLast: boolean;
  isSortMode?: boolean;
  onMove: (dir: number) => void;
  onEdit: () => void;
  onDetails: () => void;
  onToggleExpand: () => void;
  onToggleRank: (member: Member) => void;
  onRemove: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = React.memo(({ 
  group, isFirst, isLast, isSortMode, onMove, onEdit, onDetails, onToggleExpand, onToggleRank, onRemove 
}) => {
  const biasMembers = group.members.filter(m => m.rank === 1);
  const ultMembers = group.members.filter(m => m.rank === 2);
  const [imageError, setImageError] = useState(false);

  // Reset error state when url changes
  useEffect(() => {
    setImageError(false);
  }, [group.logoUrl]);

  // Visual state
  const isUnstanned = !!group.unstanDate;
  
  // Detect if current status is "Fade" (latest event is 'fade')
  // We look at the timeline if available, otherwise assume active unless unstanned
  // Use spread syntax [...] to create a shallow copy before sorting to avoid mutating the original array
  const isFaded = !isUnstanned && group.timeline && group.timeline.length > 0 && 
    [...group.timeline].sort((a, b) => b.date.localeCompare(a.date))[0].type === 'fade';

  return (
    <div className={`
      bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border overflow-hidden animate-pop-in h-full flex flex-col w-full transition-all duration-500
      ${isUnstanned ? 'border-korean-border opacity-60 grayscale-[0.3]' : isFaded ? 'border-korean-sand/30 shadow-xl shadow-korean-sand/5' : 'border-korean-border hover:border-korean-sage/30 hover:shadow-xl hover:shadow-korean-sage/5'}
      ${isSortMode ? 'ring-2 ring-korean-sage ring-offset-2 scale-[0.98]' : ''}
    `}>
      
      <div className={`flex items-stretch min-h-[110px] md:min-h-[140px] ${isUnstanned ? 'bg-korean-bg/50' : isFaded ? 'bg-korean-sand/5' : ''}`}>
          {/* Main Content Area (Click to view details) */}
          <div className="flex-1 p-3 md:p-6 flex gap-3 md:gap-6 select-none group">
            
            {/* Logo Column - Clickable for details */}
            <div className="flex-shrink-0 cursor-pointer" onClick={onDetails}>
              {group.logoUrl && !imageError ? (
                <div className="relative">
                  <img 
                    src={group.logoUrl} 
                    alt={group.name} 
                    className={`w-14 h-14 md:w-20 md:h-20 rounded-[1rem] md:rounded-[1.5rem] object-cover border-2 md:border-4 shadow-sm transition-transform duration-500 group-hover:scale-105 ${isUnstanned ? 'border-korean-border' : 'border-korean-bg'}`}
                    onError={() => setImageError(true)}
                  />
                  {!isUnstanned && !isFaded && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-6 md:h-6 bg-white border border-korean-border rounded-2xl shadow-lg flex items-center justify-center">
                        <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 bg-korean-sage rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-[1rem] md:rounded-[1.5rem] bg-korean-bg flex items-center justify-center text-korean-muted/30 border border-korean-border group-hover:bg-korean-sage/5 transition-colors duration-500">
                    <Users className="w-6 h-6 md:w-10 md:h-10" />
                </div>
              )}
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 md:py-1">
                
                {/* Top: Name & Date - Clickable for details */}
                <div className="cursor-pointer" onClick={onDetails}>
                  <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                    <h2 className={`text-base md:text-xl font-bold leading-tight break-words transition-colors 
                      ${isUnstanned ? 'text-korean-muted' : isFaded ? 'text-korean-stone' : 'text-korean-stone group-hover:text-korean-sage'}
                    `}>
                      {group.name}
                    </h2>
                    {isFaded && <span className="text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold uppercase tracking-wider">Fade</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1">
                    {group.stanDate && (
                        <div className={`text-[9px] md:text-[11px] font-bold flex items-center gap-1 md:gap-1.5 ${isUnstanned ? 'text-korean-muted' : 'text-korean-sage'}`}>
                        <CalendarHeart className="w-2.5 md:w-3.5 h-2.5 md:h-3.5 flex-shrink-0" /> <span>{group.stanDate}</span>
                        </div>
                    )}
                    {group.unstanDate && (
                        <div className="text-[9px] md:text-[11px] text-korean-muted font-bold flex items-center gap-1 md:gap-1.5">
                            <span className="opacity-30">/</span> <CalendarOff className="w-2.5 md:w-3.5 h-2.5 md:h-3.5 flex-shrink-0" /> <span>{group.unstanDate}</span>
                        </div>
                    )}
                  </div>
                </div>

                {/* Bottom: Tags & Actions Row */}
                <div className="flex items-end justify-between gap-2 mt-2 md:mt-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 md:gap-2 min-h-[18px] md:min-h-[24px]">
                      {ultMembers.map(m => (
                        <span key={m.name} className={`inline-flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 py-0.5 md:py-1 text-[8px] md:text-[10px] font-bold rounded-lg md:rounded-xl border max-w-full ${isUnstanned ? 'bg-korean-bg text-korean-muted border-korean-border' : 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm shadow-amber-200/30'}`}>
                          <Crown className="w-2 md:w-3 h-2 md:h-3 fill-current flex-shrink-0" /> <span className="max-w-[80px] md:max-w-none break-words leading-tight">{m.name}</span>
                        </span>
                      ))}
                      {biasMembers.length > 0 && (
                        <span className={`inline-flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 py-0.5 md:py-1 text-[8px] md:text-[10px] font-bold rounded-lg md:rounded-xl border ${isUnstanned ? 'bg-korean-bg text-korean-muted border-korean-border' : 'bg-korean-rose/5 text-korean-rose border-korean-rose/20 shadow-sm shadow-korean-rose/5'}`}>
                          <Heart className="w-2 md:w-3 h-2 md:h-3 fill-current" /> {biasMembers.length}
                        </span>
                      )}
                      {ultMembers.length === 0 && biasMembers.length === 0 && (
                        <span className="text-[8px] md:text-[10px] font-bold text-korean-muted py-0.5 md:py-1 flex items-center gap-1 md:gap-1.5">
                          <Users className="w-2.5 md:w-3.5 h-2.5 md:h-3.5" /> {group.members.length}
                        </span>
                      )}
                    </div>

                    {/* Content Actions (Separate from Title) */}
                    <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                         <button 
                          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                          className="p-1.5 md:p-3 text-korean-muted hover:text-korean-sage hover:bg-korean-bg rounded-xl md:rounded-2xl transition-all active:scale-90"
                          title="編輯內容"
                        >
                          <Pencil className="w-3.5 md:w-4.5 h-3.5 md:h-4.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }} 
                          className={`p-1.5 md:p-3 rounded-xl md:rounded-2xl transition-all active:scale-90 ${group.isExpanded ? 'bg-korean-sage text-white shadow-lg shadow-korean-sage/20' : 'text-korean-muted hover:text-korean-sage hover:bg-korean-bg'}`}
                          title={group.isExpanded ? "收合名單" : "展開名單"}
                        >
                          {group.isExpanded ? <ChevronUp className="w-3.5 md:w-5 h-3.5 md:h-5" /> : <ChevronDown className="w-3.5 md:w-5 h-3.5 md:h-5" />}
                        </button>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Sidebar: Structural Actions (Only in Sort Mode) */}
          {isSortMode && (
            <div className={`w-[48px] md:w-[56px] flex flex-col border-l border-korean-border divide-y divide-korean-border shrink-0 bg-korean-sage/5 animate-in slide-in-from-right duration-300`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); onMove(-1); }}
                    disabled={isFirst}
                    className="flex-1 flex items-center justify-center text-korean-sage hover:bg-white disabled:opacity-20 transition-all active:scale-95"
                    title="Move Up"
                >
                    <ArrowUp className="w-4 md:w-5 h-4 md:h-5" />
                </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onMove(1); }}
                    disabled={isLast}
                    className="flex-1 flex items-center justify-center text-korean-sage hover:bg-white disabled:opacity-20 transition-all active:scale-95"
                    title="Move Down"
                >
                    <ArrowDown className="w-4 md:w-5 h-4 md:h-5" />
                </button>
            </div>
          )}
      </div>

      {/* Grid */}
      {group.isExpanded && (
        <MemberGrid 
          group={group} 
          onToggleRank={onToggleRank} 
          onRemoveGroup={onRemove}
        />
      )}
    </div>
  );
});

GroupCard.displayName = 'GroupCard';
