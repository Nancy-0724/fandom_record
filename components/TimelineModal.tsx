
import React, { useMemo } from 'react';
import { CalendarClock, Users, LogIn, LogOut, RefreshCcw, CloudFog } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Group, TimelineEvent } from '../types';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  isPage?: boolean;
}

interface TimelinePhase {
  groupId: string;
  groupName: string;
  groupLogo?: string;
  type: 'stan' | 'restan';
  date: string;
  statusEvent?: TimelineEvent;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ isOpen, onClose, groups, isPage }) => {
  
  const sortedPhases = useMemo(() => {
    let allPhases: TimelinePhase[] = [];

    groups.forEach(group => {
      const timeline = [...(group.timeline || [])].sort((a, b) => a.date.localeCompare(b.date));
      
      let currentPhase: TimelinePhase | null = null;

      if (timeline.length > 0) {
        timeline.forEach(evt => {
          if (evt.type === 'stan' || evt.type === 'restan') {
            if (currentPhase) allPhases.push(currentPhase);
            currentPhase = {
              groupId: group.id,
              groupName: group.name,
              groupLogo: group.logoUrl,
              type: evt.type,
              date: evt.date
            };
          } else if (evt.type === 'fade' || evt.type === 'unstan') {
            if (currentPhase) {
              currentPhase.statusEvent = evt;
            }
          }
        });
        if (currentPhase) allPhases.push(currentPhase);
      } else if (group.stanDate) {
        // Fallback for groups without timeline array
        allPhases.push({
          groupId: group.id,
          groupName: group.name,
          groupLogo: group.logoUrl,
          type: 'stan',
          date: group.stanDate,
          statusEvent: group.unstanDate ? { date: group.unstanDate, type: 'unstan' } : undefined
        });
      }
    });

    // Sort by Phase start date descending
    return allPhases.sort((a, b) => b.date.localeCompare(a.date));
  }, [groups]);

  const getEventIcon = (type: string) => {
      switch (type) {
          case 'stan': return <LogIn className="w-3 h-3" />;
          case 'restan': return <RefreshCcw className="w-3 h-3" />;
          case 'fade': return <CloudFog className="w-3 h-3" />;
          case 'unstan': return <LogOut className="w-3 h-3" />;
          default: return <Users className="w-3 h-3" />;
      }
  };

  const getEventStyle = (type: string) => {
    switch (type) {
        case 'stan': 
        case 'restan': 
            return {
                bg: 'bg-korean-bg/50',
                border: 'border-korean-sage/20',
                text: 'text-korean-sage',
                badge: 'bg-korean-sage text-white',
                dot: 'bg-korean-sage'
            };
        case 'fade': 
            return {
                bg: 'bg-korean-bg/30',
                border: 'border-korean-sand/30',
                text: 'text-korean-sand',
                badge: 'bg-korean-sand text-white',
                dot: 'bg-korean-sand'
            };
        case 'unstan': 
            return {
                bg: 'bg-korean-bg/20',
                border: 'border-korean-border',
                text: 'text-korean-muted',
                badge: 'bg-korean-sand/50 text-korean-stone',
                dot: 'bg-korean-sand/50'
            };
        default: 
            return {
                bg: 'bg-white',
                border: 'border-korean-border',
                text: 'text-korean-stone',
                badge: 'bg-korean-bg text-korean-muted',
                dot: 'bg-korean-border'
            };
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
        case 'stan': return '入坑';
        case 'restan': return '回坑';
        case 'fade': return '淡坑';
        case 'unstan': return '退坑';
        default: return '紀錄';
    }
  };

  const content = (
    <div className={`flex flex-col ${isPage ? 'h-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-korean-border overflow-hidden' : 'h-full'}`}>
      {isPage && (
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-korean-border flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold text-korean-stone tracking-tight">追星歷史軌跡</h2>
          <button onClick={onClose} className="p-2 md:p-2.5 bg-korean-bg hover:bg-korean-sand/30 rounded-xl md:rounded-2xl transition-all text-korean-muted active:scale-95">
            <CalendarClock className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-korean-bg/30 custom-scrollbar">
        
        {sortedPhases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 md:py-20">
            <CalendarClock className="w-12 h-12 md:w-16 md:h-16 text-korean-sand/30 mb-3 md:mb-4" />
            <p className="text-korean-stone font-bold text-base md:text-lg">還沒有時間軸資料</p>
            <p className="text-[11px] md:text-sm text-korean-muted mt-1.5 md:mt-2">請在編輯團體時新增「時間軸節點」</p>
          </div>
        ) : (
          <div className="relative pl-4 md:pl-6 space-y-6 md:space-y-8 my-2 md:my-4">
            {/* Vertical Line */}
            <div className="absolute left-[19px] md:left-[31px] top-2 bottom-2 w-0.5 bg-korean-border"></div>

            {/* Now Indicator */}
             <div className="relative flex items-center gap-3 md:gap-4 pb-2 md:pb-4">
                 <div className="absolute left-[15px] md:left-[27px] w-2 md:w-2.5 h-2 md:h-2.5 bg-korean-sage rounded-full z-10 animate-pulse ring-4 ring-korean-sage/20"></div>
                 <div className="ml-8 md:ml-12 text-[10px] md:text-xs text-korean-sage font-bold uppercase tracking-widest">
                    現在 (Now)
                 </div>
            </div>

            {sortedPhases.map((phase, index) => {
                const style = getEventStyle(phase.type);
                const statusStyle = phase.statusEvent ? getEventStyle(phase.statusEvent.type) : null;
                
                return (
                  <div key={`${phase.groupId}-${phase.date}-${phase.type}`} className="relative flex items-center gap-3 md:gap-4 animate-pop-in" style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}>
                    
                    {/* Node Dot */}
                    <div className={`absolute left-[15px] md:left-[27px] w-2 md:w-2.5 h-2 md:h-2.5 rounded-full ring-4 ring-white shadow-sm z-10 ${style.dot}`}></div>

                    {/* Content Card */}
                    <div className={`ml-8 md:ml-12 flex-1 p-3 md:p-4 rounded-[1.25rem] md:rounded-[1.5rem] border shadow-sm flex items-center gap-3 md:gap-4 active:scale-[0.98] transition-all ${style.bg} ${style.border}`}>
                       
                       {/* Logo */}
                       <div className="flex-shrink-0 relative">
                          {phase.groupLogo ? (
                            <img 
                              src={phase.groupLogo} 
                              alt={phase.groupName} 
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover border bg-white ${style.border}`}
                            />
                          ) : (
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white flex items-center justify-center border ${style.border}`}>
                               <Users className={`w-5 h-5 md:w-6 md:h-6 ${style.text}`} />
                            </div>
                          )}
                       </div>

                       {/* Info */}
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5 md:mb-1">
                            <div className="text-[10px] md:text-[11px] font-bold text-korean-muted font-mono tracking-tight">
                                {phase.date}
                            </div>
                            <span className={`text-[9px] md:text-[10px] px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg md:rounded-xl font-bold flex items-center gap-1 shadow-sm ${style.badge}`}>
                                {getEventIcon(phase.type)} {getEventLabel(phase.type)}
                            </span>
                          </div>
                          
                          <div className="text-sm md:text-base font-bold text-korean-stone leading-tight break-words">
                            {phase.groupName}
                          </div>

                          {/* Status Note */}
                          {phase.statusEvent && statusStyle && (
                            <div className="mt-2 flex items-center gap-2">
                               <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1.5 border ${statusStyle.badge} ${statusStyle.border} opacity-90`}>
                                  {getEventIcon(phase.statusEvent.type)}
                                  <span>{getEventLabel(phase.statusEvent.type)} ({phase.statusEvent.date})</span>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                );
            })}
            
            {/* Start Node */}
            <div className="relative flex items-center gap-3 md:gap-4 pt-2 md:pt-4">
                 <div className="absolute left-[16px] md:left-[28px] w-1.5 md:w-2 h-1.5 md:h-2 bg-korean-sand/50 rounded-full z-10"></div>
                 <div className="ml-8 md:ml-12 text-[10px] md:text-xs text-korean-muted font-bold uppercase tracking-widest">
                    旅程起點
                 </div>
            </div>
          </div>
        )}

      </div>
      {!isPage && (
        <div className="p-4 border-t border-korean-border bg-white rounded-b-[2rem] md:rounded-b-[2.5rem]">
          <button onClick={onClose} className="w-full py-2.5 text-korean-muted text-sm font-bold hover:text-korean-stone transition-colors">關閉</button>
        </div>
      )}
    </div>
  );

  if (isPage) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="追星歷史軌跡">
      {content}
    </Modal>
  );
};
