import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { News, Post, Document as DocType } from '../types';
import { useAuth } from '../auth';
import { Newspaper, MessageSquare, FileText, ArrowRight, Info, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { safeParseDate } from '../lib/dateUtils';
import DOMPurify from 'dompurify';

export default function ViewerHome() {
  const { profile, isAdmin } = useAuth();
  const [recentNews, setRecentNews] = useState<News[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocType[]>([]);

  useEffect(() => {
    const qNews = query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(2));
    const unsubscribeNews = onSnapshot(qNews, (snapshot) => {
      setRecentNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    }, (error) => {
      console.error('Firestore Error in news listener:', error);
    });

    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      setRecentPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }, (error) => {
      console.error('Firestore Error in posts listener:', error);
    });

    const qDocs = query(collection(db, 'documents'), orderBy('createdAt', 'desc'), limit(4));
    const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
      setRecentDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocType)));
    }, (error) => {
      console.error('Firestore Error in documents listener:', error);
    });

    return () => {
      unsubscribeNews();
      unsubscribePosts();
      unsubscribeDocs();
    };
  }, []);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      {isAdmin && recentNews.length === 0 && recentPosts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center text-amber-800">
            <Info className="w-5 h-5 mr-3" />
            <p className="text-sm font-medium">Admin Tip: Your app looks a bit empty. Go to the Management App to seed sample data.</p>
          </div>
          <Link to="/admin" className="text-xs font-bold uppercase tracking-widest bg-amber-200 px-4 py-2 rounded-lg hover:bg-amber-300 transition-all">
            Go to Admin
          </Link>
        </div>
      )}
      <section className="relative h-[450px] md:h-[400px] rounded-3xl overflow-hidden shadow-2xl">
        <img
          src="https://devendrarmaaligai.com/wp-content/uploads/2026/03/image-fill-e1773324774794.png"
          alt="Wedding Hall"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/40 to-transparent flex flex-col justify-end p-6 sm:p-8 md:p-12">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-white mb-3 md:mb-4 leading-tight">
              Welcome to the <br /> Wedding Hall Hub
            </h1>
            <p className="text-stone-200 text-sm md:text-lg mb-6 md:mb-8 leading-relaxed">
              Stay connected with our community. Access the latest announcements,
              event documents, and the public bookings ledger.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link
                to="/viewer/hub"
                className="w-full sm:w-auto justify-center px-6 md:px-8 py-3 bg-white text-stone-900 rounded-xl font-medium hover:bg-stone-100 transition-all flex items-center shadow-lg"
              >
                Explore Hub
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                to="/viewer/ledger"
                className="w-full sm:w-auto justify-center px-6 md:px-8 py-3 bg-stone-900/50 backdrop-blur-md text-white border border-white/20 rounded-xl font-medium hover:bg-stone-900/70 transition-all flex items-center"
              >
                View Ledger
              </Link>
              {/* <Link 
                to="/viewer/calendar" 
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center shadow-lg"
              >
                <Calendar className="mr-2 w-4 h-4" />
                Check Availability
              </Link> */}
            </div>
          </div>
        </div>
      </section>

      {/* Hall Availability Quick Look */}
      {/* <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-serif italic text-stone-900">Hall Availability</h3>
            <p className="text-stone-500 text-sm mt-1 uppercase tracking-widest">Plan your next event with us</p>
          </div>
          <Link to="/viewer/calendar" className="px-6 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all">
            Open Full Calendar
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic text-lg text-stone-900 mb-2">Grand Crystal Ballroom</h4>
            <p className="text-stone-600 text-sm mb-4">Our most prestigious venue for grand celebrations and weddings.</p>
            <Link to="/viewer/calendar" className="text-xs font-bold uppercase tracking-widest text-emerald-700 hover:underline">Check Dates</Link>
          </div>
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic text-lg text-stone-900 mb-2">Royal Garden Suite</h4>
            <p className="text-stone-600 text-sm mb-4">A beautiful indoor-outdoor space perfect for receptions and parties.</p>
            <Link to="/viewer/calendar" className="text-xs font-bold uppercase tracking-widest text-amber-700 hover:underline">Check Dates</Link>
          </div>
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic text-lg text-stone-900 mb-2">Emerald Lounge</h4>
            <p className="text-stone-600 text-sm mb-4">An intimate setting for corporate meetings and small gatherings.</p>
            <Link to="/viewer/calendar" className="text-xs font-bold uppercase tracking-widest text-blue-700 hover:underline">Check Dates</Link>
          </div>
        </div>
      </section> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: News & Posts */}
        <div className="lg:col-span-2 space-y-12">
          {/* Recent News */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-serif italic text-stone-900 flex items-center">
                <Newspaper className="mr-3 w-6 h-6 text-stone-400" />
                Latest Announcements
              </h3>
              <Link to="/viewer/hub" className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors flex items-center">
                View All <ArrowRight className="ml-1 w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentNews.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden group hover:shadow-md transition-all">
                  {(item as any).imageUrl && (
                    <img src={(item as any).imageUrl} alt={item.title} className="w-full h-40 object-cover" referrerPolicy="no-referrer" />
                  )}
                  <div className="p-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      {(() => {
                        const date = safeParseDate(item.createdAt);
                        return date ? format(date, 'MMM d, yyyy') : 'N/A';
                      })()}
                    </span>
                    <h4 className="text-xl font-serif italic text-stone-900 mt-2 mb-3 line-clamp-1">{item.title}</h4>
                    <div
                      className="text-stone-600 text-sm line-clamp-2 mb-4"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content) }}
                    />
                    <Link to="/viewer/hub" className="text-xs font-bold uppercase tracking-widest text-stone-900 flex items-center hover:underline">
                      Read More <ArrowRight className="ml-1 w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
              {recentNews.length === 0 && (
                <div className="col-span-full py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <p className="text-stone-400 italic">No recent announcements</p>
                </div>
              )}
            </div>
          </section>

          {/* Community Pulse */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-serif italic text-stone-900 flex items-center">
                <MessageSquare className="mr-3 w-6 h-6 text-stone-400" />
                Community Pulse
              </h3>
              <Link to="/viewer/hub" className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors flex items-center">
                View Conversation <ArrowRight className="ml-1 w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-start gap-4">
                  <div className="w-10 h-10 bg-stone-100 rounded-full flex-shrink-0 flex items-center justify-center text-stone-500 font-bold">
                    {post.authorName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-stone-900 text-sm">{post.authorName}</p>
                      <span className="text-[10px] text-stone-400 uppercase tracking-tighter">
                        {(() => {
                          const date = safeParseDate(post.createdAt);
                          return date ? format(date, 'MMM d') : 'N/A';
                        })()}
                      </span>
                    </div>
                    <div
                      className="text-stone-600 text-sm line-clamp-2 prose prose-stone prose-sm"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Documents & Quick Stats */}
        <div className="space-y-12">
          {/* Essential Documents */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif italic text-stone-900 flex items-center">
                <FileText className="mr-3 w-5 h-5 text-stone-400" />
                Resources
              </h3>
            </div>
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-900 transition-all group"
                >
                  <div className="w-10 h-10 bg-stone-50 rounded-lg flex items-center justify-center text-stone-400 mr-4 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{doc.title}</p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">{doc.category || 'General'}</p>
                  </div>
                </a>
              ))}
              {recentDocs.length === 0 && (
                <p className="text-stone-400 text-sm italic text-center py-8">No documents available</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
