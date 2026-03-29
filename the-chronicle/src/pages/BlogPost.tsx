import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { Calendar, User, ArrowLeft, Share2 } from 'lucide-react';
import { formatDate, generateDescription, generateKeywords } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { 
  FacebookShareButton, 
  TwitterShareButton, 
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon
} from 'react-share';

import { Helmet } from 'react-helmet-async';

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const shareUrl = window.location.href;

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('slug', slug)
          .eq('published', true)
          .single();
        
        if (data) {
          setPost(data as Post);
        } else {
          navigate('/404');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) return null;

  const seoDescription = post.excerpt || generateDescription(post.content);
  const seoKeywords = generateKeywords(post.title, post.content);

  return (
    <motion.article 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 py-16 space-y-12"
    >
      <Helmet>
        <title>{post.title} | The Chronicle</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        {post.featuredImage && <meta property="og:image" content={post.featuredImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={seoDescription} />
      </Helmet>
      
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-text3 uppercase tracking-widest hover:text-accent transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Articles
      </Link>

      <header className="space-y-8">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-accent-light text-accent text-[10px] font-bold uppercase tracking-widest rounded-full">
            {post.category || 'General'}
          </span>
          <span className="text-sm font-medium text-text3">
            {formatDate(post.createdAt)}
          </span>
        </div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-6xl font-black text-text leading-[1.1] tracking-tight"
        >
          {post.title}
        </motion.h1>

        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-accent font-bold">
            {post.author?.[0] || 'C'}
          </div>
          <div>
            <div className="text-sm font-bold text-text">{post.author || 'The Chronicle'}</div>
            <div className="text-xs text-text3">Staff Writer</div>
          </div>
        </div>

        <div className="aspect-[21/9] rounded-xl overflow-hidden bg-bg2 shadow-2xl">
          <img 
            src={post.featuredImage || `https://picsum.photos/seed/${post.slug}/1200/600`} 
            alt={post.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <aside className="lg:col-span-1 flex lg:flex-col gap-4 sticky top-24 h-fit">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              // Using a custom toast or simple feedback instead of alert
              console.log('Link copied to clipboard!');
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-border text-text3 hover:text-accent hover:border-accent transition-all"
            title="Copy Link"
          >
            <Share2 className="w-5 h-5" />
          </button>
          
          <TwitterShareButton url={shareUrl} title={post.title}>
            <TwitterIcon size={40} round />
          </TwitterShareButton>

          <FacebookShareButton url={shareUrl}>
            <FacebookIcon size={40} round />
          </FacebookShareButton>

          <LinkedinShareButton url={shareUrl} title={post.title}>
            <LinkedinIcon size={40} round />
          </LinkedinShareButton>
        </aside>

        <div className="lg:col-span-11 prose prose-slate prose-lg max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </div>
    </motion.article>
  );
};
