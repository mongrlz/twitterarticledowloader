export interface ExtractedContent {
  title: string;
  author: string;
  content: string;
  summary: string;
  tags: string[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  ERROR = 'ERROR'
}
