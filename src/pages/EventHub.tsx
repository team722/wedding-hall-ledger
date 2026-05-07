import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useAuth } from '../auth';
import { Post, News, Document as DocType } from '../types';
import { MessageSquare, Newspaper, FileText, Send, Trash2, Plus, ExternalLink, Image as ImageIcon, Youtube, X, Loader2, CloudCog, Eye, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { safeParseDate } from '../lib/dateUtils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ReactPlayer from 'react-player';
import DOMPurify from 'dompurify';
import ImageWithShimmer from '../components/ImageWithShimmer';

const Player = ReactPlayer as any;

function ExpandableContent({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setShowButton(contentRef.current.scrollHeight > 120);
    }
  }, [content]);

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={contentRef}
        className={`text-stone-700 prose prose-stone max-w-none mb-2 overflow-hidden transition-all duration-300 [overflow-wrap:anywhere] [&_img]:!max-w-full [&_img]:!h-auto [&_iframe]:!max-w-full ${!isExpanded ? 'max-h-[120px]' : 'max-h-none'}`}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
      />
      {showButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-stone-900 text-[10px] font-bold uppercase tracking-widest hover:underline mb-4 flex items-center"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

export default function EventHub() {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();
  const isViewerPortal = location.pathname.startsWith('/viewer');
  const canEdit = isAdmin && !isViewerPortal;
  const [activeTab, setActiveTab] = useState<'posts' | 'news' | 'documents'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);

  // Post states
  const [newPostContent, setNewPostContent] = useState('');
  const [postYoutubeUrl, setPostYoutubeUrl] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [postSortOrder, setPostSortOrder] = useState<'desc' | 'asc'>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // News states
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', youtubeUrl: '' });
  const [newsImage, setNewsImage] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState<string | null>(null);
  const newsFileInputRef = useRef<HTMLInputElement>(null);

  // Doc states
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', url: '', category: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Document Viewer State
  const [previewDoc, setPreviewDoc] = useState<DocType | null>(null);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; collectionName: string; id: string } | null>(null);

  // Edit states
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocType | null>(null);
  
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    youtubeUrl: '',
    url: '',
    category: ''
  });
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  console.log(docForm, "docFile", docFileInputRef, docFile);

  useEffect(() => {
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', postSortOrder));
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }, (error) => {
      console.error('Firestore Error in posts listener:', error);
    });

    return () => unsubscribePosts();
  }, [postSortOrder]);

  useEffect(() => {
    const qNews = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribeNews = onSnapshot(qNews, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    }, (error) => {
      console.error('Firestore Error in news listener:', error);
    });

    const qDocs = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
    const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocType)));
    }, (error) => {
      console.error('Firestore Error in documents listener:', error);
    });

    return () => {
      unsubscribeNews();
      unsubscribeDocs();
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void, setPreview: (p: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `event-hub/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.error('Firebase Storage upload failed:', error);
      throw new Error('Image upload failed. Please ensure you are logged in and rules are set.');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !profile) return;

    setIsUploading(true);
    try {
      let imageUrl = '';
      if (postImage) {
        imageUrl = await uploadImage(postImage);
      }

      const postDoc = await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName || profile.email,
        content: newPostContent,
        imageUrl: imageUrl || null,
        youtubeUrl: postYoutubeUrl || null,
        createdAt: new Date().toISOString(),
      });

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'create',
        entityType: 'post',
        entityId: postDoc.id,
        category: 'activity',
        changes: { content: newPostContent.slice(0, 100) + '...' },
        performedBy: profile.uid,
        timestamp: serverTimestamp(),
      });

      setNewPostContent('');
      setPostYoutubeUrl('');
      setPostImage(null);
      setPostImagePreview(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.content.trim() || !profile) return;

    setIsUploading(true);
    try {
      let imageUrl = '';
      if (newsImage) {
        imageUrl = await uploadImage(newsImage);
      }

      const newsDoc = await addDoc(collection(db, 'news'), {
        title: newsForm.title,
        content: newsForm.content,
        youtubeUrl: newsForm.youtubeUrl || null,
        imageUrl: imageUrl || null,
        authorId: profile.uid,
        createdAt: new Date().toISOString(),
      });

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'create',
        entityType: 'news',
        entityId: newsDoc.id,
        category: 'activity',
        changes: { title: newsForm.title },
        performedBy: profile.uid,
        timestamp: serverTimestamp(),
      });

      setNewsForm({ title: '', content: '', youtubeUrl: '' });
      setNewsImage(null);
      setNewsImagePreview(null);
      setIsAddingNews(false);
    } catch (error) {
      console.error('Error creating news:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim() || (!docForm.url.trim() && !docFile) || !profile) return;

    setIsUploading(true);
    try {
      let finalUrl = docForm.url;
      let fileName = '';

      if (docFile) {
        try {
          const storageRef = ref(storage, `documents/${Date.now()}_${docFile.name}`);
          await uploadBytes(storageRef, docFile);
          finalUrl = await getDownloadURL(storageRef);
          fileName = docFile.name;
        } catch (error: any) {
          console.error('Firebase Storage upload failed:', error);
          alert('Document upload failed. Please try again.');
          setIsUploading(false);
          return;
        }
      }

      const docRef = await addDoc(collection(db, 'documents'), {
        title: docForm.title,
        url: finalUrl,
        fileName: fileName || null,
        category: docForm.category,
        createdAt: new Date().toISOString(),
      });

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'create',
        entityType: 'document',
        entityId: docRef.id,
        category: 'activity',
        changes: { title: docForm.title, category: docForm.category },
        performedBy: profile.uid,
        timestamp: serverTimestamp(),
      });

      setDocForm({ title: '', url: '', category: '' });
      setDocFile(null);
      setIsAddingDoc(false);
    } catch (error) {
      console.error('Error creating document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (collectionName: string, id: string) => {
    setDeleteConfirm({ isOpen: true, collectionName, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { collectionName, id } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      await deleteDoc(doc(db, collectionName, id));

      // Audit Log
      if (profile) {
        await addDoc(collection(db, 'auditLogs'), {
          action: 'delete',
          entityType: collectionName.slice(0, -1), // posts -> post, news -> news (special case), documents -> document
          entityId: id,
          category: 'activity',
          changes: { deleted: true },
          performedBy: profile.uid,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const startEditingPost = (post: Post) => {
    setEditingPost(post);
    setEditForm({
      title: '',
      content: post.content,
      youtubeUrl: post.youtubeUrl || '',
      url: '',
      category: ''
    });
    setEditImagePreview(post.imageUrl || null);
    setEditImage(null);
  };

  const startEditingNews = (n: News) => {
    setEditingNews(n);
    setEditForm({
      title: n.title,
      content: n.content,
      youtubeUrl: n.youtubeUrl || '',
      url: '',
      category: ''
    });
    setEditImagePreview(n.imageUrl || null);
    setEditImage(null);
  };

  const startEditingDoc = (d: DocType) => {
    setEditingDoc(d);
    setEditForm({
      title: d.title,
      content: '',
      youtubeUrl: '',
      url: d.url,
      category: d.category || ''
    });
    setEditImage(null);
    setEditImagePreview(null);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !editForm.content.trim() || !profile) return;

    setIsUploading(true);
    try {
      let imageUrl = editingPost.imageUrl || '';
      if (editImage) {
        imageUrl = await uploadImage(editImage);
      } else if (editImagePreview === null) {
        imageUrl = '';
      }

      const updates = {
        content: editForm.content,
        imageUrl: imageUrl || null,
        youtubeUrl: editForm.youtubeUrl || null,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'posts', editingPost.id), updates);

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'update',
        entityType: 'post',
        entityId: editingPost.id,
        category: 'activity',
        changes: updates,
        performedBy: profile.uid,
        timestamp: serverTimestamp(),
      });

      setEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews || !editForm.title.trim() || !editForm.content.trim() || !profile) return;

    setIsUploading(true);
    try {
      let imageUrl = editingNews.imageUrl || '';
      if (editImage) {
        imageUrl = await uploadImage(editImage);
      } else if (editImagePreview === null) {
        imageUrl = '';
      }

      const updates = {
        title: editForm.title,
        content: editForm.content,
        imageUrl: imageUrl || null,
        youtubeUrl: editForm.youtubeUrl || null,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'news', editingNews.id), updates);

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'update',
        entityType: 'news',
        entityId: editingNews.id,
        category: 'activity',
        changes: updates,
        performedBy: profile.uid,
        timestamp: serverTimestamp(),
      });

      setEditingNews(null);
    } catch (error) {
      console.error('Error updating news:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editForm.title.trim() || !profile) return;

    setIsUploading(true);
    try {
      let finalUrl = editForm.url;
      let fileName = editingDoc.fileName || '';

      if (editImage) { // Re-using editImage as a generic file state
        try {
          const storageRef = ref(storage, `documents/${Date.now()}_${editImage.name}`);
          await uploadBytes(storageRef, editImage);
          finalUrl = await getDownloadURL(storageRef);
          fileName = editImage.name;
        } catch (error: any) {
          console.error('Firebase Storage upload failed:', error);
          alert('Document upload failed.');
          setIsUploading(false);
          return;
        }
      }

      const updates = {
        title: editForm.title,
        url: finalUrl,
        fileName: fileName || null,
        category: editForm.category,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'documents', editingDoc.id), updates);

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'update',
        entityType: 'document',
        entityId: editingDoc.id,
        category: 'activity',
        changes: updates,
        performedBy: profile.uid,
        timestamp: serverTimestamp(),
      });

      setEditingDoc(null);
    } catch (error) {
      console.error('Error updating document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeedData = async () => {
    if (!profile || !isAdmin) return;
    setIsUploading(true);
    try {
      // Sample Posts
      const samplePosts = [
        {
          content: '<p>Welcome to our community hub! This is a place to share updates and connect.</p>',
          authorId: profile.uid,
          authorName: profile.displayName || profile.email,
          createdAt: new Date().toISOString(),
          imageUrl: 'https://picsum.photos/seed/community/800/600'
        },
        {
          content: '<p>Don\'t forget to check the documents section for the latest hall guidelines and pricing.</p>',
          authorId: profile.uid,
          authorName: profile.displayName || profile.email,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          content: '<p>We just added a new "Check Availability" feature to the home page! Planning your event is now easier than ever.</p>',
          authorId: profile.uid,
          authorName: profile.displayName || profile.email,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          imageUrl: 'https://picsum.photos/seed/calendar/800/600'
        }
      ];

      // Sample News
      const sampleNews = [
        {
          title: 'Grand Opening Celebration',
          content: '<p>We are excited to announce the grand opening of our newly renovated Crystal Hall! Join us for a tour this weekend.</p>',
          authorId: profile.uid,
          createdAt: new Date().toISOString(),
          imageUrl: 'https://picsum.photos/seed/hall/800/600'
        },
        {
          title: 'New Catering Partners',
          content: '<p>We have partnered with three new premium catering services to provide even more variety for your special events.</p>',
          authorId: profile.uid,
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          imageUrl: 'https://picsum.photos/seed/catering/800/600'
        }
      ];

      // Sample Docs
      const sampleDocs = [
        {
          title: 'Hall Rental Guidelines 2024',
          url: 'https://www.google.com',
          category: 'Guidelines',
          createdAt: new Date().toISOString(),
        },
        {
          title: 'Wedding Planning Checklist',
          url: 'https://www.google.com',
          category: 'Resources',
          createdAt: new Date().toISOString(),
        },
        {
          title: 'Catering Menu Options',
          url: 'https://www.google.com',
          category: 'Resources',
          createdAt: new Date().toISOString(),
        }
      ];

      for (const p of samplePosts) await addDoc(collection(db, 'posts'), p);
      for (const n of sampleNews) await addDoc(collection(db, 'news'), n);
      for (const d of sampleDocs) await addDoc(collection(db, 'documents'), d);

      alert('Sample data seeded successfully!');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to seed data. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
    'list', 'indent',
    'link', 'color', 'background',
    'script', 'align', 'direction'
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic text-stone-900">  b</h2>
          <p className="text-stone-500 mt-1 uppercase tracking-widest text-xs">Community, News & Resources</p>
        </div>

        <div className="flex bg-stone-200 p-1 rounded-lg overflow-x-auto whitespace-nowrap scrollbar-hide min-w-0 max-w-full">
          {canEdit && (
            <button
              onClick={handleSeedData}
              disabled={isUploading}
              className="hidden items-center px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors mr-2 shrink-0"
              title="Seed sample data for testing"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              Seed Data
            </button>
          )}
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center flex-1 justify-center px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${activeTab === 'posts' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Posts
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center flex-1 justify-center px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${activeTab === 'news' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <Newspaper className="w-4 h-4 mr-2" />
            News
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center flex-1 justify-center px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${activeTab === 'documents' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Create Post - Admin Only */}
            {canEdit && (
              <form onSubmit={handleCreatePost} className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <div className="mb-4">
                  <ReactQuill
                    theme="snow"
                    value={newPostContent}
                    onChange={setNewPostContent}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Share something with the community..."
                    className="bg-stone-50 rounded-lg overflow-hidden [&_.ql-editor]:min-h-[250px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="relative hidden">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Youtube className="h-4 w-4 text-stone-400" />
                    </div>
                    <input
                      type="url"
                      placeholder="YouTube URL (optional)"
                      value={postYoutubeUrl}
                      onChange={(e) => setPostYoutubeUrl(e.target.value)}
                      className="block w-full pl-10 p-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {postImage ? 'Change Image' : 'Add Image'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleImageChange(e, setPostImage, setPostImagePreview)}
                      className="hidden"
                      accept="image/*"
                    />
                    {postImage && (
                      <button
                        type="button"
                        onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                        className="p-2 text-stone-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {postImagePreview && (
                  <div className="mb-4 relative inline-block">
                    <img src={postImagePreview} alt="Preview" className="h-32 w-auto rounded-lg border border-stone-200" />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newPostContent.trim() || isUploading}
                    className="flex items-center px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Post
                  </button>
                </div>
              </form>
            )}

            {/* Posts List Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif italic text-stone-900 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-stone-400" />
                Community Pulse
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sort:</span>
                <select
                  value={postSortOrder}
                  onChange={(e) => setPostSortOrder(e.target.value as 'desc' | 'asc')}
                  className="text-xs bg-stone-100 border-none rounded-lg px-2 py-1 focus:ring-0 text-stone-600 font-medium"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center text-stone-600 font-bold">
                        {post.authorName[0].toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-stone-900">{post.authorName}</p>
                        <p className="text-xs text-stone-500">
                          {(() => {
                            const date = safeParseDate(post.createdAt);
                            return date ? format(date, 'MMM d, yyyy • h:mm a') : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditingPost(post)}
                          className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                          title="Edit Post"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete('posts', post.id)}
                          className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <ExpandableContent content={post.content} />

                  {post.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-stone-200">
                      <ImageWithShimmer src={post.imageUrl} alt="Post content" className="w-full h-auto max-h-[300px] object-cover" minHeightClass="min-h-[250px]" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {post.youtubeUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-stone-200 aspect-video">
                      <Player url={post.youtubeUrl} width="100%" height="100%" controls />
                    </div>
                  )}
                </div>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-stone-300">
                  <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500">No posts yet. Be the first to share!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-6">
            {canEdit && !isAddingNews && (
              <button
                onClick={() => setIsAddingNews(true)}
                className="w-full py-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-all flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Post New Announcement
              </button>
            )}

            {isAddingNews && (
              <form onSubmit={handleCreateNews} className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
                <input
                  type="text"
                  placeholder="Announcement Title"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  required
                />

                <div className="bg-stone-50 rounded-lg overflow-hidden border border-stone-200">
                  <ReactQuill
                    theme="snow"
                    value={newsForm.content}
                    onChange={(val) => setNewsForm({ ...newsForm, content: val })}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Detailed content..."
                    className="[&_.ql-editor]:min-h-[350px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-12">
                  <div className="relative hidden">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Youtube className="h-4 w-4 text-stone-400" />
                    </div>
                    <input
                      type="url"
                      placeholder="YouTube URL (optional)"
                      value={newsForm.youtubeUrl}
                      onChange={(e) => setNewsForm({ ...newsForm, youtubeUrl: e.target.value })}
                      className="block w-full pl-10 p-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => newsFileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {newsImage ? 'Change Image' : 'Add Image'}
                    </button>
                    <input
                      type="file"
                      ref={newsFileInputRef}
                      onChange={(e) => handleImageChange(e, setNewsImage, setNewsImagePreview)}
                      className="hidden"
                      accept="image/*"
                    />
                    {newsImage && (
                      <button
                        type="button"
                        onClick={() => { setNewsImage(null); setNewsImagePreview(null); }}
                        className="p-2 text-stone-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {newsImagePreview && (
                  <div className="relative inline-block">
                    <img src={newsImagePreview} alt="Preview" className="h-32 w-auto rounded-lg border border-stone-200" />
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingNews(false)}
                    className="px-6 py-2 text-stone-600 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex items-center px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                  >
                    {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Publish
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {news.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden group">
                  {(item as any).imageUrl && (
                    <ImageWithShimmer src={(item as any).imageUrl} alt={item.title} className="w-full h-40 object-cover border-b border-stone-200" minHeightClass="min-h-[160px]" referrerPolicy="no-referrer" />
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        {(() => {
                          const date = safeParseDate(item.createdAt);
                          return date ? format(date, 'MMM d, yyyy') : 'N/A';
                        })()}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditingNews(item)}
                            className="p-1 text-stone-400 hover:text-blue-600 transition-colors"
                            title="Edit Announcement"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('news', item.id)}
                            className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                            title="Delete Announcement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-serif italic text-stone-900 mb-4">{item.title}</h3>
                    <ExpandableContent content={item.content} />
                    {item.youtubeUrl && (
                      <div className="rounded-xl overflow-hidden border border-stone-200 aspect-video">
                        <Player url={item.youtubeUrl} width="100%" height="100%" controls />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {news.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-stone-300">
                  <Newspaper className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500">No news or announcements yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            {canEdit && !isAddingDoc && (
              <button
                onClick={() => setIsAddingDoc(true)}
                className="w-full py-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-all flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Document
              </button>
            )}

            {isAddingDoc && (
              <form onSubmit={handleCreateDoc} className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Document Title"
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g., Guidelines, Forms)"
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 w-full">
                    <input
                      type="url"
                      placeholder="External URL (optional if uploading file)"
                      value={docForm.url}
                      onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                      disabled={!!docFile}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <span className="text-stone-400 text-sm font-medium">OR</span>
                    <button
                      type="button"
                      onClick={() => docFileInputRef.current?.click()}
                      className="flex items-center px-4 py-3 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {docFile ? 'Change File' : 'Upload File'}
                    </button>
                    <input
                      type="file"
                      ref={docFileInputRef}
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {docFile && (
                      <div className="flex flex-1 min-w-0 items-center justify-between gap-2 bg-stone-100 px-3 py-2 rounded-lg max-w-full">
                        <span className="text-xs text-stone-600 truncate">{docFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setDocFile(null)}
                          className="text-stone-400 hover:text-red-600 shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsAddingDoc(false); setDocFile(null); }}
                    className="px-6 py-2 text-stone-600 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex items-center px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                  >
                    {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Document
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 flex items-center group">
                  <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center text-stone-600 mr-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-stone-900 truncate">{doc.title}</h4>
                    <p className="text-xs text-stone-500 uppercase tracking-tighter">{doc.category || 'General'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                      title="Preview Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditingDoc(doc)}
                          className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                          title="Edit Document"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete('documents', doc.id)}
                          className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-stone-300">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500">No documents available yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/90 backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif italic text-lg text-stone-900 truncate">{previewDoc.title}</h3>
                  <p className="text-xs text-stone-500 uppercase tracking-widest">{previewDoc.category || 'Document'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Browser
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-stone-100 overflow-hidden relative">
              {(() => {
                const url = previewDoc.url.toLowerCase();
                const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)(\?|#|$)/) != null;
                const isPdf = url.match(/\.pdf(\?|#|$)/) != null || url.includes('/pdf') || url.includes('alt=media');

                if (isImage) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                      <img src={previewDoc.url} alt={previewDoc.title} className="max-w-full max-h-full object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                    </div>
                  );
                } else if (isPdf) {
                  return (
                    <iframe
                      src={previewDoc.url}
                      className="w-full h-full border-none"
                      title={previewDoc.title}
                    />
                  );
                } else {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                      <FileText className="w-16 h-16 text-stone-300 mb-6" />
                      <h4 className="text-xl font-serif italic text-stone-900 mb-2">Unsupported Preview Format</h4>
                      <p className="text-stone-500 text-sm max-w-md mb-8">
                        This document type cannot be embedded securely. Please open it in a new window to view its contents.
                      </p>
                      <a
                        href={previewDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-6 py-3 text-sm font-medium text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/20"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open External Document
                      </a>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}



      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-serif italic text-stone-900">Edit Post</h3>
              <button onClick={() => setEditingPost(null)} className="p-2 text-stone-400 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdatePost} className="p-6 overflow-y-auto space-y-4">
              <ReactQuill
                theme="snow"
                value={editForm.content}
                onChange={(val) => setEditForm({ ...editForm, content: val })}
                modules={quillModules}
                formats={quillFormats}
                className="bg-stone-50 rounded-lg overflow-hidden [&_.ql-editor]:min-h-[200px]"
              />
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {editImage || editImagePreview ? 'Change Image' : 'Add Image'}
                </button>
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => handleImageChange(e, setEditImage, setEditImagePreview)}
                  className="hidden"
                  accept="image/*"
                />
                {(editImage || editImagePreview) && (
                  <button
                    type="button"
                    onClick={() => { setEditImage(null); setEditImagePreview(null); }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {editImagePreview && (
                <img src={editImagePreview} alt="Preview" className="h-32 rounded-lg border" />
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingPost(null)} className="px-4 py-2 text-stone-600">Cancel</button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 flex items-center"
                >
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit News Modal */}
      {editingNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-serif italic text-stone-900">Edit Announcement</h3>
              <button onClick={() => setEditingNews(null)} className="p-2 text-stone-400 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateNews} className="p-6 overflow-y-auto space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900"
                required
              />
              <div className="bg-stone-50 rounded-lg overflow-hidden border border-stone-200">
                <ReactQuill
                  theme="snow"
                  value={editForm.content}
                  onChange={(val) => setEditForm({ ...editForm, content: val })}
                  modules={quillModules}
                  formats={quillFormats}
                  className="[&_.ql-editor]:min-h-[250px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {editImage || editImagePreview ? 'Change Image' : 'Add Image'}
                </button>
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => handleImageChange(e, setEditImage, setEditImagePreview)}
                  className="hidden"
                  accept="image/*"
                />
                {(editImage || editImagePreview) && (
                  <button
                    type="button"
                    onClick={() => { setEditImage(null); setEditImagePreview(null); }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {editImagePreview && (
                <img src={editImagePreview} alt="Preview" className="h-32 rounded-lg border" />
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingNews(null)} className="px-4 py-2 text-stone-600">Cancel</button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 flex items-center"
                >
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-serif italic text-stone-900">Edit Document</h3>
              <button onClick={() => setEditingDoc(null)} className="text-stone-400 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateDoc} className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Document Title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900"
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900"
              />
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Update Source</label>
                <input
                  type="url"
                  placeholder="External URL"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900"
                  disabled={!!editImage}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {editImage ? 'Change File' : 'Upload New File'}
                  </button>
                  <input
                    type="file"
                    ref={editFileInputRef}
                    onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {editImage && <span className="text-xs text-stone-500 truncate max-w-[150px]">{editImage.name}</span>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingDoc(null)} className="px-4 py-2 text-stone-600">Cancel</button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 flex items-center"
                >
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 flex flex-col pt-8 relative">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif italic text-stone-900 text-center mb-2">Confirm Delete</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              Are you sure you want to delete this {deleteConfirm.collectionName === 'news' ? 'news item' : deleteConfirm.collectionName.slice(0, -1)}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 px-4 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
