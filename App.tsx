
import { useState, useEffect, useCallback, useRef } from 'react';
import { BookHeart, Database, LayoutGrid, List, Plus, X, Loader2, Layers, CheckCircle, AlertTriangle, History, BarChart3, Sparkles, Trophy, Heart, Cloud, CloudOff, CloudDownload } from 'lucide-react';
import { Group, Member, GroupDetails, ToastType, TimelineEvent, GroupRatings } from './types';
import { PRESET_DB } from './constants';
import { fetchFromWikiAuto, fetchGroupLogo } from './services/wikiService';
import { GroupCard } from './components/GroupCard';
import { EditGroupModal } from './components/EditGroupModal';
import { GroupDetailsModal } from './components/GroupDetailsModal';
import { DataModal } from './components/DataModal';
import { TimelineModal } from './components/TimelineModal';
import { DashboardModal } from './components/DashboardModal';
import { RatingModal } from './components/RatingModal';
import { BiasListModal } from './components/BiasListModal';
import { Modal } from './components/ui/Modal';
import { normalizeString, sanitizeDate } from './utils';

const FIXED_GAS_URL = 'https://script.google.com/macros/s/AKfycbzXf-TAPJ9u_jyDbTAkZXQC-rA5riv0JLVzC5aYpBPkEm4oHEmA0z3JxwRJ8JOkYDZXKw/exec';

