
import { GoogleGenAI, Type } from "@google/genai";
import { Member } from '../types';
import { isFuzzyMatch, normalizeString } from '../utils';

// Initialize Gemini AI
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Use Gemini AI to find Traditional Chinese names for a list of members
 */
export const enrichMembersWithAI = async (groupName: string, members: Member[]): Promise<Member[]> => {
  if (members.length === 0) return [];
  
  const ai = getAI();
  const memberNames = members.map(m => m.name).join(', ');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一位 K-pop 專家。以下是南韓團體 "${groupName}" 的成員名單：${memberNames}。
      
      請提供這些成員在台灣、香港常用的「繁體中文」藝名。
      
      注意事項：
      1. 返回的 JSON 陣列中，"name" 必須與我提供的英文清單【完全一致】。
      2. "cn" 請填寫該成員正確的繁體中文名稱（例如：Juyeon -> 柱延, Younghoon -> 泳勛）。
      3. 如果該成員沒有中文名，請填寫音譯名稱。
      4. 嚴禁新增清單以外的成員。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The EXACT original English stage name provided" },
              cn: { type: Type.STRING, description: "Standard Traditional Chinese stage name" }
            },
            required: ["name", "cn"]
          }
        }
      }
    });

    const aiResults = JSON.parse(response.text || "[]");
    
    // Improved Mapping: Use normalized keys to ensure matches even with minor formatting differences
    return members.map(m => {
      const mNormal = normalizeString(m.name);
      const match = aiResults.find((r: any) => 
        normalizeString(r.name) === mNormal || 
        mNormal.includes(normalizeString(r.name)) ||
        normalizeString(r.name).includes(mNormal)
      );
      
      return {
        ...m,
        cn: match ? match.cn : m.cn
      };
    });
  } catch (error) {
    console.error("AI Enrichment failed:", error);
    return members; 
  }
};

export const parseMembers = (htmlString: string): Member[] => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    let names: string[] = [];

    // Improved selector to catch more variations of Member sections
    const headers = Array.from(doc.querySelectorAll('h2, h3, h4'));
    const memberHeader = headers.find(h => {
      const text = h.textContent?.toLowerCase() || '';
      return (text.includes('members') || text.includes('line-up') || text.includes('composition')) && 
             !text.includes('former') && 
             !text.includes('past');
    });

    if (memberHeader) {
      let el = memberHeader.parentElement?.nextElementSibling || memberHeader.nextElementSibling;
      let limit = 0;
      while (el && limit < 12) {
        if (el.tagName === 'UL') {
          el.querySelectorAll('li').forEach(li => {
            // Clean common patterns like "Name (Birth Name) - Role"
            let text = li.textContent?.replace(/\[.*?\]/g, '').split(/–|-|:|：/)[0].trim();
            if (text) names.push(text);
          });
          if (names.length > 0) break;
        }
        if (el.tagName === 'TABLE') {
          el.querySelectorAll('tr').forEach((row, i) => {
             if (i === 0) return;
             const cells = row.querySelectorAll('td');
             if (cells.length > 0) {
                 const firstCellText = cells[0].textContent?.trim();
                 // Avoid picking up Rank numbers or small IDs
                 if (firstCellText && firstCellText.length > 1 && !/^\d+$/.test(firstCellText)) {
                     names.push(firstCellText);
                 }
             }
          });
          if (names.length > 0) break;
        }
        el = el.nextElementSibling;
        limit++;
      }
    }

    // Fallback to Infobox if section parsing failed
    if (names.length === 0) {
      const infobox = doc.querySelector('.infobox');
      if (infobox) {
        const rows = infobox.querySelectorAll('tr');
        rows.forEach(row => {
          const th = row.querySelector('th');
          const thText = th?.textContent?.toLowerCase() || '';
          if (thText.includes('members') || thText.includes('current members')) {
            const td = row.querySelector('td');
            if (td) {
              const rawNames = td.innerText.split(/\n|,|·/).map(n => n.trim());
              rawNames.forEach(n => {
                  let clean = n.replace(/\[.*?\]/g, '').trim();
                  if (clean && clean.length > 1) names.push(clean);
              });
            }
          }
        });
      }
    }

    // Advanced cleaning: remove brackets, parenthesis, and roles
    const cleanedNames = names.map(n => 
      n.split('(')[0]
       .split('[')[0]
       .split('/')[0]
       .replace(/\(.*\)/g, '')
       .trim()
    ).filter(n => n.length > 1 && !/members/i.test(n));

    const uniqueNames = Array.from(new Set(cleanedNames));

    return uniqueNames.slice(0, 30).map(n => ({ 
      name: n,
      cn: '', 
      rank: 0 
    }));
  } catch (e) {
    console.error("Parse Error", e);
    return [];
  }
};

export const fetchFromWikiAuto = async (query: string): Promise<{ name: string; members: Member[]; logoUrl?: string }> => {
  const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(query + " k-pop group")}&format=json&srlimit=5`;
  
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.query?.search || searchData.query.search.length === 0) {
    throw new Error("No results found");
  }

  const results = searchData.query.search;
  let bestResult = null;
  for (const res of results) {
      if (isFuzzyMatch(query, res.title)) {
          bestResult = res;
          break;
      }
  }
  if (!bestResult) bestResult = results[0];

  const pageTitle = bestResult.title;
  const parseUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&redirects=true`;
  const imageUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=400&format=json&redirects=true`;

  const [parseRes, imageRes] = await Promise.all([
    fetch(parseUrl),
    fetch(imageUrl)
  ]);

  const parseData = await parseRes.json();
  const imageData = await imageRes.json();

  if (!parseData.parse) throw new Error("Could not parse page content");

  let members = parseMembers(parseData.parse.text['*']);
  const cleanName = pageTitle.replace(/\s\(.*?\)/, '');

  // AI Enrichment Step: Get Chinese names
  if (members.length > 0) {
    try {
      members = await enrichMembersWithAI(cleanName, members);
    } catch (e) {
      console.warn("AI enrichment skipped due to error", e);
    }
  }

  let logoUrl = '';
  try {
    const pages = imageData.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pages[pageId].thumbnail) {
        logoUrl = pages[pageId].thumbnail.source;
      }
    }
  } catch (e) {
    console.warn("Failed to extract image", e);
  }

  return { name: cleanName, members, logoUrl };
};

export const fetchGroupLogo = async (query: string): Promise<string | undefined> => {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(query + " k-pop")}&format=json&srlimit=3`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) return undefined;

    const results = searchData.query.search;
    let bestTitle = results[0].title;
    for (const res of results) {
        if (isFuzzyMatch(query, res.title)) {
            bestTitle = res.title;
            break;
        }
    }

    const imageUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&titles=${encodeURIComponent(bestTitle)}&prop=pageimages&pithumbsize=400&format=json&redirects=true`;
    const imageRes = await fetch(imageUrl);
    const imageData = await imageRes.json();

    const pages = imageData.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pages[pageId].thumbnail) return pages[pageId].thumbnail.source;
    }
  } catch (e) {
    console.warn("Error fetching logo:", e);
  }
  return undefined;
};
