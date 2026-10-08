
import React, { useMemo, useState } from 'react';
import { Copy, Heart, Crown, Filter } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Group } from '../types';

interface BiasListModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  isPage?: boolean;
}

export const BiasListModal: React.FC<BiasListModalProps> = ({ isOpen, onClose, groups, isPage }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'ult'>('all');
  
  const biasText = useMemo(() => {
    return groups
      .map(group => {
        // Filter members based on selected mode
        // all: rank 1 or 2
        // ult: rank 2 only
        const likedMembers = group.members.filter(m => {
            if (filterMode === 'ult') return m.rank === 2;
            return m.rank > 0;
        });

        if (likedMembers.length === 0) return null;
        
        return likedMembers
          .map(m => `[${group.name}] ${m.name}${m.cn ? `(${m.cn})` : ''}`)
          .join('\n');
      })
      .filter(Boolean)
      .join('\n');
  }, [groups, filterMode]);

  const handleCopy = () => {
    if (!biasText) return;
    navigator.clipboard.writeText(biasText).then(() => {
        alert("清單已複製到剪貼簿！");
    });
  };

  const content = (
    <div className={`flex flex-col ${isPage ? 'h-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-korean-border overflow-hidden' : 'h-full'}`}>
      {isPage && (
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-korean-border flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold text-korean-stone tracking-tight">我的本命清單</h2>
          <button onClick={onClose} className="p-2 md:p-2.5 bg-korean-bg hover:bg-korean-sand/30 rounded-xl md:rounded-2xl transition-all text-korean-muted active:scale-95">
            <Heart className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-korean-bg/30 space-y-4 md:space-y-6 custom-scrollbar">
        
        <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-korean-rose">
                <Heart className={`w-3.5 h-3.5 md:w-4 h-4 ${filterMode === 'all' ? 'fill-current' : ''}`} />
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]">
                    {filterMode === 'all' ? 'Full Bias List' : 'Ult Only List'}
                </span>
            </div>
            <div className="flex bg-white p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-korean-border shadow-sm">
                <button 
                    onClick={() => setFilterMode('all')}
                    className={`px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold rounded-lg md:rounded-xl transition-all ${filterMode === 'all' ? 'bg-korean-rose text-white shadow-lg shadow-korean-rose/20' : 'text-korean-muted hover:text-korean-stone'}`}
                >
                    全部
                </button>
                <button 
                    onClick={() => setFilterMode('ult')}
                    className={`px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold rounded-lg md:rounded-xl transition-all ${filterMode === 'ult' ? 'bg-korean-sand text-white shadow-lg shadow-korean-sand/20' : 'text-korean-muted hover:text-korean-stone'}`}
                >
                    CROWN
                </button>
            </div>
        </div>

        {biasText ? (
          <div className="relative animate-pop-in">
            <textarea 
              readOnly 
              className="w-full min-h-[200px] md:h-80 p-4 md:p-6 text-[13px] md:text-sm font-bold bg-white border border-korean-border rounded-[1.5rem] md:rounded-[2rem] focus:outline-none resize-none text-korean-stone/80 shadow-inner leading-relaxed transition-all custom-scrollbar" 
              value={biasText}
            />
            <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col gap-1.5 md:gap-2 opacity-30">
                {filterMode === 'all' && (
                    <div className="p-1.5 md:p-2 bg-korean-rose/10 rounded-lg md:rounded-xl">
                        <Heart className="w-3.5 h-3.5 md:w-4 h-4 text-korean-rose fill-current" />
                    </div>
                )}
                <div className="p-1.5 md:p-2 bg-korean-sand/10 rounded-lg md:rounded-xl">
                    <Crown className="w-3.5 h-3.5 md:w-4 h-4 text-korean-sand fill-current" />
                </div>
            </div>
          </div>
        ) : (
          <div className="h-40 md:h-48 flex flex-col items-center justify-center text-korean-muted text-[11px] md:text-sm border border-dashed border-korean-border rounded-[1.5rem] md:rounded-[2rem] bg-white animate-pop-in">
            <Filter className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 opacity-20" />
            <p className="font-bold tracking-tight">此篩選條件下無成員</p>
          </div>
        )}

        <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-korean-border shadow-sm">
            <h4 className="text-[9px] md:text-[10px] font-bold text-korean-muted uppercase tracking-widest mb-1.5 md:mb-2">目前顯示狀態</h4>
            <p className="text-[10px] md:text-[11px] text-korean-stone/70 leading-relaxed font-bold">
                {filterMode === 'all' ? (
                    <>正在顯示所有 <span className="text-korean-sand">CROWN</span> 與 <span className="text-korean-rose">HEART</span> 的成員。</>
                ) : (
                    <>僅顯示標註為 <span className="text-korean-sand">CROWN</span> 的最高等級成員。</>
                )}
            </p>
        </div>
      </div>
      
      <div className="p-4 md:p-6 border-t border-korean-border bg-white rounded-b-[2rem] md:rounded-b-[2.5rem] shrink-0">
        <button 
          onClick={handleCopy}
          disabled={!biasText}
          className={`w-full py-3.5 md:py-4 rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl disabled:opacity-50 text-white text-sm md:text-base
            ${filterMode === 'ult' ? 'bg-korean-sand shadow-korean-sand/20 hover:bg-korean-sand/90' : 'bg-korean-stone shadow-korean-stone/20 hover:bg-korean-stone/90'}
          `}
        >
          <Copy className="w-4.5 h-4.5 md:w-5 md:h-5" /> 一鍵複製清單
        </button>
        {!isPage && (
          <button onClick={onClose} className="w-full py-2.5 mt-1 text-korean-muted text-[11px] md:text-xs font-bold hover:text-korean-stone transition-colors uppercase tracking-widest">Back</button>
        )}
      </div>
    </div>
  );

  if (isPage) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="我的本命清單">
      {content}
    </Modal>
  );
};