interface AlertConfig {
  title: string;
  msg: string;
  action?: () => void;
  actionLabel?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type View = 'groups' | 'bias-list' | 'ratings' | 'dashboard' | 'timeline' | 'data' | 'edit-group' | 'group-details';

export default function App() {
  // --- State ---
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInputError, setIsInputError] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentView, setCurrentView] = useState<View>('groups');
  const [previousView, setPreviousView] = useState<View>('groups');
  const [isSortMode, setIsSortMode] = useState(false);
  
  // Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  // Modals / Selection
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [detailsModalGroup, setDetailsModalGroup] = useState<Group | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  // Helper to get current YYYY-MM
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // --- Effects ---
  // Initialization: Cloud-First Sync
  useEffect(() => {
    const initializeData = async () => {
      setSyncStatus('syncing');
      try {
        // 1. 優先從雲端抓取最新資料
        const response = await fetch(FIXED_GAS_URL);
        if (!response.ok) throw new Error('無法連線至雲端資料庫');
        
        const rawText = await response.text();
        let cloudData;
        try {
          cloudData = JSON.parse(rawText);
        } catch (e) {
          console.warn("Cloud data parse failed or empty", rawText);
          cloudData = null;
        }

        if (Array.isArray(cloudData) && cloudData.length > 0) {
          // 2. 雲端有資料：執行清洗並覆蓋本地
          processAndSetData(cloudData, "雲端資料已同步");
        } else {
          // 3. 雲端無資料：檢查本地快取
          const saved = localStorage.getItem('stan-binder-v7-react');
          if (saved) {
            try {
              const localData = JSON.parse(saved);
              if (Array.isArray(localData) && localData.length > 0) {
                processAndSetData(localData, "已載入本地快取資料 (雲端無資料)");
              } else {
                setMyGroups([]);
              }
            } catch (e) {
              setMyGroups([]);
            }
          } else {
            setMyGroups([]);
          }
        }
        setSyncStatus('idle');
      } catch (e: any) {
        console.error("Initialization failed:", e);
        setInitError(e.message || "初始化同步失敗");
        setSyncStatus('error');
        
        // 如果雲端失敗，為了讓使用者能操作，載入本地作為備案，但標記同步錯誤
        const saved = localStorage.getItem('stan-binder-v7-react');
        if (saved) {
          try {
            const localData = JSON.parse(saved);
            setMyGroups(localData);
          } catch (err) {}
        }
      } finally {
        setIsAppReady(true);
      }
    };

    initializeData();
  }, []);

  // 輔助函式：統一處理資料清洗與狀態更新
  const processAndSetData = (data: Group[], toastMsg?: string) => {
    const processed = data.map(g => {
      const cleanRootStanDate = sanitizeDate(g.stanDate);
      const cleanRootUnstanDate = sanitizeDate(g.unstanDate);

      let sanitizedTimeline = (g.timeline || []).map(e => ({
        ...e,
        date: sanitizeDate(e.date)
      }));

      if (sanitizedTimeline.length === 0 && cleanRootStanDate) {
        sanitizedTimeline.push({ date: cleanRootStanDate, type: 'stan' });
        if (cleanRootUnstanDate) {
          sanitizedTimeline.push({ date: cleanRootUnstanDate, type: 'unstan' });
        }
      }

      sanitizedTimeline.sort((a, b) => a.date.localeCompare(b.date));

      const earliestStanFromTimeline = sanitizedTimeline
          .filter(e => e.type === 'stan')
          .sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
      
      const finalStanDate = earliestStanFromTimeline || cleanRootStanDate;

      const sortedEventsDesc = [...sanitizedTimeline].sort((a, b) => b.date.localeCompare(a.date));
      const latestEvent = sortedEventsDesc[0];
      const derivedUnstanDate = (latestEvent && latestEvent.type === 'unstan') ? latestEvent.date : cleanRootUnstanDate;

      return {
        ...g,
        stanDate: finalStanDate,
        unstanDate: derivedUnstanDate || undefined,
        timeline: sanitizedTimeline,
        isExpanded: false 
      };
    }).sort((a, b) => {
        const aUnstan = !!a.unstanDate;
        const bUnstan = !!b.unstanDate;
        if (aUnstan === bUnstan) return 0;
        return aUnstan ? 1 : -1;
    });

    setMyGroups(processed);
    localStorage.setItem('stan-binder-v7-react', JSON.stringify(processed));
    if (toastMsg) showToast(toastMsg);
  };

  // Auto-Save to LocalStorage & Auto-Sync to Cloud
  useEffect(() => {
    // 關鍵：在初始化完成前，禁止任何自動同步或儲存行為
    if (!isAppReady || isInitialMount.current) {
      if (isInitialMount.current && isAppReady) {
        isInitialMount.current = false;
      }
      return;
    }

    localStorage.setItem('stan-binder-v7-react', JSON.stringify(myGroups));

    // 即時同步邏輯 (僅在初始化成功後允許)
    if (myGroups.length > 0) {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      
      syncStatus !== 'syncing' && setSyncStatus('idle');
      
      syncTimeoutRef.current = window.setTimeout(async () => {
        setSyncStatus('syncing');
        try {
          const payload = JSON.stringify(myGroups);
          if (payload.length > 50000) {
             setSyncStatus('error');
             return;
          }
          await fetch(FIXED_GAS_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: payload,
            headers: { 'Content-Type': 'application/json' }
          });
          setSyncStatus('success');
          // 成功後維持打勾 3 秒再回到 idle
          setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (e) {
          console.error("Auto-sync failed", e);
          setSyncStatus('error');
        }
      }, 2000); // 2秒後觸發同步
    }
  }, [myGroups]);

  // --- Handlers ---

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const resetError = () => setIsInputError(false);

  const handleForceAdd = useCallback(() => {
    if (!inputQuery.trim()) return;
    const groupName = inputQuery.trim();
    const now = getCurrentMonth();

    const newGroup: Group = {
      id: Date.now().toString(),
      name: groupName,
      stanDate: now,
      isExpanded: true,
      members: [],
      timeline: [{ date: now, type: 'stan' }]
    };
    setMyGroups(prev => [newGroup, ...prev]);
    setEditingGroup(newGroup);
    setInputQuery('');
    resetError();

    fetchGroupLogo(groupName).then(url => {
      if (url) {
        setMyGroups(prev => prev.map(g => 
          g.id === newGroup.id ? { ...g, logoUrl: url } : g
        ));
      }
    });
  }, [inputQuery]);

  const handleSmartAdd = async () => {
    const rawInput = inputQuery.trim();
    if (!rawInput) return;

    setIsLoading(true);
    resetError();

    const key = normalizeString(rawInput);
    const now = getCurrentMonth();

    let preset = PRESET_DB[key];
    if (preset) {
      if (preset.ref && PRESET_DB[preset.ref]) {
        preset = PRESET_DB[preset.ref];
      }
      
      if (!preset.n) {
         showToast(`${key} 設定錯誤`, 'error');
         setIsLoading(false);
         return;
      }

      if (myGroups.find(g => g.name === preset.n)) {
        showToast(`${preset.n} 已存在`, 'error');
        setIsLoading(false);
        return;
      }

      const newGroup: Group = {
        id: Date.now().toString(),
        name: preset.n,
        stanDate: now,
        isExpanded: true,
        members: preset.m ? preset.m.map(m => ({ name: m[0], cn: m[1] || '', rank: 0 })) : [],
        logoUrl: preset.l,
        timeline: [{ date: now, type: 'stan' }]
      };
      
      setMyGroups(prev => [newGroup, ...prev]);
      showToast(`已新增 ${newGroup.name}`);
      setInputQuery('');
      setIsLoading(false);

      if (!newGroup.logoUrl) {
        fetchGroupLogo(newGroup.name).then(url => {
          if (url) {
            setMyGroups(prev => prev.map(g => 
              g.id === newGroup.id ? { ...g, logoUrl: url } : g
            ));
          }
        });
      }

      return;
    }

    try {
      const data = await fetchFromWikiAuto(rawInput);
      if (myGroups.find(g => g.name === data.name)) {
        showToast(`${data.name} 已存在`, 'error');
      } else {
        if (data.members.length === 0) {
          setAlertConfig({
            title: "無法抓取成員",
            msg: `找到 "${data.name}" 但無法自動抓取成員名單。\n\n您可以選擇手動新增此團體並自行編輯成員。`,
            action: handleForceAdd,
            actionLabel: "手動新增"
          });
        } else {
          const newGroup: Group = {
            id: Date.now().toString(),
            name: data.name,
            stanDate: now,
            isExpanded: true,
            members: data.members,
            logoUrl: data.logoUrl,
            timeline: [{ date: now, type: 'stan' }]
          };
          setMyGroups(prev => [newGroup, ...prev]);
          showToast(`已新增 ${data.name} 並透過 AI 優化中文名稱`);
          setInputQuery('');
        }
      }
    } catch (e) {
      setIsInputError(true);
      setAlertConfig({
        title: "找不到團體",
        msg: `找不到 "${rawInput}"。\n請確認拼字，或者直接手動建立此團體。`,
        action: handleForceAdd,
        actionLabel: `手動新增 "${rawInput}"`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleExpand = useCallback((id: string) => {
    setMyGroups(prev => prev.map(g => g.id === id ? { ...g, isExpanded: !g.isExpanded } : g));
  }, []);

  const handleMove = useCallback((index: number, dir: number) => {
    setMyGroups(prev => {
      const newGroups = [...prev];
      const targetIndex = index + dir;
      if (targetIndex >= 0 && targetIndex < newGroups.length) {
        [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];
        return newGroups;
      }
      return prev;
    });
  }, []);

  const handleToggleRank = useCallback((groupId: string, member: Member) => {
    setMyGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        members: g.members.map(m => 
          m.name === member.name ? { ...m, rank: (m.rank + 1) % 3 } : m
        )
      };
    }));
  }, []);

  const handleRemoveGroupClick = useCallback((group: Group) => {
    setDeleteConfirmGroup(group);
  }, []);

  const handleEditClick = useCallback((group: Group) => {
    setPreviousView(currentView);
    setEditingGroup(group);
    setCurrentView('edit-group');
  }, [currentView]);

  const handleDetailsClick = useCallback((group: Group) => {
    setPreviousView(currentView);
    setDetailsModalGroup(group);
    setCurrentView('group-details');
  }, [currentView]);

  const performDeleteGroup = () => {
    if (deleteConfirmGroup) {
      setMyGroups(prev => prev.filter(g => g.id !== deleteConfirmGroup.id));
      showToast("團體已移除");
      setDeleteConfirmGroup(null);
    }
  };

  const handleSaveEdit = (groupId: string, members: Member[], logoUrl: string, timeline: TimelineEvent[]) => {
    setMyGroups(prev => {
        const earliestStan = timeline
            .filter(e => e.type === 'stan')
            .sort((a, b) => a.date.localeCompare(b.date))[0]?.date || '';
        
        const sortedEvents = [...timeline].sort((a, b) => b.date.localeCompare(a.date));
        const latestEvent = sortedEvents[0];
        const derivedUnstanDate = (latestEvent && latestEvent.type === 'unstan') ? latestEvent.date : undefined;

        const updatedGroups = prev.map(g => g.id === groupId ? { 
            ...g, 
            members, 
            logoUrl, 
            timeline,
            stanDate: earliestStan || g.stanDate,
            unstanDate: derivedUnstanDate
        } : g);
        
        return updatedGroups.sort((a, b) => {
            const aUnstan = !!a.unstanDate;
            const bUnstan = !!b.unstanDate;
            if (aUnstan === bUnstan) return 0;
            return aUnstan ? 1 : -1;
        });
    });
    showToast("團體已更新");
    setCurrentView(previousView);
    setEditingGroup(null);
  };

  const handleSaveDetails = (groupId: string, details: GroupDetails) => {
    setMyGroups(prev => prev.map(g => g.id === groupId ? { ...g, details } : g));
    showToast("詳細筆記已儲存");
    setCurrentView(previousView);
    setDetailsModalGroup(null);
  };

  const handleUpdateRatings = (groupId: string, ratings: GroupRatings) => {
    setMyGroups(prev => prev.map(g => g.id === groupId ? { ...g, ratings } : g));
  };

  const handleImport = (data: Group[]) => {
    processAndSetData(data, "資料匯入成功");
  };

  const handleReset = () => {
    if (window.confirm("恢復原廠設定：清除所有資料？")) {
      setMyGroups([]);
      localStorage.removeItem('stan-binder-v7-react');
      showToast("所有資料已清除");
      setCurrentView('groups');
    }
  };

  const scrollToTop = () => {
    setCurrentView('groups');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex bg-korean-bg min-h-screen relative overflow-hidden text-korean-stone">
      {/* 全螢幕初始化載入遮罩 */}
      {!isAppReady && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-10 text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-korean-bg rounded-[2.5rem] flex items-center justify-center text-korean-sage shadow-sm border border-korean-border animate-pulse">
              <Cloud className="w-12 h-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-2xl shadow-lg border border-korean-border">
              <Loader2 className="w-6 h-6 text-korean-sage animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-korean-stone tracking-tight mb-3">正在同步雲端資料</h2>
          <p className="text-korean-muted max-w-xs leading-relaxed text-sm font-medium">
            請稍候，我們正在從 Google Sheets 抓取您的最新追星紀錄，以確保資料一致性。
          </p>
          {initError && (
            <div className="mt-8 p-4 bg-korean-rose/5 border border-korean-rose/10 rounded-2xl text-korean-rose text-xs font-bold flex flex-col items-center gap-2 animate-shake">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{initError}</span>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-korean-rose text-white rounded-xl hover:bg-korean-rose/90 transition-all active:scale-95"
              >
                重試連線
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop Sidebar / Navigation Rail */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-white border-r border-korean-border sticky top-0 h-screen z-40">
        <div className="p-4 lg:p-8 flex items-center gap-3 cursor-pointer group" onClick={scrollToTop}>
          <div className="bg-korean-sand text-korean-sage p-2.5 rounded-2xl shadow-sm group-hover:scale-105 transition-transform">
            <BookHeart className="w-6 h-6" />
          </div>
          <h1 className="hidden lg:block text-xl font-bold text-korean-stone tracking-tight">追星歷程</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-3">
          <button 
            onClick={scrollToTop}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-semibold transition-all ${currentView === 'groups' ? 'text-korean-sage bg-korean-bg shadow-sm' : 'text-korean-muted hover:bg-korean-bg'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="hidden lg:block">團體列表</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('bias-list')}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-medium transition-all ${currentView === 'bias-list' ? 'text-korean-rose bg-korean-bg shadow-sm' : 'text-korean-muted hover:bg-korean-bg hover:text-korean-rose'}`}
          >
            <Heart className="w-5 h-5" />
            <span className="hidden lg:block">本命清單</span>
          </button>

          <button 
            onClick={() => setCurrentView('ratings')}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-medium transition-all ${currentView === 'ratings' ? 'text-amber-600/70 bg-amber-50/50 shadow-sm' : 'text-korean-muted hover:bg-korean-bg hover:text-amber-600/70'}`}
          >
            <Trophy className="w-5 h-5" />
            <span className="hidden lg:block">戰力評比</span>
          </button>

          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-medium transition-all ${currentView === 'dashboard' ? 'text-korean-sage bg-korean-bg shadow-sm' : 'text-korean-muted hover:bg-korean-bg hover:text-korean-sage'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="hidden lg:block">數據統計</span>
          </button>

          <button 
            onClick={() => setCurrentView('timeline')}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-medium transition-all ${currentView === 'timeline' ? 'text-korean-stone bg-korean-sand/30 shadow-sm' : 'text-korean-muted hover:bg-korean-bg hover:text-korean-stone'}`}
          >
            <History className="w-5 h-5" />
            <span className="hidden lg:block">時間軸</span>
          </button>
        </nav>

        <div className="p-6 border-t border-korean-border">
          <button 
            onClick={() => setCurrentView('data')}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-medium transition-all relative ${currentView === 'data' ? 'text-korean-stone bg-korean-sand/30 shadow-sm' : 'text-korean-muted hover:bg-korean-bg'}`}
          >
            <Database className="w-5 h-5" />
            <span className="hidden lg:block">資料管理</span>
            {syncStatus === 'error' && <div className="absolute top-4 right-4 w-2 h-2 bg-korean-rose rounded-full border border-white animate-pulse"></div>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-korean-border px-4 md:px-10 py-4 md:py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 md:hidden">
            <div className="bg-korean-sand text-korean-sage p-1.5 rounded-xl shadow-sm" onClick={scrollToTop}>
              <BookHeart className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold text-korean-stone tracking-tight">追星歷程</h1>
          </div>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <div className="relative flex items-center gap-4">
              <div className="relative flex-1">
                <input 
                  value={inputQuery}
                  onChange={(e) => { setInputQuery(e.target.value); resetError(); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSmartAdd()}
                  type="text" 
                  placeholder="輸入團名 (如: 82MAJOR)" 
                  disabled={isLoading}
                  className={`
                    w-full pl-11 pr-11 py-3 bg-korean-bg border-korean-border border rounded-2xl outline-none text-sm font-medium transition-all
                    placeholder-korean-muted/50
                    ${isInputError ? 'border-korean-rose/50 bg-korean-rose/5 animate-shake' : 'focus:border-korean-sage/50 focus:bg-white focus:ring-4 focus:ring-korean-sage/5'}
                  `}
                />
                <Sparkles className="absolute left-4 top-3.5 w-4 h-4 text-korean-muted/60" />
                {inputQuery && !isLoading && (
                  <button onClick={() => { setInputQuery(''); resetError(); }} className="absolute right-4 top-3.5 text-korean-muted/40 hover:text-korean-stone">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {isLoading && (
                   <div className="absolute right-4 top-3.5 text-korean-sage">
                      <Loader2 className="w-4 h-4 animate-spin" />
                   </div>
                )}
              </div>
              <button 
                onClick={handleSmartAdd}
                disabled={isLoading || !inputQuery}
                className={`
                  bg-korean-sage text-white px-7 py-3 rounded-2xl font-bold shadow-sm hover:bg-korean-sage/90 active:scale-95 transition flex items-center gap-2
                  ${(isLoading || !inputQuery) ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                `}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>新增團體</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-korean-bg border border-korean-border rounded-full">
              <div className="relative">
                {syncStatus === 'syncing' && <Loader2 className="w-3.5 h-3.5 text-korean-sage animate-spin" />}
                {syncStatus === 'success' && <CheckCircle className="w-3.5 h-3.5 text-korean-sage" />}
                {syncStatus === 'error' && <CloudOff className="w-3.5 h-3.5 text-korean-rose" />}
                {syncStatus === 'idle' && <Cloud className="w-3.5 h-3.5 text-korean-muted/40" />}
              </div>
              <span className="text-[10px] font-bold text-korean-muted uppercase tracking-widest">
                {syncStatus === 'syncing' ? '同步中' : syncStatus === 'success' ? '已同步' : syncStatus === 'error' ? '同步失敗' : '雲端就緒'}
              </span>
            </div>

            <button 
              onClick={() => setViewMode(v => v === 'card' ? 'list' : 'card')} 
              className="p-3 text-korean-muted hover:bg-korean-bg rounded-2xl transition"
              title={viewMode === 'card' ? "切換至列表" : "切換至卡片"}
            >
              {viewMode === 'card' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Search Bar */}
        <div className="md:hidden bg-white p-4 border-b border-korean-border sticky top-[61px] z-20">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                value={inputQuery}
                onChange={(e) => { setInputQuery(e.target.value); resetError(); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSmartAdd()}
                type="text" 
                placeholder="輸入團名..." 
                disabled={isLoading}
                className={`
                  w-full pl-4 pr-10 py-3 bg-korean-bg border-korean-border border rounded-2xl outline-none text-sm font-medium transition-all
                  ${isInputError ? 'border-korean-rose/50 bg-korean-rose/5 animate-shake' : 'focus:border-korean-sage/50 focus:ring-4 focus:ring-korean-sage/5 focus:bg-white'}
                `}
              />
              {isLoading && (
                 <div className="absolute right-3 top-3 text-korean-sage">
                    <Loader2 className="w-4 h-4 animate-spin" />
                 </div>
              )}
            </div>
            <button 
              onClick={handleSmartAdd}
              disabled={isLoading || !inputQuery}
              className="bg-korean-sage text-white p-3 rounded-2xl shadow-sm active:scale-95 transition"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-12 pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto">
            {currentView === 'groups' && (
              <>
                <div className="flex items-center justify-between mb-6 md:mb-10">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-korean-stone tracking-tight">我的團體</h2>
                    <p className="text-korean-muted text-[11px] md:text-sm font-medium mt-1">目前追蹤了 {myGroups.length} 個團體</p>
                  </div>
                  
                  <div className="flex items-center gap-2 md:gap-3">
                    <button 
                      onClick={() => setIsSortMode(!isSortMode)}
                      className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all flex items-center gap-1.5 md:gap-2 border ${isSortMode ? 'bg-korean-sage text-white border-korean-sage shadow-lg shadow-korean-sage/20' : 'bg-white text-korean-muted border-korean-border hover:border-korean-sage/30'}`}
                    >
                      <Layers className={`w-3.5 h-3.5 md:w-4 h-4 ${isSortMode ? 'animate-pulse' : ''}`} />
                      {isSortMode ? '完成' : '排序'}
                    </button>
                    
                    <div className="hidden md:flex items-center gap-2">
                      <button 
                        onClick={() => setViewMode(v => v === 'card' ? 'list' : 'card')} 
                        className="p-3 text-korean-muted hover:bg-korean-bg rounded-2xl transition border border-transparent hover:border-korean-border"
                        title={viewMode === 'card' ? "切換至列表" : "切換至卡片"}
                      >
                        {viewMode === 'card' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {myGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[2.5rem] border border-korean-border shadow-sm">
                    <div className="w-24 h-24 bg-korean-bg text-korean-sand rounded-3xl flex items-center justify-center mb-8">
                      <Layers className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold text-korean-stone mb-3">開始您的追星歷程</h3>
                    <p className="text-korean-muted max-w-xs mx-auto mb-10 leading-relaxed">
                      輸入您喜愛的團體名稱，我們將為您自動抓取成員資訊與相關數據。
                    </p>
                    <div className="flex flex-col gap-4">
                      <button 
                        onClick={() => setInputQuery("82MAJOR")}
                        className="text-korean-sage font-bold hover:underline"
                      >
                        試試搜尋 "82MAJOR"
                      </button>
                      <button onClick={() => setCurrentView('data')} className="text-korean-muted text-sm flex items-center gap-2 justify-center hover:text-korean-sage transition-colors">
                        <CloudDownload className="w-4 h-4" /> 從雲端備份還原
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`
                    ${viewMode === 'card' 
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                      : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'}
                  `}>
                    {myGroups.map((group, index) => (
                      <div key={group.id} className="h-full">
                         <GroupCard 
                           group={group}
                           isFirst={index === 0}
                           isLast={index === myGroups.length - 1}
                           isSortMode={isSortMode}
                           onMove={(dir) => handleMove(index, dir)}
                           onEdit={() => handleEditClick(group)}
                           onDetails={() => handleDetailsClick(group)}
                           onToggleExpand={() => handleToggleExpand(group.id)}
                           onToggleRank={(m) => handleToggleRank(group.id, m)}
                           onRemove={() => handleRemoveGroupClick(group)}
                         />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {currentView === 'dashboard' && (
              <DashboardModal 
                isOpen={true} 
                onClose={() => setCurrentView('groups')} 
                groups={myGroups} 
                isPage={true}
              />
            )}

            {currentView === 'timeline' && (
              <TimelineModal 
                isOpen={true}
                onClose={() => setCurrentView('groups')}
                groups={myGroups}
                isPage={true}
              />
            )}

            {currentView === 'ratings' && (
              <RatingModal
                isOpen={true}
                onClose={() => setCurrentView('groups')}
                groups={myGroups}
                onUpdateRatings={handleUpdateRatings}
                isPage={true}
              />
            )}

            {currentView === 'bias-list' && (
              <BiasListModal
                isOpen={true}
                onClose={() => setCurrentView('groups')}
                groups={myGroups}
                isPage={true}
              />
            )}

            {currentView === 'data' && (
              <DataModal 
                isOpen={true} 
                onClose={() => setCurrentView('groups')} 
                data={myGroups} 
                onImport={handleImport} 
                onReset={handleReset} 
                isPage={true}
              />
            )}

            {currentView === 'edit-group' && editingGroup && (
              <EditGroupModal 
                isOpen={true} 
                onClose={() => { setEditingGroup(null); setCurrentView('groups'); }} 
                group={editingGroup} 
                onSave={handleSaveEdit} 
                isPage={true}
              />
            )}

            {currentView === 'group-details' && detailsModalGroup && (
              <GroupDetailsModal
                isOpen={true}
                onClose={() => { setDetailsModalGroup(null); setCurrentView('groups'); }}
                group={detailsModalGroup}
                onSave={handleSaveDetails}
                isPage={true}
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white border-t border-korean-border px-1 py-2 flex justify-around items-center fixed bottom-0 left-0 right-0 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <button 
            onClick={scrollToTop}
            className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-all ${currentView === 'groups' ? 'text-korean-sage' : 'text-korean-muted'}`}
          >
            <LayoutGrid className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold">列表</span>
          </button>
          <button 
            onClick={() => setCurrentView('bias-list')}
            className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-all ${currentView === 'bias-list' ? 'text-korean-rose' : 'text-korean-muted'}`}
          >
            <Heart className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold">本命</span>
          </button>
          <button 
            onClick={() => setCurrentView('ratings')}
            className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-all ${currentView === 'ratings' ? 'text-amber-600/70' : 'text-korean-muted'}`}
          >
            <Trophy className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold">評比</span>
          </button>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-all ${currentView === 'dashboard' ? 'text-korean-sage' : 'text-korean-muted'}`}
          >
            <BarChart3 className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold">數據</span>
          </button>
          <button 
            onClick={() => setCurrentView('timeline')}
            className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-all ${currentView === 'timeline' ? 'text-korean-stone' : 'text-korean-muted'}`}
          >
            <History className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold">時間軸</span>
          </button>
          <button 
            onClick={() => setCurrentView('data')}
            className={`flex flex-col items-center gap-1 p-1 min-w-[56px] transition-all ${currentView === 'data' ? 'text-korean-stone' : 'text-korean-muted'}`}
          >
            <div className="relative">
              <Database className="w-4.5 h-4.5" />
              {syncStatus === 'error' && <div className="absolute -top-1 -right-1 w-2 h-2 bg-korean-rose rounded-full border border-white"></div>}
            </div>
            <span className="text-[9px] font-bold">管理</span>
          </button>
        </nav>
      </div>

      <Modal 
        isOpen={!!deleteConfirmGroup} 
        onClose={() => setDeleteConfirmGroup(null)} 
        title="確認移除"
      >
        <div className="p-6">
          <p className="text-korean-stone/80 mb-8 leading-relaxed">
            確定要移除 <span className="font-bold text-korean-stone">{deleteConfirmGroup?.name}</span> 嗎？此動作無法復原。
          </p>
          <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmGroup(null)} 
                className="flex-1 py-3.5 bg-korean-bg text-korean-muted rounded-2xl font-bold active:scale-95 transition hover:bg-korean-sand/30"
              >
                取消
              </button>
              <button 
                onClick={performDeleteGroup} 
                className="flex-1 py-3.5 bg-korean-rose text-white rounded-2xl font-bold shadow-sm active:scale-95 transition hover:bg-korean-rose/90"
              >
                確認移除
              </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!alertConfig} 
        onClose={() => setAlertConfig(null)} 
        title={alertConfig?.title || '提示'}
      >
         <div className="p-6">
           <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 bg-korean-bg text-korean-rose rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7" />
              </div>
              <p className="text-korean-stone font-medium whitespace-pre-wrap leading-relaxed">{alertConfig?.msg}</p>
           </div>
           
           {alertConfig?.action ? (
             <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setAlertConfig(null)} 
                  className="flex-1 py-3.5 bg-korean-bg text-korean-muted rounded-2xl font-bold active:scale-95 transition hover:bg-korean-sand/30"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    alertConfig.action?.();
                    setAlertConfig(null);
                  }}
                  className="flex-1 py-3.5 bg-korean-sage text-white rounded-2xl font-bold shadow-sm active:scale-95 transition hover:bg-korean-sage/90"
                >
                  {alertConfig.actionLabel || '確定'}
                </button>
             </div>
           ) : (
             <button 
               onClick={() => setAlertConfig(null)} 
               className="w-full mt-8 py-3.5 bg-korean-stone text-white rounded-2xl font-bold active:scale-95 transition hover:bg-korean-stone/90"
             >
               我知道了
             </button>
           )}
         </div>
      </Modal>

      {toast && (
        <div className={`
          fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-md
          transition-all duration-300 flex items-center gap-3 pointer-events-none z-[110]
          animate-pop-in border border-white/40 backdrop-blur-xl
          ${toast.type === 'error' ? 'bg-korean-rose text-white' : 'bg-korean-stone text-white'}
        `}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-korean-sand" /> : <AlertTriangle className="w-4 h-4 text-white" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
