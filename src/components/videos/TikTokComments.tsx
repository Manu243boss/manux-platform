import React, { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  CornerDownRight,
  Send,
  Smile,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { VideoComment } from '../../types';

interface TikTokCommentsProps {
  videoId: string;
  creatorId?: string;
  title?: string;
}

// In-memory cache to avoid duplicate Supabase queries for comments already retrieved
const memoryCommentsCache = new Map<string, { comments: VideoComment[]; timestamp: number }>();

export const TikTokComments: React.FC<TikTokCommentsProps> = ({ videoId, creatorId, title = 'Commentaires' }) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingToUsername, setReplyingToUsername] = useState<string>('');
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Storage key for resilient caching
  const localCacheKey = `manux_comments_v2_${videoId}`;

  useEffect(() => {
    // 1. Check in-memory cache first
    const cached = memoryCommentsCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      setComments(cached.comments);
      setLoading(false);
    } else {
      // 2. Check localStorage fallback
      try {
        const local = localStorage.getItem(localCacheKey);
        if (local) {
          const parsed = JSON.parse(local);
          setComments(parsed);
          setLoading(false);
        }
      } catch {
        // Ignore
      }
      fetchComments();
    }

    // Load local liked states
    try {
      const savedLikes = localStorage.getItem(`manux_liked_${videoId}`);
      if (savedLikes) setLikedComments(JSON.parse(savedLikes));
    } catch {
      // Ignore
    }
  }, [videoId]);

  const fetchComments = async (force: boolean = false) => {
    if (!force && memoryCommentsCache.has(videoId)) {
      setComments(memoryCommentsCache.get(videoId)!.comments);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[ManuX Comments] Supabase fetch error (falling back to local storage):', error.message);
        const local = localStorage.getItem(localCacheKey);
        if (local) {
          setComments(JSON.parse(local));
        } else {
          setComments([]);
        }
      } else if (data) {
        const topLevel: VideoComment[] = [];
        const replyMap: Record<string, VideoComment[]> = {};

        data.forEach((c: VideoComment) => {
          if (c.parent_id) {
            if (!replyMap[c.parent_id]) replyMap[c.parent_id] = [];
            replyMap[c.parent_id].push(c);
          } else {
            topLevel.push(c);
          }
        });

        topLevel.forEach((t) => {
          t.replies = replyMap[t.id] || [];
        });

        setComments(topLevel);
        memoryCommentsCache.set(videoId, { comments: topLevel, timestamp: Date.now() });
        localStorage.setItem(localCacheKey, JSON.stringify(topLevel));
      }
    } catch (err) {
      console.warn('[ManuX Comments] Fetch exception fallback:', err);
      try {
        const local = localStorage.getItem(localCacheKey);
        if (local) setComments(JSON.parse(local));
      } catch {
        setComments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const authorName = profile?.display_name || user?.email?.split('@')[0] || 'Visiteur ManuX';
    const authorUsername = profile?.username || user?.email?.split('@')[0] || 'visiteur';
    const authorAvatar = profile?.avatar_url || null;

    const newCommentObj: VideoComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      video_id: videoId,
      user_id: user?.id || null,
      parent_id: null,
      author_name: authorName,
      author_username: authorUsername,
      author_avatar: authorAvatar,
      content: newCommentText.trim(),
      likes_count: 0,
      is_creator_reply: Boolean(user && creatorId && user.id === creatorId),
      created_at: new Date().toISOString(),
      replies: [],
    };

    // Optimistic UI update & local storage update
    const updated = [...comments, newCommentObj];
    setComments(updated);
    setNewCommentText('');
    memoryCommentsCache.set(videoId, { comments: updated, timestamp: Date.now() });
    localStorage.setItem(localCacheKey, JSON.stringify(updated));

    try {
      const { error } = await supabase.from('video_comments').insert({
        video_id: videoId,
        user_id: user?.id || null,
        parent_id: null,
        author_name: authorName,
        author_username: authorUsername,
        author_avatar: authorAvatar,
        content: newCommentObj.content,
        is_creator_reply: newCommentObj.is_creator_reply,
      });

      if (error) {
        console.warn('[ManuX Comments] Supabase insert fallback to local only:', error.message);
      } else {
        await fetchComments(true);
      }
    } catch (err: any) {
      console.warn('[ManuX Comments] Insert exception fallback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const authorName = profile?.display_name || user?.email?.split('@')[0] || 'Visiteur ManuX';
    const authorUsername = profile?.username || user?.email?.split('@')[0] || 'visiteur';
    const authorAvatar = profile?.avatar_url || null;

    const newReplyObj: VideoComment = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      video_id: videoId,
      user_id: user?.id || null,
      parent_id: parentId,
      author_name: authorName,
      author_username: authorUsername,
      author_avatar: authorAvatar,
      content: replyText.trim(),
      likes_count: 0,
      is_creator_reply: Boolean(user && creatorId && user.id === creatorId),
      created_at: new Date().toISOString(),
    };

    const updated = comments.map((comm) => {
      if (comm.id === parentId) {
        return {
          ...comm,
          replies: [...(comm.replies || []), newReplyObj],
        };
      }
      return comm;
    });

    setComments(updated);
    setReplyText('');
    setReplyingToId(null);
    setExpandedThreads((prev) => ({ ...prev, [parentId]: true }));
    memoryCommentsCache.set(videoId, { comments: updated, timestamp: Date.now() });
    localStorage.setItem(localCacheKey, JSON.stringify(updated));

    try {
      const { error } = await supabase.from('video_comments').insert({
        video_id: videoId,
        user_id: user?.id || null,
        parent_id: parentId,
        author_name: authorName,
        author_username: authorUsername,
        author_avatar: authorAvatar,
        content: newReplyObj.content,
        is_creator_reply: newReplyObj.is_creator_reply,
      });

      if (error) {
        console.warn('[ManuX Comments] Supabase reply insert fallback:', error.message);
      } else {
        await fetchComments();
      }
    } catch (err: any) {
      console.warn('[ManuX Comments] Reply insert exception:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async (commentId: string, isReply: boolean = false, parentId?: string) => {
    const isCurrentlyLiked = likedComments[commentId];
    const newLikedState = !isCurrentlyLiked;

    // Update liked states in local storage
    const updatedLikes = { ...likedComments, [commentId]: newLikedState };
    setLikedComments(updatedLikes);
    localStorage.setItem(`manux_liked_${videoId}`, JSON.stringify(updatedLikes));

    // Update UI count
    const updated = comments.map((comm) => {
      if (!isReply && comm.id === commentId) {
        return {
          ...comm,
          likes_count: comm.likes_count + (newLikedState ? 1 : -1),
        };
      }
      if (isReply && comm.id === parentId && comm.replies) {
        return {
          ...comm,
          replies: comm.replies.map((r) =>
            r.id === commentId
              ? { ...r, likes_count: r.likes_count + (newLikedState ? 1 : -1) }
              : r
          ),
        };
      }
      return comm;
    });

    setComments(updated);
    localStorage.setItem(localCacheKey, JSON.stringify(updated));

    // Call Supabase RPC if liking
    if (newLikedState) {
      try {
        await supabase.rpc('increment_comment_likes', { comment_id: commentId });
      } catch {
        // Fallback
      }
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
      if (diff < 60) return 'À l’instant';
      if (diff < 3600) return `${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
      return `${Math.floor(diff / 86400)} j`;
    } catch {
      return 'Récemment';
    }
  };

  const totalCommentsCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header TikTok-Style */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-slate-700" />
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
            Commentaires ({totalCommentsCount})
          </h3>
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Communauté Chariow
        </div>
      </div>

      {/* Comments List (Scrollable bounded container so card remains neat and does not push page down) */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[360px] sm:max-h-[400px] overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Chargement des discussions...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-700">
              Soyez le premier à commenter cette démonstration !
            </p>
            <p className="text-[11px] text-slate-400">
              Posez une question sur le produit ou partagez votre avis.
            </p>
          </div>
        ) : (
          comments.map((comm) => {
            const isLiked = likedComments[comm.id];
            const repliesCount = comm.replies?.length || 0;
            const isThreadExpanded = expandedThreads[comm.id];

            return (
              <div key={comm.id} className="space-y-2 group">
                {/* Main Comment Row */}
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className="shrink-0 pt-0.5">
                    {comm.author_avatar ? (
                      <img
                        src={comm.author_avatar}
                        alt={comm.author_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center border border-slate-200 shadow-2xs">
                        {comm.author_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Comment Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {comm.author_name}
                      </span>
                      {comm.author_username && (
                        <span className="text-[11px] text-slate-400">
                          @{comm.author_username}
                        </span>
                      )}
                      {comm.is_creator_reply && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300/60">
                          <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                          Créateur
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-800 mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
                      {comm.content}
                    </p>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-4 mt-1.5 text-[11px] font-semibold text-slate-400">
                      <span>{formatRelativeTime(comm.created_at)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(comm.id);
                          setReplyingToUsername(comm.author_username || comm.author_name);
                          setReplyText(`@${comm.author_username || comm.author_name} `);
                        }}
                        className="text-slate-500 hover:text-slate-900 font-bold cursor-pointer transition-colors"
                      >
                        Répondre
                      </button>
                    </div>
                  </div>

                  {/* Like Button TikTok Style */}
                  <div className="shrink-0 flex flex-col items-center pl-1">
                    <button
                      type="button"
                      onClick={() => toggleLike(comm.id)}
                      aria-label="Aimer le commentaire"
                      className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 transition-all duration-200 ${
                          isLiked
                            ? 'fill-[#FE2C55] text-[#FE2C55] scale-110'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                    </button>
                    {comm.likes_count > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 -mt-0.5">
                        {comm.likes_count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline Reply Input if active */}
                {replyingToId === comm.id && (
                  <div className="pl-11 pr-2 pt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Répondre à @${replyingToUsername}...`}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-400 bg-slate-50"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAddReply(comm.id)}
                      disabled={!replyText.trim() || isSubmitting}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-50 cursor-pointer"
                    >
                      Envoyer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(null);
                        setReplyText('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {/* Nested Threaded Replies (TikTok Style Accordion) */}
                {repliesCount > 0 && (
                  <div className="pl-11 pt-1 space-y-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedThreads((prev) => ({
                          ...prev,
                          [comm.id]: !prev[comm.id],
                        }))
                      }
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <span className="w-5 h-px bg-slate-300" />
                      {isThreadExpanded ? (
                        <>
                          <span>Masquer les réponses</span>
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>Voir les {repliesCount} réponse{repliesCount > 1 ? 's' : ''}</span>
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>

                    {isThreadExpanded && (
                      <div className="space-y-3 pt-1 border-l-2 border-slate-100 pl-3">
                        {comm.replies?.map((rep) => {
                          const isRepLiked = likedComments[rep.id];
                          return (
                            <div key={rep.id} className="flex items-start gap-2.5">
                              {/* Sub Avatar */}
                              <div className="shrink-0 pt-0.5">
                                {rep.author_avatar ? (
                                  <img
                                    src={rep.author_avatar}
                                    alt={rep.author_name}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                                    {rep.author_name.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Sub Body */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900">
                                    {rep.author_name}
                                  </span>
                                  {rep.is_creator_reply && (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-100 text-amber-900">
                                      Créateur
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-800 mt-0.5 leading-relaxed break-words">
                                  {rep.content}
                                </p>
                                <div className="mt-1 text-[10px] text-slate-400">
                                  {formatRelativeTime(rep.created_at)}
                                </div>
                              </div>

                              {/* Sub Like */}
                              <div className="shrink-0 flex flex-col items-center">
                                <button
                                  type="button"
                                  onClick={() => toggleLike(rep.id, true, comm.id)}
                                  className="p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      isRepLiked
                                        ? 'fill-[#FE2C55] text-[#FE2C55]'
                                        : 'text-slate-400'
                                    }`}
                                  />
                                </button>
                                {rep.likes_count > 0 && (
                                  <span className="text-[9px] font-bold text-slate-500">
                                    {rep.likes_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Input Bar (TikTok Style) */}
      <form
        onSubmit={handleAddComment}
        className="p-3 sm:p-4 border-t border-slate-200/80 bg-slate-50/70 flex items-center gap-2 sm:gap-3"
      >
        {/* User avatar thumbnail */}
        <div className="shrink-0 hidden sm:block">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Moi"
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
              {profile?.display_name?.slice(0, 1).toUpperCase() || 'M'}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="w-full pl-3.5 pr-20 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
          />

          {/* Quick reactions */}
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setNewCommentText((prev) => prev + ' 🔥')}
              className="text-xs hover:scale-125 transition-transform"
              title="Ajouter 🔥"
            >
              🔥
            </button>
            <button
              type="button"
              onClick={() => setNewCommentText((prev) => prev + ' 👏')}
              className="text-xs hover:scale-125 transition-transform"
              title="Ajouter 👏"
            >
              👏
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!newCommentText.trim() || isSubmitting}
          className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-2xs disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <span>Publier</span>
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
