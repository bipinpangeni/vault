import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useAuth } from '../components/SupabaseProvider';
import { Save, ArrowLeft, Image as ImageIcon, Eye, EyeOff, Layout, Type, FileText, CheckCircle2, Upload, Loader2, X, AlertCircle } from 'lucide-react';
import { slugify, cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { MarkdownToolbar } from '../components/MarkdownToolbar';

export const AdminEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [dbError, setDbError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          const post = data as Post;
          setTitle(post.title);
          setSlug(post.slug);
          setExcerpt(post.excerpt);
          setContent(post.content);
          setFeaturedImage(post.featuredImage || '');
          setCategory(post.category || '');
          setAuthor(post.author || '');
          setPublished(post.published);
        }
      } catch (error: any) {
        console.error('Error fetching post:', error);
        if (error.code === '42P01') {
          setDbError('DATABASE_TABLES_MISSING');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!id) {
      setSlug(slugify(val));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      setUploadProgress(90);
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      setFeaturedImage(publicUrl);
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please ensure you have created a "blog-images" bucket in Supabase Storage with public access.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (!title || !slug || !content) {
      alert('Please fill in all required fields (Title, Slug, Content)');
      return;
    }

    setSaving(true);
    try {
      const postData = {
        title,
        slug,
        excerpt,
        content,
        featuredImage,
        category,
        author,
        published,
        updatedAt: new Date().toISOString(),
      };

      if (id) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('posts')
          .insert({
            ...postData,
            createdAt: new Date().toISOString(),
            authorId: user?.id,
          });
        if (error) throw error;
      }
      navigate('/admin');
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Error saving post. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

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
            You need to create the database tables in Supabase before you can write stories.
          </p>
        </div>
        <div className="bg-bg2 p-8 rounded-xl border border-border text-left space-y-6">
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
);`}
          </pre>
          <Link 
            to="/admin"
            className="block w-full py-4 bg-accent text-white rounded font-bold hover:bg-accent/90 transition-all text-center uppercase tracking-widest text-xs"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 text-text3 hover:text-accent hover:bg-accent-light rounded-lg transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-text tracking-tight">
              {id ? 'Edit Post' : 'Create New Post'}
            </h1>
            <p className="text-text3 text-sm font-medium">Draft your story and share it with the world.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setPreviewMode(!previewMode)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded font-bold text-sm transition-all border",
              previewMode ? "bg-accent-light text-accent border-accent/20" : "bg-surface text-text2 border-border hover:bg-bg2"
            )}
          >
            {previewMode ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewMode ? 'Edit Mode' : 'Live Preview'}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded font-bold text-sm hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {id ? 'Update Post' : 'Publish Post'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {previewMode ? (
            <div className="bg-surface p-10 rounded-lg border border-border min-h-[600px] prose prose-slate max-w-none">
              <h1 className="text-4xl font-black mb-8">{title || 'Post Title'}</h1>
              {featuredImage && (
                <img src={featuredImage} alt="" className="w-full rounded-lg mb-8 object-cover aspect-video shadow-xl" referrerPolicy="no-referrer" />
              )}
              <ReactMarkdown>{content || '*No content yet...*'}</ReactMarkdown>
            </div>
          ) : (
            <div className="bg-surface p-8 rounded-lg border border-border space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Post Title
                </label>
                <input 
                  type="text" 
                  placeholder="Enter a catchy title..." 
                  className="w-full px-4 py-4 bg-bg2 border border-border rounded focus:outline-none focus:border-accent text-2xl font-black text-text transition-all"
                  value={title}
                  onChange={handleTitleChange}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Content (Markdown Supported)
                </label>
                <div className="border border-border rounded-lg overflow-hidden focus-within:border-accent transition-all">
                  <MarkdownToolbar 
                    textareaRef={textareaRef} 
                    onUpdate={setContent} 
                    content={content} 
                  />
                  <textarea 
                    ref={textareaRef}
                    placeholder="Tell your story..." 
                    className="w-full px-6 py-6 bg-bg2 focus:outline-none min-h-[600px] font-mono text-sm leading-relaxed border-none text-text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="bg-surface p-8 rounded-lg border border-border space-y-8">
            <h3 className="text-xs font-bold text-text3 uppercase tracking-[3px] border-b border-border pb-4">Post Settings</h3>
            
            <div className="space-y-3">
              <label className="text-xs font-bold text-text3 uppercase tracking-widest">Category</label>
              <input 
                type="text" 
                placeholder="e.g. Technology, Design..." 
                className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent text-sm text-text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-text3 uppercase tracking-widest">Author Name</label>
              <input 
                type="text" 
                placeholder="The Chronicle Staff" 
                className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent text-sm text-text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-text3 uppercase tracking-widest">URL Slug</label>
              <div className="flex items-center gap-2 text-sm text-text3 bg-bg2 p-3 rounded border border-border">
                <span className="opacity-50">/post/</span>
                <input 
                  type="text" 
                  className="bg-transparent text-text font-bold focus:outline-none flex-grow"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-text3 uppercase tracking-widest">Excerpt</label>
              <textarea 
                placeholder="Brief summary for the homepage..." 
                className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent text-sm min-h-[120px] text-text leading-relaxed"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Featured Image
                </label>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-[10px] font-bold text-accent hover:text-accent/80 flex items-center gap-1.5 uppercase tracking-widest disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <input 
                type="text" 
                placeholder="https://images.unsplash.com/..." 
                className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent text-xs text-text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
              />
              {featuredImage && (
                <div className="mt-4 rounded-lg overflow-hidden border border-border aspect-video relative group shadow-lg">
                  <img src={featuredImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setFeaturedImage('')}
                    className="absolute top-2 right-2 bg-text text-bg p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-border">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-text">Publish Post</div>
                  <div className="text-xs text-text3">Make this post visible to everyone.</div>
                </div>
                <div className="relative inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-accent-light p-8 rounded-lg border border-accent/10 space-y-4">
            <div className="flex items-center gap-3 text-accent">
              <CheckCircle2 className="w-5 h-5" />
              <h4 className="font-bold text-sm uppercase tracking-widest">Pro Tips</h4>
            </div>
            <ul className="text-xs text-accent/80 space-y-3 list-disc pl-4 font-medium leading-relaxed">
              <li>Use # for H1, ## for H2 titles.</li>
              <li>Use [text](url) for links.</li>
              <li>Use ![alt](url) for images in content.</li>
              <li>Slug is auto-generated but can be edited.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};
