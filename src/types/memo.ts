export interface Memo {
  id: string;
  title: string;
  audioUrl?: string;
  transcript: string;
  summary: string;
  categories: string[];
  tasks: string[];
  isPublic: boolean;
  createdAt: Date;
  duration: number;
  author: {
    name: string;
    avatar?: string;
  };
  likes: number;
  comments: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}
