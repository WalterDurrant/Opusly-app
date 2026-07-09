import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Plus, X } from 'lucide-react';
import type { FeedPost, BusynessLevel } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { getAvatarColor, getInitials, timeAgo, getBusynessColor } from '../../lib/utils';

type FeedTab = 'Feed' | 'Nearby' | 'Following';
const BUSYNESS_OPTS: BusynessLevel[] = ['empty', 'quiet', 'moderate', 'busy', 'full'];

export default function FeedScreen() {
  const [tab, setTab] = useState<FeedTab>('Feed');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState('');
  const [busynessTag, setBusynessTag] = useState<BusynessLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setPosts(data as FeedPost[]);
      setLoading(false);
    });
  }, []);

  async function handleLike(post: FeedPost) {
    const newCount = post.likes_count + 1;
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: newCount } : p));
    await supabase.from('feed_posts').update({ likes_count: newCount }).eq('id', post.id);
  }

  async function handlePost() {
    if (!content.trim()) return;
    setSubmitting(true);
    const { data } = await supabase.from('feed_posts').insert({
      author_name: 'You',
      content: content.trim(),
      busyness_tag: busynessTag,
    }).select().single();
    if (data) setPosts(prev => [data as FeedPost, ...prev]);
    setContent('');
    setBusynessTag(null);
    setShowCompose(false);
    setSubmitting(false);
  }

  const displayed = tab === 'Following'
    ? []
    : posts;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-0">
        <h1 className="text-xl font-bold text-gray-900 pb-4">Community</h1>
        <div className="flex border-b border-gray-100">
          {(['Feed', 'Nearby', 'Following'] as FeedTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${tab === t ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t}
              {tab === t && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {!loading && tab === 'Following' && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-600 font-semibold mb-1">No one here yet</p>
            <p className="text-gray-400 text-sm">Invite friends to see their updates</p>
          </div>
        )}

        {!loading && tab === 'Nearby' && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📍</p>
            <p className="text-gray-600 font-semibold mb-1">Enable location</p>
            <p className="text-gray-400 text-sm">See posts from people at nearby spaces</p>
          </div>
        )}

        {!loading && tab === 'Feed' && displayed.map(post => (
          <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(post.author_name)}`}>
                {post.author_avatar || getInitials(post.author_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-gray-900 font-semibold text-sm">{post.author_name}</span>
                  <span className="text-gray-400 text-xs">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{post.content}</p>
              </div>
            </div>

            {post.busyness_tag && (
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getBusynessColor(post.busyness_tag)}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {post.busyness_tag.charAt(0).toUpperCase() + post.busyness_tag.slice(1)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
              <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors">
                <Heart className="w-4 h-4" />
                <span className="text-xs font-medium">{post.likes_count}</span>
              </button>
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-500 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-medium">{post.comments_count}</span>
              </button>
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-500 transition-colors ml-auto">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full max-w-sm mx-auto rounded-t-3xl p-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-bold text-lg">Share an update</h3>
              <button onClick={() => setShowCompose(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <textarea
              autoFocus
              placeholder="What's it like where you are?"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 resize-none mb-4"
            />
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Tag busyness level</p>
              <div className="flex flex-wrap gap-2">
                {BUSYNESS_OPTS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBusynessTag(busynessTag === b ? null : b)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${busynessTag === b ? getBusynessColor(b) + ' border-current' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handlePost}
              disabled={!content.trim() || submitting}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all ${content.trim() && !submitting ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {submitting ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
