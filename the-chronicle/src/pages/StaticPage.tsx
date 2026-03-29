import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Page } from '../types';
import { useAuth } from '../components/SupabaseProvider';
import { Edit, Save, ArrowLeft, Layout, FileText, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { cn, generateDescription, generateKeywords } from '../lib/utils';
import { Helmet } from 'react-helmet-async';

export const StaticPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) return;
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (data) {
          const p = data as Page;
          setPage(p);
          setEditTitle(p.title);
          setEditContent(p.content);
        } else if (isAdmin) {
          // If admin, allow creating the page
          const newPage = {
            title: slug.charAt(0).toUpperCase() + slug.slice(1),
            slug,
            content: '# New Page\n\nAdd your content here...',
            updatedAt: new Date().toISOString()
          };
          setPage(newPage as Page);
          setEditTitle(newPage.title);
          setEditContent(newPage.content);
        } else {
          navigate('/404');
        }
      } catch (error) {
        console.error('Error fetching page:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug, isAdmin, navigate]);

  const handleSave = async () => {
    if (!slug) return;
    setSaving(true);
    try {
      const pageData = {
        title: editTitle,
        slug,
        content: editContent,
        updatedAt: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('pages')
        .upsert(pageData, { onConflict: 'slug' });
      
      if (error) throw error;
      
      setPage(pageData as Page);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving page:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!page) return null;

  const seoDescription = generateDescription(page.content);
  const seoKeywords = generateKeywords(page.title, page.content);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Helmet>
        <title>{page.title} | ModernBlog</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
      </Helmet>
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          {isEditing ? (
            <input 
              type="text" 
              className="bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-600 w-full"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          ) : (
            page.title
          )}
        </h1>
        
        {isAdmin && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Page
              </button>
            )}
          </div>
        )}
      </header>

      <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
        {isEditing ? (
          <textarea 
            className="w-full min-h-[500px] bg-slate-50 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
        ) : (
          <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600">
            <ReactMarkdown>{page.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
