import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  CornerDownRight,
  Send,
  Heart,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export interface ProductComment {
  id: string;
  product_id: string;
  user_id?: string | null;
  parent_id?: string | null;
  author_name: string;
  author_username?: string | null;
  author_avatar?: string | null;
  content: string;
  likes_count: number;
  is_creator_reply?: boolean;
  is_pinned?: boolean;
  created_at: string;
  replies?: ProductComment[];
}

interface ProductCommentsProps {
  productId: string;
  creatorId?: string;
}

// In-memory cache to prevent repeated fetches across tabs/sessions
const memoryProdCommentsCache = new Map<string, { comments: ProductComment[]; timestamp: number }>();

export const ProductComments: React.FC<ProductCommentsProps> = ({ productId, creatorId }) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingToUsername, setReplyingToUsername] = useState<string>('');
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const localCacheKey = `manux_prod_comments_${productId}`;

  useEffect(() => {
    // Check in-memory cache first
    const cached = memoryProdCommentsCache.get(productId);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      setComments(cached.comments);
      setLoading(false);
    } else {
      try {
        const local = localStorage.getItem(localCacheKey);
        if (local) {
          setComments(JSON.parse(local));
          setLoading(false);
        }
      } catch {
        // Ignore
      }
      fetchComments();
    }

    try {
      const savedLikes = localStorage.getItem(`manux_prod_liked_${productId}`);
      if (savedLikes) setLikedComments(JSON.parse(savedLikes));
    } catch {
      // Ignore
    }
  }, [productId]);

  const fetchComments = async (force: boolean = false) => {
    if (!force && memoryProdCommentsCache.has(productId)) {
      setComments(memoryProdCommentsCache.get(productId)!.comments);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[ManuX Product Comments] Supabase fetch error (falling back to local storage):', error.message);
        const local = localStorage.getItem(localCacheKey);
        if (local) {
          setComments(JSON.parse(local));
        } else {
          setComments([]);
        }
      } else if (data) {
        const topLevel: ProductComment[] = [];
        const replyMap: Record<string, ProductComment[]> = {};

        data.forEach((c: ProductComment) => {
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
        memoryProdCommentsCache.set(productId, { comments: topLevel, timestamp: Date.now() });
        localStorage.setItem(localCacheKey, JSON.stringify(topLevel));
      }
    } catch (err) {
      console.warn('[ManuX Product Comments] Fetch exception fallback:', err);
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

    const newCommentObj: ProductComment = {
      id: `prod_comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      product_id: productId,
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

    const updated = [...comments, newCommentObj];
    setComments(updated);
    setNewCommentText('');
    localStorage.setItem(localCacheKey, JSON.stringify(updated));

    try {
      const { error } = await supabase.from('product_comments').insert({
        product_id: productId,
        user_id: user?.id || null,
        parent_id: null,
        author_name: authorName,
        author_username: authorUsername,
        author_avatar: authorAvatar,
        content: newCommentObj.content,
        is_creator_reply: newCommentObj.is_creator_reply,
      });

      if (error) {
        console.warn('[ManuX Product Comments] Supabase insert fallback to local only:', error.message);
      } else {
        await fetchComments();
      }
    } catch (err: any) {
      console.warn('[ManuX Product Comments] Insert exception fallback:', err);
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

    const newReplyObj: ProductComment = {
      id: `prod_rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      product_id: productId,
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
    localStorage.setItem(localCacheKey, JSON.stringify(updated));

    try {
      const { error } = await supabase.from('product_comments').insert({
        product_id: productId,
        user_id: user?.id || null,
        parent_id: parentId,
        author_name: authorName,
        author_username: authorUsername,
        author_avatar: authorAvatar,
        content: newReplyObj.content,
        is_creator_reply: newReplyObj.is_creator_reply,
      });

      if (error) {
        console.warn('[ManuX Product Comments] Supabase reply insert fallback:', error.message);
      } else {
        await fetchComments();
      }
    } catch (err: any) {
      console.warn('[ManuX Product Comments] Reply insert exception:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = (commentId: string) => {
    const isCurrentlyLiked = Boolean(likedComments[commentId]);
    const updatedLikes = { ...likedComments, [commentId]: !isCurrentlyLiked };
    setLikedComments(updatedLikes);
    try {
      localStorage.setItem(`manux_prod_liked_${productId}`, JSON.stringify(updatedLikes));
    } catch {
      // Ignore
    }

    setComments((prevComments) =>
      prevComments.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            likes_count: Math.max(0, c.likes_count + (isCurrentlyLiked ? -1 : 1)),
          };
        }
        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId
                ? {
                    ...r,
                    likes_count: Math.max(0, r.likes_count + (isCurrentlyLiked ? -1 : 1)),
                  }
                : r
            ),
          };
        }
        return c;
      })
    );
  };

  const toggleThread = (id: string) => {
    setExpandedThreads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCommentsCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
    0
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm sm:text-base font-black text-slate-900 font-serif-heading">
            Avis & Questions sur le Produit
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs">
            {totalCommentsCount}
          </span>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleAddComment} className="flex gap-3 items-start">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 mt-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
            {user ? (profile?.display_name?.slice(0, 1).toUpperCase() || 'U') : 'V'}
          </div>
        )}

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder={
              user
                ? 'Posez une question ou laissez un avis sur ce produit...'
                : 'Laissez un commentaire sur ce produit...'
            }
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSubmitting}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <span>Publier</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-3 py-2 animate-pulse">
          <div className="h-10 bg-slate-100 rounded-xl w-3/4" />
          <div className="h-10 bg-slate-100 rounded-xl w-1/2" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs space-y-1">
          <p className="font-medium text-slate-600">Aucun avis ou question pour le moment.</p>
          <p>Soyez le premier à commenter ce produit Chariow !</p>
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {comments.map((comment) => {
            const isLiked = Boolean(likedComments[comment.id]);
            const hasReplies = comment.replies && comment.replies.length > 0;
            const isExpanded = Boolean(expandedThreads[comment.id]);

            return (
              <div key={comment.id} className="space-y-3 group">
                <div className="flex items-start gap-3">
                  {comment.author_avatar ? (
                    <img
                      src={comment.author_avatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                      {comment.author_name?.slice(0, 1).toUpperCase() || 'A'}
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {comment.author_name}
                      </span>
                      {comment.is_creator_reply && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase tracking-wider border border-amber-300 flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                          <span>Créateur</span>
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-normal">
                      {comment.content}
                    </p>

                    <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-500 font-semibold">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(comment.id)}
                        className={`flex items-center gap-1 hover:text-rose-600 transition-colors ${
                          isLiked ? 'text-rose-600 font-bold' : ''
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isLiked ? 'fill-rose-600 text-rose-600' : ''
                          }`}
                        />
                        <span>{comment.likes_count > 0 ? comment.likes_count : 'J’aime'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(replyingToId === comment.id ? null : comment.id);
                          setReplyingToUsername(comment.author_name);
                          setReplyText('');
                        }}
                        className="hover:text-slate-900 transition-colors"
                      >
                        Répondre
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Reply Form */}
                {replyingToId === comment.id && (
                  <div className="ml-11 flex gap-2 items-center pt-2">
                    <input
                      type="text"
                      placeholder={`Répondre à ${replyingToUsername}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddReply(comment.id)}
                      disabled={!replyText.trim() || isSubmitting}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl"
                    >
                      Envoyer
                    </button>
                  </div>
                )}

                {/* Replies Thread */}
                {hasReplies && (
                  <div className="ml-11 space-y-3 pt-1">
                    {!isExpanded ? (
                      <button
                        type="button"
                        onClick={() => toggleThread(comment.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-amber-700 transition-colors"
                      >
                        <CornerDownRight className="w-3 h-3 text-amber-500" />
                        <span>
                          Voir {comment.replies!.length}{' '}
                          {comment.replies!.length > 1 ? 'réponses' : 'réponse'}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleThread(comment.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 mb-2"
                        >
                          <span>Masquer les réponses</span>
                          <ChevronUp className="w-3 h-3" />
                        </button>

                        <div className="space-y-3 border-l-2 border-slate-100 pl-3">
                          {comment.replies!.map((reply) => {
                            const isReplyLiked = Boolean(likedComments[reply.id]);
                            return (
                              <div key={reply.id} className="flex items-start gap-2.5">
                                {reply.author_avatar ? (
                                  <img
                                    src={reply.author_avatar}
                                    alt=""
                                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                                    {reply.author_name?.slice(0, 1).toUpperCase() || 'R'}
                                  </div>
                                )}

                                <div className="flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">
                                      {reply.author_name}
                                    </span>
                                    {reply.is_creator_reply && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase tracking-wider border border-amber-300 flex items-center gap-1">
                                        <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                                        <span>Créateur</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed">
                                    {reply.content}
                                  </p>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLike(reply.id)}
                                      className={`flex items-center gap-1 hover:text-rose-600 ${
                                        isReplyLiked ? 'text-rose-600 font-bold' : ''
                                      }`}
                                    >
                                      <Heart
                                        className={`w-3 h-3 ${
                                          isReplyLiked ? 'fill-rose-600 text-rose-600' : ''
                                        }`}
                                      />
                                      <span>
                                        {reply.likes_count > 0 ? reply.likes_count : 'J’aime'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
