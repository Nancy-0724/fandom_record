
/**
 * 將圖片檔案壓縮並轉換為 Base64 字串
 */
export const compressImage = (
  file: File, 
  maxWidth: number = 300, 
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          reject(new Error("Canvas context not available"));
        }
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * 正規化字串：轉小寫並移除非英數字符
 */
export const normalizeString = (s: string): string => {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * 驗證兩個字串是否具有相關性（用於防止錯誤的搜尋結果）
 * 針對維基百科標題進行優化，忽略常見的後綴
 */
export const isFuzzyMatch = (query: string, resultTitle: string): boolean => {
  const nQuery = normalizeString(query);
  const nTitle = normalizeString(resultTitle)
    .replace(/southkorean/g, '')
    .replace(/band/g, '')
    .replace(/group/g, '')
    .replace(/kpop/g, '');
    
  return nTitle.includes(nQuery) || nQuery.includes(nTitle);
};

/**
 * 強化版清洗日期格式
 * 嚴格遵守：YYYY-MM 必須視為純字串 (Period)，禁止進行時區轉換
 * 針對 Google Sheets 可能傳回的 ISO 格式進行「月份校準」
 */
export const sanitizeDate = (dateVal: any): string => {
  if (!dateVal) return '';
  
  // 1. 如果是 Date 物件，取本地年月 (對應 UI 上的選擇)
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  const s = String(dateVal).trim();
  if (!s) return '';

  // 2. 核心防禦：正規表達式直接擷取 YYYY-MM
  // 這是最安全的路徑，完全不經過 Date 解析
  const dateMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (dateMatch) {
    const year = dateMatch[1];
    const month = dateMatch[2].padStart(2, '0');
    return `${year}-${month}`;
  }

  // 3. 處理 ISO 格式 (例如 2026-03-01T00:00:00.000Z)
  // 這種格式通常是 Google Sheets API 自動轉換產生的
  if (s.includes('T') || s.includes('Z') || s.includes(':')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      // 關鍵：增加 12 小時的「月份校準補償」
      // 由於我們只關心「月份」，增加 12 小時可以抵消大部分時區偏移導致的跨月問題
      // (例如 UTC+8 的 03-01 00:00 在 UTC 是 02-28 16:00，加 12 小時後會變回 03-01)
      const offsetDate = new Date(d.getTime() + 12 * 60 * 60 * 1000);
      const y = offsetDate.getUTCFullYear();
      const m = String(offsetDate.getUTCMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
  }

  // 4. 最後的保險：嘗試從任何包含數字的字串中擷取 YYYY-MM
  const genericMatch = s.match(/(\d{4})[-/](\d{1,2})/);
  if (genericMatch) {
    return `${genericMatch[1]}-${genericMatch[2].padStart(2, '0')}`;
  }

  return s;
};

/**
 * 將 YYYY-MM 轉換為總月份數 (year * 12 + month)
 * 用於精確計算時長，不涉及 Date 物件與時區
 */
export const dateToTotalMonths = (dateStr: string): number => {
  const [y, m] = dateStr.split('-').map(Number);
  if (isNaN(y) || isNaN(m)) return 0;
  return y * 12 + (m - 1); // month is 0-indexed for calculation
};

/**
 * 從總月份數轉回 YYYY-MM
 */
export const totalMonthsToDate = (totalMonths: number): string => {
  const y = Math.floor(totalMonths / 12);
  const m = (totalMonths % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
};
