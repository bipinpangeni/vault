export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  published: boolean;
  createdAt: string;
  updatedAt?: string;
  authorId: string;
  author?: string;
  category?: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
}

export interface Settings {
  siteName: string;
  siteDescription?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
