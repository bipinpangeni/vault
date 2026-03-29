import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, Search, LayoutGrid, List as ListIcon, AlertCircle } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { useAuth } from '../components/SupabaseProvider';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      if (error.code === '42P01') {
        setDbError('DATABASE_TABLES_MISSING');
      }
    } else {
      setPosts(data as Post[]);
      setDbError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscription
    const subscription = supabase
      .channel('admin:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (dbError === 'DATABASE_TABLES_MISSING') {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6 text-center space-y-8">
        <div className="inline-block p-6 bg-red-50 rounded-full">
          <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-serif font-bold text-text">Database Tables Missing</h1>
          <p className="text-text3 text-lg max-w-2xl mx-auto">
            It looks like you haven't created the necessary database tables in Supabase yet. 
            Without these tables, you won't be able to save or view any stories.
          </p>
        </div>
        <div className="bg-bg2 p-8 rounded-xl border border-border text-left space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
            <p className="font-bold text-text uppercase tracking-widest text-xs">Go to Supabase SQL Editor</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-text2">Copy and run this code in your Supabase SQL Editor:</p>
            <pre className="bg-black text-emerald-400 p-6 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed shadow-2xl">
{`-- Create Posts Table
create table posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  "featuredImage" text,
  published boolean default false,
  "createdAt" timestamp with time zone default now(),
  "updatedAt" timestamp with time zone default now(),
  "authorId" uuid references auth.users(id),
  author text,
  category text
);

-- Create Pages Table
create table pages (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  content text not null,
  "updatedAt" timestamp with time zone default now()
);

-- Enable Realtime
alter publication supabase_realtime add table posts;`}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-accent text-white rounded font-bold hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 uppercase tracking-widest text-xs"
          >
            I've run the code, refresh now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border pb-12">
        <div className="space-y-4">
          <div className="inline-block px-3 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[2px] rounded">
            Admin Portal
          </div>
          <h1 className="text-5xl font-serif font-bold text-text tracking-tight">Dashboard</h1>
          <p className="text-text3 text-lg max-w-md font-medium">Manage your stories, drafts, and published content for The Chronicle.</p>
        </div>
        <Link 
          to="/admin/new" 
          className="inline-flex items-center justify-center gap-3 bg-accent text-white px-8 py-4 rounded font-bold hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Write New Story
        </Link>
      </header>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-[400px] group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text3 w-4 h-4 group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            placeholder="Search stories..." 
            className="w-full pl-12 pr-4 py-4 bg-bg border border-border rounded focus:outline-none focus:border-accent text-sm text-text transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 bg-bg2 p-1.5 rounded border border-border">
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-2 rounded transition-all", viewMode === 'list' ? "bg-white text-accent shadow-sm" : "text-text3 hover:text-text")}
          >
            <ListIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-2 rounded transition-all", viewMode === 'grid' ? "bg-white text-accent shadow-sm" : "text-text3 hover:text-text")}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg2 border-b border-border">
                <th className="px-8 py-5 text-[10px] font-bold text-text3 uppercase tracking-[2px]">Story</th>
                <th className="px-8 py-5 text-[10px] font-bold text-text3 uppercase tracking-[2px]">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-text3 uppercase tracking-[2px]">Date</th>
                <th className="px-8 py-5 text-[10px] font-bold text-text3 uppercase tracking-[2px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-bg2/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 border border-border bg-bg2">
                        <img 
                          src={post.featuredImage || `https://picsum.photos/seed/${post.slug}/100/100`} 
                          alt="" 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-base font-bold text-text group-hover:text-accent transition-colors">{post.title}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent px-2 py-0.5 bg-accent/10 rounded">{post.category || 'Uncategorized'}</span>
                          <span className="text-xs text-text3">/{post.slug}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {post.published ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-sm text-text3 font-medium">
                    {formatDate(post.createdAt)}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/edit/${post.id}`} className="p-2.5 text-text3 hover:text-accent hover:bg-accent/5 rounded transition-all">
                        <Edit className="w-5 h-5" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(post.id)}
                        className="p-2.5 text-text3 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg border border-border overflow-hidden hover:shadow-xl transition-all group">
              <div className="aspect-[16/10] relative overflow-hidden">
                <img 
                  src={post.featuredImage || `https://picsum.photos/seed/${post.slug}/400/250`} 
                  alt="" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4">
                  {post.published ? (
                    <span className="bg-emerald-500 text-white p-2 rounded shadow-xl">
                      <Eye className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="bg-amber-500 text-white p-2 rounded shadow-xl">
                      <EyeOff className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-white/90 backdrop-blur-sm text-text text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded">
                    {post.category || 'Uncategorized'}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="font-bold text-xl text-text line-clamp-2 group-hover:text-accent transition-colors leading-tight">{post.title}</h3>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-xs text-text3 font-medium">{formatDate(post.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/edit/${post.id}`} className="p-2 text-text3 hover:text-accent transition-colors">
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-text3 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
