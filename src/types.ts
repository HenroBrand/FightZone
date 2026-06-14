export interface NewsItem {
  id: string;
  source: 'MMA Fighting' | 'Boxing Scene' | 'BJJ Heroes' | 'FIGHT ZONE';
  category: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING';
  title: string;
  link: string;
  pubDate: string; // ISO or human-readable format
  description: string;
  thumbnail: string;
}

export interface EventItem {
  id: string;
  name: string;
  sport: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING';
  date: string; // UTC or ISO string
  location: string;
  mainEvent: string;
  promotion: string;
  logoPlaceholder?: string;
  isCustom?: boolean;
}

export interface PinnedEvent {
  eventId: string;
  name: string;
  date: string; // SAST or UTC
  sport: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING';
  location: string;
  mainEvent: string;
  promotion: string;
  pinnedAt: string;
  userId: string;
}

export interface AISummaryResponse {
  summary: string;
  newsCount: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
