export interface ContentBlock {
  type: 'text' | 'heading' | 'image';
  content?: string;
  url?: string;
  links?: { text: string; url: string }[];
}

export interface ExtractedContent {
  title: string;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
  content: string;
  summary: string;
  tags: string[];
  images?: string[];
  blocks?: ContentBlock[];
  coverImage?: string;
  tweetUrl?: string;
  createdAt?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  ERROR = 'ERROR'
}
