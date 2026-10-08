
export interface Member {
  name: string;
  cn: string;
  rank: number; // 0 = None, 1 = Bias (Heart), 2 = Ult (Crown)
}

export interface GroupDetails {
  reason?: string;      // 入坑契機
  visual?: string;      // 最Get的颜
  favShip?: string;     // 最嗑的CP
  leastShip?: string;   // 最雷的CP
  favSubUnit?: string;  // 最喜欢的小分队
  topSong?: string;     // 仙曲TOP1
}

export type EventType = 'stan' | 'restan' | 'fade' | 'unstan';

export interface TimelineEvent {
  date: string;       // YYYY-MM
  type: EventType;
  note?: string;      // Optional short note
}

export interface GroupRatings {
  songs: number;
  stage: number;
  variety: number;
  visual: number;
}

export interface Group {
  id: string;
  name: string;
  stanDate: string;   
  unstanDate?: string; 
  timeline?: TimelineEvent[]; 
  isExpanded: boolean;
  members: Member[];
  logoUrl?: string;
  details?: GroupDetails;
  ratings?: GroupRatings; // New: Rating data
}

export interface PresetData {
  n?: string; // Name
  m?: string[][]; // Members [Name, CN]
  ref?: string; // Reference to another key
  l?: string; // Logo URL
}

export type PresetDB = Record<string, PresetData>;

export type ToastType = 'success' | 'error';
