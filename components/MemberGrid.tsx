
import React from 'react';
import { Crown, Heart, Trash2 } from 'lucide-react';
import { Member, Group } from '../types';

interface MemberGridProps {
  group: Group;
  onToggleRank: (member: Member) => void;
  onRemoveGroup: () => void;
}

export const MemberGrid: React.FC<MemberGridProps> = React.memo(({ group, onToggleRank, onRemoveGroup }) => {
  // Sorting: Rank 2 -> Rank 1 -> Rank 0
  const sortedMembers = [...group.members].sort((a, b) => b.rank - a.rank);

  return (
    <div className="p-4 md:p-8 pt-0 border-t border-korean-border bg-korean-bg/10">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
        {sortedMembers.map((member) => (
          <div
            key={member.name}
            onClick={() => onToggleRank(member)}
            className={`
              relative flex flex-col items-center justify-center p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.5rem] border min-h-[80px] md:min-h-[90px] text-center select-none bg-white overflow-hidden
              transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-korean-sage/5
              ${member.rank === 2 ? 'bg-korean-sand/5 border-korean-sand/20 shadow-sm' : ''}
              ${member.rank === 1 ? 'bg-korean-rose/5 border-korean-rose/20 shadow-sm' : ''}
              ${member.rank === 0 ? 'border-korean-border text-korean-stone hover:border-korean-sage/30' : ''}
            `}
          >
            <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2">
              {member.rank === 2 && <Crown className="w-3.5 h-3.5 md:w-4 h-4 text-korean-sand fill-current" />}
              {member.rank === 1 && <Heart className="w-3.5 h-3.5 md:w-4 h-4 text-korean-rose fill-current" />}
            </div>
            
            <span className={`text-xs md:text-sm font-bold leading-tight w-full px-1 break-words
               ${member.rank === 2 ? 'text-korean-sand' : member.rank === 1 ? 'text-korean-rose' : 'text-korean-stone'}
            `}>
              {member.name}
            </span>
            
            {member.cn && (
              <span className="text-[10px] text-korean-muted mt-0.5 w-full px-1 font-bold break-words leading-tight">
                {member.cn}
              </span>
            )}
          </div>
        ))}
      </div>
      
      <button 
        type="button"
        onClick={onRemoveGroup}
        className="w-full mt-8 py-3.5 text-xs text-korean-rose/40 hover:text-korean-rose hover:bg-korean-rose/5 rounded-2xl transition-all flex justify-center items-center gap-2 active:scale-95 font-bold uppercase tracking-widest"
      >
        <Trash2 className="w-4 h-4" />
        移除團體
      </button>
    </div>
  );
});

MemberGrid.displayName = 'MemberGrid';
