import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Search, X, Loader2 } from 'lucide-react';
import { formatDate, highlightText } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { Helmet } from 'react-helmet-async';

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Post[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const fetchPosts = async (query?: string) => {
    setLoading(true);
    try {
      let supabaseQuery = supabase
        .from('posts')
        .select('*')
        .eq('published', true);

      if (query) {
        // Try to use full-text search first (requires SQL setup)
        // Fallback to ilike if fts column doesn't exist
        const { data, error } = await supabaseQuery
          .textSearch('fts', query, { config: 'english', type: 'websearch' })
          .order('createdAt', { ascending: false })
          .limit(10);

        if (error) {
          // Fallback to standard ilike search if FTS is not set up
          const { data: fallbackData } = await supabase
            .from('posts')
            .select('*')
            .eq('published', true)
            .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
            .order('createdAt', { ascending: false })
            .limit(10);
          setPosts(fallbackData as Post[] || []);
        } else {
          setPosts(data as Post[]);
        }
      } else {
        const { data } = await supabaseQuery
          .order('createdAt', { ascending: false })
          .limit(10);
        setPosts(data as Post[] || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscription
    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setIsSearching(true);
        const { data } = await supabase
          .from('posts')
          .select('id, title, slug')
          .eq('published', true)
          .ilike('title', `%${searchTerm}%`)
          .limit(5);
        setSuggestions(data as Post[] || []);
        setShowSuggestions(true);
        setIsSearching(false);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowSuggestions(false);
    fetchPosts(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
    fetchPosts();
  };

  const HighlightedText = ({ text, query }: { text: string; query: string }) => {
    const parts = highlightText(text, query);
    if (typeof parts === 'string') return <span>{parts}</span>;
    
    return (
      <span>
        {parts.map((part, i) => (
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-accent/20 text-accent font-bold rounded-sm px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        ))}
      </span>
    );
  };

  if (loading && !searchTerm) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <Helmet>
        <title>ModernBlog | Insights for the Modern World</title>
        <meta name="description" content="Discover stories, thinking, and expertise from writers on any topic. Stay updated with the latest insights and trends." />
        <meta name="keywords" content="blog, insights, stories, expertise, modern world, articles, reading" />
        <meta property="og:title" content="ModernBlog | Insights for the Modern World" />
        <meta property="og:description" content="Discover stories, thinking, and expertise from writers on any topic. Stay updated with the latest insights and trends." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="ModernBlog | Insights for the Modern World" />
        <meta name="twitter:description" content="Discover stories, thinking, and expertise from writers on any topic." />
      </Helmet>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-bg2 to-surface border-b border-border py-24 px-4 overflow-hidden">
        <div className="absolute top-[-40%] left-[-20%] w-[600px] h-[600px] bg-radial from-accent-light to-transparent opacity-70 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-accent-light text-accent text-[10px] font-bold uppercase tracking-[3px] rounded-full"
          >
            ✦ Welcome to The Chronicle
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-text leading-[1.1] tracking-tight"
          >
            Stories Worth <em className="font-serif italic font-normal">Reading</em>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-text2 max-w-xl mx-auto leading-relaxed"
          >
            Thoughtful articles on technology, culture, design, and everything in between.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-md mx-auto relative"
          >
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search for articles..." 
                  className="w-full pl-12 pr-12 py-4 bg-surface border border-border rounded focus:outline-none focus:border-accent transition-all text-text shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 hover:text-accent"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button 
                type="submit"
                className="px-8 py-4 bg-accent text-white font-bold rounded hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
              >
                {loading && searchTerm ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (suggestions.length > 0 || isSearching) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
                >
                  {isSearching ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-text3 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {suggestions.map((suggestion) => (
                        <Link
                          key={suggestion.id}
                          to={`/post/${suggestion.slug}`}
                          className="block p-4 hover:bg-bg2 transition-colors text-left"
                          onClick={() => setShowSuggestions(false)}
                        >
                          <div className="text-sm font-bold text-text">
                            <HighlightedText text={suggestion.title} query={searchTerm} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-baseline justify-between mb-12 border-b border-border pb-6">
          <h2 className="text-3xl font-bold text-text">
            {searchTerm ? `Search Results for "${searchTerm}"` : 'Latest Articles'}
          </h2>
          <span className="text-sm font-medium text-text3 uppercase tracking-widest">
            {posts.length} article{posts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group flex flex-col bg-surface border border-border rounded-lg overflow-hidden hover:shadow-xl hover:border-accent2 transition-all duration-500"
              >
                <Link to={`/post/${post.slug}`} className="block aspect-video overflow-hidden bg-bg2">
                  <img 
                    src={post.featuredImage || `https://picsum.photos/seed/${post.slug}/800/450`} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </Link>
                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-accent-light text-accent text-[10px] font-bold uppercase tracking-widest rounded-full">
                      {post.category || 'General'}
                    </span>
                    <span className="text-xs font-medium text-text3">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-text mb-4 group-hover:text-accent transition-colors leading-tight">
                    <Link to={`/post/${post.slug}`}>
                      <HighlightedText text={post.title} query={searchTerm} />
                    </Link>
                  </h3>
                  <p className="text-text2 text-sm leading-relaxed line-clamp-3 mb-8 flex-grow">
                    <HighlightedText text={post.excerpt} query={searchTerm} />
                  </p>
                  <div className="pt-6 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-text3 uppercase tracking-wider">
                      ✍️ {post.author || 'The Chronicle'}
                    </span>
                    <Link 
                      to={`/post/${post.slug}`} 
                      className="text-sm font-bold text-accent flex items-center gap-2 group/link"
                    >
                      Read More
                      <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))
          ) : (
            <div className="col-span-full text-center py-32 bg-surface border border-dashed border-border rounded-xl">
              <div className="text-5xl mb-6">🔍</div>
              <h3 className="text-2xl font-bold text-text mb-2">No results found</h3>
              <p className="text-text2">Try a different search term or browse our latest posts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
