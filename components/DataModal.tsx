
import React, { useState } from 'react';
import { Copy, Download, AlertCircle, Cloud, CloudUpload, CloudDownload, Loader2, CheckCircle2, ShieldCheck, AlertTriangle, Trash2, Zap } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Group } from '../types';

// 硬編碼您的專屬 GAS URL
const FIXED_GAS_URL = 'https://script.google.com/macros/s/AKfycbzXf-TAPJ9u_jyDbTAkZXQC-rA5riv0JLVzC5aYpBPkEm4oHEmA0z3JxwRJ8JOkYDZXKw/exec';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Group[];
  onImport: (data: Group[]) => void;
  onReset: () => void;
  isPage?: boolean;
}

export const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose, data, onImport, onReset, isPage }) => {
  const [importStr, setImportStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const exportStr = JSON.stringify(data);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportStr).then(() => {
        alert("已複製到剪貼簿！");
    });
  };

  const handleImport = () => {
    setErrorMsg('');
    try {
      if (!importStr.trim()) throw new Error("內容為空");
      const parsed = JSON.parse(importStr);
      if (!Array.isArray(parsed)) throw new Error("資料格式錯誤 (須為陣列)");
      onImport(parsed as Group[]);
      onClose();
      setImportStr('');
    } catch (e: any) {
      setErrorMsg(e.message || "匯入失敗");
    }
  };

  const handleCloudAction = async (type: 'upload' | 'download') => {
    setErrorMsg('');
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      if (type === 'upload') {
        if (exportStr.length > 50000) {
          if (!window.confirm("警告：資料大小已超過 50,000 字元，備份到 Google Sheets 可能會被截斷導致資料毀損。是否仍要嘗試？")) {
            setIsSyncing(false);
            return;
          }
        }

        await fetch(FIXED_GAS_URL, {
          method: 'POST',
          mode: 'no-cors', 
          body: exportStr,
          headers: { 'Content-Type': 'application/json' }
        });
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        const response = await fetch(FIXED_GAS_URL);
        const rawText = await response.text();
        
        let cloudData;
        try {
          cloudData = JSON.parse(rawText);
        } catch (e) {
          console.error("JSON Parse Error:", rawText);
          throw new Error('雲端資料不完整或已毀損（可能超過試算表 50,000 字元限制）。');
        }

        if (Array.isArray(cloudData)) {
          // 這裡僅將原始陣列傳回 App，由 handleImport 統一做深度清洗
          onImport(cloudData);
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
          throw new Error('雲端資料格式不正確');
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || "同步失敗");
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const content = (
    <div className={`flex flex-col ${isPage ? 'h-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-korean-border overflow-hidden' : 'h-full'}`}>
      {isPage && (
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-korean-border flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold text-korean-stone tracking-tight">資料管理中心</h2>
        </div>
      )}

      <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-korean-bg/30 min-h-[400px] custom-scrollbar space-y-8 md:space-y-10">
        {/* Zone 1: Cloud Sync */}
        <section className="space-y-4 md:space-y-6 animate-pop-in">
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-korean-sage/10 rounded-lg md:rounded-xl flex items-center justify-center text-korean-sage">
              <Cloud className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-[13px] md:text-sm font-bold text-korean-stone tracking-tight">雲端同步服務</h3>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-korean-border shadow-sm space-y-4 md:space-y-6">
            <div className="bg-korean-sage/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-korean-sage/10 flex items-center gap-3 md:gap-4">
               <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center text-korean-sage shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
               </div>
               <div>
                  <h4 className="text-[11px] md:text-xs font-bold text-korean-stone flex items-center gap-2">
                    即時同步已啟用 <Zap className="w-3 h-3 fill-korean-sage animate-pulse" />
                  </h4>
                  <p className="text-[9px] md:text-[10px] text-korean-muted font-medium mt-0.5">系統將自動備份您的變更至 Google Sheets</p>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <button 
                onClick={() => handleCloudAction('upload')}
                disabled={isSyncing}
                className="flex items-center gap-3 p-3.5 md:p-4 bg-korean-bg border border-korean-border rounded-xl md:rounded-2xl hover:border-korean-sage/30 hover:bg-white transition-all active:scale-95 disabled:opacity-50 group"
              >
                <CloudUpload className={`w-4.5 h-4.5 md:w-5 md:h-5 ${isSyncing ? 'text-korean-muted/30' : 'text-korean-sage'}`} />
                <span className="text-[11px] md:text-xs font-bold text-korean-stone">立即上傳</span>
              </button>
              <button 
                onClick={() => handleCloudAction('download')}
                disabled={isSyncing}
                className="flex items-center gap-3 p-3.5 md:p-4 bg-korean-bg border border-korean-border rounded-xl md:rounded-2xl hover:border-korean-sage/30 hover:bg-white transition-all active:scale-95 disabled:opacity-50 group"
              >
                <CloudDownload className={`w-4.5 h-4.5 md:w-5 md:h-5 ${isSyncing ? 'text-korean-muted/30' : 'text-korean-sage'}`} />
                <span className="text-[11px] md:text-xs font-bold text-korean-stone">下載還原</span>
              </button>
            </div>

            {isSyncing && (
              <div className="flex items-center justify-center gap-2 text-korean-sage animate-pulse py-1 md:py-2">
                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase">Syncing...</span>
              </div>
            )}

            {syncStatus === 'success' && (
              <div className="flex items-center justify-center gap-2 text-korean-sage bg-korean-sage/5 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-korean-sage/10 animate-pop-in">
                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-[11px] md:text-xs font-bold">同步成功</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 md:p-4 bg-korean-rose/5 border border-korean-rose/10 rounded-lg md:rounded-xl flex items-start gap-2.5 md:gap-3 text-korean-rose animate-shake">
                <AlertCircle className="w-4.5 h-4.5 md:w-5 md:h-5 shrink-0" />
                <span className="text-[10px] md:text-[11px] font-bold leading-tight">{errorMsg}</span>
              </div>
            )}
          </div>
        </section>

        {/* Zone 2: Backup & Import/Export */}
        <section className="space-y-4 md:space-y-6 animate-pop-in">
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-korean-stone/10 rounded-lg md:rounded-xl flex items-center justify-center text-korean-stone">
              <Copy className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-[13px] md:text-sm font-bold text-korean-stone tracking-tight">備份與匯入匯出</h3>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-korean-border shadow-sm space-y-4 md:space-y-6">
            <div className="space-y-2 md:space-y-3">
              <label className="text-[9px] md:text-[10px] font-bold text-korean-muted uppercase tracking-widest">代碼匯出</label>
              <div className="relative">
                <textarea 
                  readOnly 
                  className="w-full h-24 md:h-32 p-3 md:p-4 text-[9px] md:text-[10px] font-mono bg-korean-bg border border-korean-border rounded-lg md:rounded-xl focus:outline-none resize-none text-korean-stone/60 break-all shadow-inner custom-scrollbar" 
                  value={exportStr}
                />
                <button 
                  onClick={handleCopy} 
                  className="absolute bottom-2 right-2 md:bottom-3 md:right-3 bg-korean-stone text-white text-[9px] md:text-[10px] px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-bold flex items-center gap-1.5 md:gap-2 active:scale-95 transition-all hover:bg-korean-stone/90"
                >
                  <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" /> 複製代碼
                </button>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <label className="text-[9px] md:text-[10px] font-bold text-korean-muted uppercase tracking-widest">代碼匯入</label>
              <textarea 
                value={importStr}
                onChange={(e) => setImportStr(e.target.value)}
                className="w-full h-24 md:h-32 p-3 md:p-4 text-[9px] md:text-[10px] font-mono bg-korean-bg border border-korean-border rounded-lg md:rounded-xl focus:ring-2 focus:ring-korean-sage/20 focus:border-korean-sage outline-none resize-none placeholder:text-korean-muted/30 shadow-inner text-korean-stone custom-scrollbar" 
                placeholder='在此貼上備份 JSON 代碼...'
              />
              <button 
                onClick={handleImport} 
                className="w-full bg-korean-sage text-white py-3 md:py-3.5 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-korean-sage/10 hover:bg-korean-sage/90 text-sm"
              >
                <Download className="w-4 h-4 md:w-4.5 md:h-4.5" /> 覆蓋並匯入資料
              </button>
            </div>
          </div>
        </section>

        {/* Zone 3: Danger Zone */}
        <section className="space-y-4 md:space-y-6 animate-pop-in">
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-korean-rose/10 rounded-lg md:rounded-xl flex items-center justify-center text-korean-rose">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-[13px] md:text-sm font-bold text-korean-rose tracking-tight">危險操作區域</h3>
          </div>

          <div className="bg-korean-rose/5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-korean-rose/10 shadow-sm space-y-3 md:space-y-4">
            <p className="text-[10px] md:text-[11px] text-korean-rose/80 font-bold leading-relaxed">
              警告：以下操作將永久刪除您的所有追星紀錄與設定，且無法撤銷。請在執行前確認已做好雲端備份。
            </p>
            <button 
              onClick={onReset}
              className="w-full py-3.5 md:py-4 bg-white border border-korean-rose/20 text-korean-rose rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-2 hover:bg-korean-rose hover:text-white transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4 md:w-4.5 md:h-4.5" /> 清除所有資料 (恢復原廠設定)
            </button>
          </div>
        </section>
      </div>

      {!isPage && (
        <div className="p-4 border-t border-korean-border bg-white rounded-b-[2rem] md:rounded-b-[2.5rem] shrink-0">
          <button onClick={onClose} className="w-full py-2.5 text-korean-muted text-sm font-bold hover:text-korean-stone transition-colors tracking-widest uppercase">Close</button>
        </div>
      )}
    </div>
  );

  if (isPage) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="資料管理">
      {content}
    </Modal>
  );
};
