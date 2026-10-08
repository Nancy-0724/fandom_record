import React, { useState, useEffect } from 'react';
import { Save, Music, HeartHandshake, Sparkles, Frown, Users, BookOpen, ChevronDown, Check } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Group, GroupDetails } from '../types';

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onSave: (groupId: string, details: GroupDetails) => void;
  isPage?: boolean;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({ isOpen, onClose, group, onSave, isPage }) => {
  const [details, setDetails] = useState<GroupDetails>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (group && isOpen) {
      setDetails(group.details || {});
      setOpenDropdown(null);
    }
  }, [group, isOpen]);

  const handleChange = (key: keyof GroupDetails, value: string) => {
    setDetails(prev => ({ ...prev, [key]: value }));
  };

  const toggleMultiSelect = (key: keyof GroupDetails, name: string) => {
    const currentValues = details[key] ? details[key]!.split(', ').filter(v => v) : [];
    let newValues;
    if (currentValues.includes(name)) {
      newValues = currentValues.filter(v => v !== name);
    } else {
      newValues = [...currentValues, name];
    }
    handleChange(key, newValues.join(', '));
  };

  const memberNames = group?.members.map(m => m.cn || m.name) || [];

  const handleSave = () => {
    if (group) {
      onSave(group.id, details);
      onClose();
    }
  };

  // Helper for input fields
  const renderInput = (
    key: keyof GroupDetails, 
    label: string, 
    icon: React.ReactNode, 
    placeholder: string,
    isTextArea: boolean = false
  ) => (
    <div className="bg-white p-4 rounded-2xl border border-korean-border shadow-sm transition-all focus-within:border-korean-sage focus-within:ring-4 focus-within:ring-korean-sage/5">
      <label className="text-xs font-bold text-korean-muted mb-2 flex items-center gap-2 uppercase tracking-wider">
        {icon} {label}
      </label>
      {isTextArea ? (
        <textarea
          value={details[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-korean-muted/30 text-korean-stone leading-relaxed"
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          type="text"
          value={details[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full text-sm bg-transparent outline-none placeholder:text-korean-muted/30 text-korean-stone font-medium"
          placeholder={placeholder}
        />
      )}
    </div>
  );

  const renderSelect = (
    key: keyof GroupDetails, 
    label: string, 
    icon: React.ReactNode, 
    options: string[],
    openUp: boolean = false
  ) => {
    const isOpen = openDropdown === key;
    return (
      <div className="relative">
        <div 
          onClick={() => setOpenDropdown(isOpen ? null : key)}
          className={`bg-white p-4 rounded-2xl border shadow-sm transition-all cursor-pointer ${isOpen ? 'border-korean-sage ring-4 ring-korean-sage/5' : 'border-korean-border hover:border-korean-sage'}`}
        >
          <label className="text-xs font-bold text-korean-muted mb-2 flex items-center gap-2 uppercase tracking-wider">
            {icon} {label}
          </label>
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium truncate ${details[key] ? 'text-korean-stone' : 'text-korean-muted/30'}`}>
              {details[key] || '選擇成員...'}
            </span>
            <ChevronDown className={`w-4 h-4 text-korean-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
            <div className={`absolute z-50 w-full bg-white border border-korean-border rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 animate-in fade-in zoom-in duration-200 ${openUp ? 'bottom-full mb-2 origin-bottom' : 'mt-2 origin-top'}`}>
              <div 
                onClick={() => { handleChange(key, ''); setOpenDropdown(null); }}
                className="px-4 py-2.5 text-sm text-korean-muted hover:bg-korean-bg cursor-pointer transition-colors"
              >
                (未選擇)
              </div>
              {options.map(name => (
                <div 
                  key={name}
                  onClick={() => { handleChange(key, name); setOpenDropdown(null); }}
                  className={`px-4 py-2.5 text-sm hover:bg-korean-bg cursor-pointer transition-colors flex justify-between items-center ${details[key] === name ? 'text-korean-sage font-bold bg-korean-sage/5' : 'text-korean-stone'}`}
                >
                  {name}
                  {details[key] === name && <Check className="w-3.5 h-3.5" />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMultiSelect = (
    key: keyof GroupDetails, 
    label: string, 
    icon: React.ReactNode, 
    options: string[],
    openUp: boolean = false
  ) => {
    const isOpen = openDropdown === key;
    const selected = details[key] ? details[key]!.split(', ').filter(v => v) : [];
    
    return (
      <div className="relative">
        <div 
          onClick={() => setOpenDropdown(isOpen ? null : key)}
          className={`bg-white p-4 rounded-2xl border shadow-sm transition-all cursor-pointer ${isOpen ? 'border-korean-sage ring-4 ring-korean-sage/5' : 'border-korean-border hover:border-korean-sage'}`}
        >
          <label className="text-xs font-bold text-korean-muted mb-2 flex items-center gap-2 uppercase tracking-wider">
            {icon} {label}
          </label>
          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {selected.length > 0 ? (
                selected.map(s => (
                  <span 
                    key={s} 
                    onClick={(e) => { e.stopPropagation(); toggleMultiSelect(key, s); }}
                    className="bg-korean-sage/10 text-korean-sage text-[10px] px-2 py-0.5 rounded-full font-bold border border-korean-sage/20 hover:bg-korean-sage/20 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {s}
                    <span className="opacity-50 hover:opacity-100">×</span>
                  </span>
                ))
              ) : (
                <span className="text-sm text-korean-muted/30">選擇成員 (多選)...</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-korean-muted transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
            <div className={`absolute z-50 w-full bg-white border border-korean-border rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 animate-in fade-in zoom-in duration-200 ${openUp ? 'bottom-full mb-2 origin-bottom' : 'mt-2 origin-top'}`}>
              {options.map(name => {
                const isSelected = selected.includes(name);
                return (
                  <div 
                    key={name}
                    onClick={() => toggleMultiSelect(key, name)}
                    className={`px-4 py-2.5 text-sm hover:bg-korean-bg cursor-pointer transition-colors flex justify-between items-center ${isSelected ? 'text-korean-sage font-bold bg-korean-sage/5' : 'text-korean-stone'}`}
                  >
                    {name}
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                );
              })}
              {options.length === 0 && (
                <div className="px-4 py-3 text-xs text-korean-muted text-center italic">暫無成員資料</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const content = (
    <div className={`flex flex-col ${isPage ? 'h-full bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-korean-border overflow-hidden' : 'h-full'}`}>
      {isPage && (
        <div className="px-4 md:px-8 py-4 md:py-6 border-b border-korean-border flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold text-korean-stone tracking-tight truncate mr-2">{`關於 ${group?.name || '團體'} 的詳細筆記`}</h2>
          <button onClick={onClose} className="p-2 md:p-2.5 bg-korean-bg hover:bg-korean-sand/30 rounded-xl md:rounded-2xl transition-all text-korean-muted active:scale-95 shrink-0">
            <Save className="w-4.5 md:w-5 h-4.5 md:h-5" />
          </button>
        </div>
      )}
      <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-korean-bg/30 space-y-3 md:space-y-4 no-scrollbar pb-32">
        
        {renderInput('reason', '入坑契機', <BookOpen className="w-3 md:w-3.5 h-3 md:h-3.5 text-korean-sage" />, '描述你是如何入坑的...', true)}
        
        <div className="grid grid-cols-1 gap-3 md:gap-4">
            {renderInput('topSong', '仙曲 TOP 1', <Music className="w-3 md:w-3.5 h-3 md:h-3.5 text-korean-rose" />, '這團必聽的一首歌')}
            {renderSelect('visual', '最 Get 的顏', <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 text-korean-sand" />, memberNames)}
            {renderMultiSelect('favSubUnit', '最喜歡的小分隊', <Users className="w-3 md:w-3.5 h-3 md:h-3.5 text-korean-sage/60" />, memberNames)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {renderMultiSelect('favShip', '最嗑的 CP', <HeartHandshake className="w-3 md:w-3.5 h-3 md:h-3.5 text-korean-rose/60" />, memberNames, true)}
            {renderMultiSelect('leastShip', '最雷的 CP', <Frown className="w-3 md:w-3.5 h-3 md:h-3.5 text-korean-muted" />, memberNames, true)}
        </div>

      </div>
      <div className="p-4 md:p-6 border-t border-korean-border bg-white rounded-b-[1.5rem] md:rounded-b-[2.5rem] space-y-3">
        <button 
          onClick={handleSave} 
          className="w-full bg-korean-sage text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-korean-sage/20 hover:bg-korean-sage/90 flex items-center justify-center gap-2"
        >
          <Save className="w-4 md:w-4.5 h-4 md:h-4.5" /> 儲存筆記
        </button>
        {!isPage && (
          <button onClick={onClose} className="w-full py-2 text-korean-muted text-sm font-bold hover:text-korean-stone transition-colors">返回</button>
        )}
      </div>
    </div>
  );

  if (isPage) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`關於 ${group?.name || '團體'} 的詳細筆記`}>
      {content}
    </Modal>
  );
};