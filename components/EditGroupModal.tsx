
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload, Plus, Trash2, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Group, Member, TimelineEvent, EventType } from '../types';
import { compressImage } from '../utils';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onSave: (groupId: string, members: Member[], logoUrl: string, timeline: TimelineEvent[]) => void;
  isPage?: boolean;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({ isOpen, onClose, group, onSave, isPage }) => {
  const [memberString, setMemberString] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  // Timeline State
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (group && isOpen) {
      const str = group.members.map(m => m.cn ? `${m.name}(${m.cn})` : m.name).join(', ');
      setMemberString(str);
      setLogoUrl(group.logoUrl || '');
      setError(null);

      // Initialize timeline
      if (group.timeline && group.timeline.length > 0) {
        setTimeline([...group.timeline]);
      } else {
        const initialEvents: TimelineEvent[] = [];
        if (group.stanDate) {
          initialEvents.push({ date: group.stanDate, type: 'stan' });
        }
        if (group.unstanDate) {
          initialEvents.push({ date: group.unstanDate, type: 'unstan' });
        }
        setTimeline(initialEvents);
      }
    }
  }, [group, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      setLogoUrl(dataUrl);
    } catch (error) {
      console.error("Image compression failed", error);
      alert("圖片處理失敗，請重試");
    }
  };

  // --- Timeline Logic Helpers ---

  // Sort events by date for logic checking
  const getSortedTimeline = (currentTimeline: TimelineEvent[]) => {
    return [...currentTimeline].sort((a, b) => a.date.localeCompare(b.date));
  };

  const addEvent = () => {
    setError(null);
    const sorted = getSortedTimeline(timeline);
    const lastEvent = sorted[sorted.length - 1];
    
    // Smart Suggestion Logic
    let nextType: EventType = 'stan';
    let nextDate = '';

    if (lastEvent) {
       // Default date to current month
       const now = new Date();
       const year = now.getFullYear();
       const month = String(now.getMonth() + 1).padStart(2, '0');
       nextDate = `${year}-${month}`;

       // Suggest type based on last state
       if (lastEvent.type === 'stan' || lastEvent.type === 'restan') {
           nextType = 'fade'; // Active -> Fade
       } else if (lastEvent.type === 'fade') {
           nextType = 'unstan'; // Fade -> Unstan
       } else if (lastEvent.type === 'unstan') {
           nextType = 'restan'; // Unstan -> Restan
       }
    }

    setTimeline(prev => [...prev, { date: nextDate, type: nextType }]);
  };

  const removeEvent = (index: number) => {
    setTimeline(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const updateEvent = (index: number, field: keyof TimelineEvent, value: string) => {
    setTimeline(prev => prev.map((ev, i) => i === index ? { ...ev, [field]: value } : ev));
    setError(null);
  };

  const validateTimeline = (events: TimelineEvent[]): string | null => {
    if (events.length === 0) return null;
    
    // 1. Check for empty dates
    if (events.some(e => !e.date)) return "所有節點都必須設定日期";

    const sorted = getSortedTimeline(events);

    // 2. First event must be 'stan'
    if (sorted[0].type !== 'stan') {
        return `時間軸起始錯誤：${sorted[0].date} 的事件必須是「入坑」`;
    }

    // 3. Logic flow check
    // States: 0=Inactive, 1=Active(Stan/Restan), 2=Faded
    let currentState = 1; // Started with stan

    for (let i = 1; i < sorted.length; i++) {
        const evt = sorted[i];
        const prev = sorted[i-1];
        
        // Prevent duplicate dates causing confusion (optional, but good for logic)
        if (evt.date === prev.date) return `${evt.date} 有重複的時間點，請合併或修正日期`;

        if (currentState === 1) { // Currently Active
            if (evt.type === 'stan') return `${evt.date} 錯誤：已經在坑底了，不需再次「入坑」`;
            if (evt.type === 'restan') return `${evt.date} 錯誤：目前是活躍狀態，不需「回坑」`;
            
            if (evt.type === 'fade') currentState = 2;
            else if (evt.type === 'unstan') currentState = 0;
        } 
        else if (currentState === 2) { // Currently Faded
            if (evt.type === 'stan') return `${evt.date} 錯誤：若要恢復熱度，請選擇「回坑」`;
            if (evt.type === 'fade') return `${evt.date} 錯誤：已經是淡坑狀態`;
            
            if (evt.type === 'restan') currentState = 1;
            else if (evt.type === 'unstan') currentState = 0;
        }
        else if (currentState === 0) { // Currently Unstanned
            if (evt.type === 'fade') return `${evt.date} 錯誤：已經退坑了，無法「淡坑」`;
            if (evt.type === 'unstan') return `${evt.date} 錯誤：已經退坑了，無法再次「退坑」`;
            
            if (evt.type === 'stan' || evt.type === 'restan') currentState = 1;
        }
    }

    return null;
  };

  const handleSave = () => {
    if (!group) return;

    const validationError = validateTimeline(timeline);
    if (validationError) {
        setError(validationError);
        return;
    }

    // Parse member string
    const list = memberString.split(/,|，|\n/).map(s => s.trim()).filter(s => s);
    const newMembers: Member[] = list.map(item => {
      const match = item.match(/^(.*?)\s*[\(（](.*?)[\)）]/);
      let name = item;
      let cn = '';
      if (match) {
        name = match[1];
        cn = match[2];
      }
      
      const oldMember = group.members.find(m => m.name === name);
      return { name, cn, rank: oldMember ? oldMember.rank : 0 };
    });

    const cleanTimeline = getSortedTimeline(timeline);
    onSave(group.id, newMembers, logoUrl, cleanTimeline);
    onClose();
  };

  const content = (
    <div className={`flex flex-col ${isPage ? 'h-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-korean-border overflow-hidden' : 'h-full'}`}>
      {isPage && (
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-korean-border flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold text-korean-stone tracking-tight">編輯團體詳細資訊</h2>
          <button onClick={onClose} className="p-2 bg-korean-bg hover:bg-korean-sand/30 rounded-xl md:rounded-2xl transition-all text-korean-muted active:scale-95">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-korean-bg/30 space-y-4 md:space-y-6 custom-scrollbar">
        
        {/* Logo Section */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-korean-border space-y-4 shadow-sm">
          <label className="text-[10px] md:text-xs font-bold text-korean-muted flex items-center gap-2 uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" /> 團體徽標 (Logo)
          </label>
          <div className="flex items-center gap-4 md:gap-6">
             {logoUrl ? (
               <img src={logoUrl} alt="Preview" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-white shadow-md" />
             ) : (
               <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-korean-bg flex items-center justify-center text-korean-muted/30">
                 <ImageIcon className="w-8 h-8 md:w-10 md:h-10" />
               </div>
             )}
             <div className="flex-1 space-y-3">
                <label className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-korean-sage text-white rounded-xl text-[10px] md:text-xs font-bold cursor-pointer hover:bg-korean-sage/90 transition-all w-fit shadow-sm shadow-korean-sage/20 active:scale-95">
                   <Upload className="w-3.5 h-3.5" /> 上傳圖片
                   <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <input 
                  type="text" 
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="或貼上圖片網址..."
                  className="w-full p-2.5 md:p-3 bg-korean-bg/50 rounded-xl border border-korean-border text-[10px] md:text-xs text-korean-stone focus:ring-2 focus:ring-korean-sage/20 focus:border-korean-sage outline-none transition-all placeholder:text-korean-muted/50"
                />
             </div>
          </div>
        </div>

        {/* Timeline Editor Section */}
        <div className={`bg-white p-4 md:p-6 rounded-2xl border transition-all shadow-sm ${error ? 'border-korean-rose/30 ring-4 ring-korean-rose/5' : 'border-korean-border'}`}>
            <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] md:text-xs font-bold text-korean-muted flex items-center gap-2 uppercase tracking-wider">
                    追星歷程
                    <Info className="w-3.5 h-3.5 text-korean-muted/30" />
                </label>
                <button onClick={addEvent} className="text-[10px] md:text-xs bg-korean-bg text-korean-sage px-2.5 md:px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 hover:bg-korean-sand/30 transition-all active:scale-95 border border-korean-sage/10">
                    <Plus className="w-3.5 h-3.5" /> 新增
                </button>
            </div>
            
            {error && (
                <div className="mb-4 p-3 bg-korean-rose/5 text-korean-rose text-[10px] md:text-xs rounded-xl flex items-start gap-3 animate-shake border border-korean-rose/10">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div className="space-y-3 relative">
                 {/* Logic connection line visual (simplified) */}
                 {timeline.length > 1 && (
                     <div className="absolute left-[44px] md:left-[54px] top-4 bottom-4 w-0.5 bg-korean-bg -z-0" />
                 )}

                {timeline.length === 0 && (
                    <div className="text-center py-8 md:py-10 text-korean-muted/50 text-[10px] md:text-xs bg-korean-bg/30 rounded-2xl border border-dashed border-korean-border">
                        點擊「新增」設定入坑時間
                    </div>
                )}
                
                {timeline.map((event, index) => (
                    <div key={index} className="flex gap-2 md:gap-3 items-center animate-pop-in relative z-10">
                        <input 
                            type="month" 
                            value={event.date}
                            onChange={(e) => updateEvent(index, 'date', e.target.value)}
                            className="w-[100px] md:w-[120px] p-2.5 md:p-3 bg-korean-bg/50 border border-korean-border rounded-xl text-[10px] md:text-xs font-mono text-korean-stone focus:border-korean-sage focus:ring-2 focus:ring-korean-sage/10 outline-none transition-all"
                        />
                        <select
                            value={event.type}
                            onChange={(e) => updateEvent(index, 'type', e.target.value as EventType)}
                            className={`flex-1 p-2.5 md:p-3 border border-korean-border rounded-xl text-[10px] md:text-xs font-bold outline-none cursor-pointer transition-all
                                ${event.type === 'stan' ? 'text-korean-sage bg-korean-sage/5 border-korean-sage/20' : ''}
                                ${event.type === 'restan' ? 'text-korean-sage bg-korean-sage/5 border-korean-sage/20' : ''}
                                ${event.type === 'fade' ? 'text-korean-stone bg-korean-bg/50 border-korean-border' : ''}
                                ${event.type === 'unstan' ? 'text-korean-muted bg-korean-bg/30 border-korean-border opacity-70' : ''}
                            `}
                        >
                            <option value="stan">入坑</option>
                            <option value="fade">淡坑</option>
                            <option value="restan">回坑</option>
                            <option value="unstan">退坑</option>
                        </select>
                        <button 
                            onClick={() => removeEvent(index)}
                            className="p-2.5 md:p-3 text-korean-muted/30 hover:text-korean-rose hover:bg-korean-rose/5 rounded-xl transition-all active:scale-75"
                            title="移除節點"
                        >
                            <Trash2 className="w-4 h-4 md:w-4.5 md:h-4.5" />
                        </button>
                    </div>
                ))}
            </div>
             {timeline.length > 0 && (
                <div className="mt-3 text-[10px] text-korean-muted font-bold flex items-center gap-1.5 justify-end px-1 italic">
                    <ArrowRight className="w-3 h-3" /> 系統會自動驗證邏輯並排序
                </div>
            )}
        </div>

        {/* Members */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-korean-border space-y-3 shadow-sm">
          <label className="text-[10px] md:text-xs font-bold text-korean-muted uppercase tracking-wider">成員名單 (英文, 中文)</label>
          <textarea 
            value={memberString}
            onChange={(e) => setMemberString(e.target.value)}
            className="w-full min-h-[120px] md:h-48 p-3 md:p-4 bg-korean-bg/50 border border-korean-border rounded-2xl text-[13px] md:text-sm text-korean-stone focus:ring-2 focus:ring-korean-sage/20 focus:border-korean-sage outline-none resize-none font-mono transition-all placeholder:text-korean-muted/30 leading-relaxed" 
            placeholder="成員A(中文名), 成員B, 成員C..."
          />
        </div>
      </div>
      <div className="p-4 md:p-6 border-t border-korean-border bg-white rounded-b-[2rem] md:rounded-b-[2.5rem] space-y-3">
        <button 
          onClick={handleSave} 
          className="w-full bg-korean-sage text-white py-3.5 md:py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-korean-sage/20 hover:bg-korean-sage/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          disabled={!!error}
        >
          儲存變更
        </button>
        {!isPage && (
          <button onClick={onClose} className="w-full py-2 text-korean-muted text-[11px] md:text-sm font-bold hover:text-korean-stone transition-colors">返回</button>
        )}
      </div>
    </div>
  );

  if (isPage) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="編輯團體詳細資訊">
      {content}
    </Modal>
  );
};
