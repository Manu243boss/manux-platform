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
  Sparkles,
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
  const [refreshing, setRefreshing] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingToUsername, setReplyingToUsername] = useState<string>('');
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const localCacheKey = `manux_prod_comments_v3_${productId}`;

  useEffect(() => {
    // Check in-memory cache first
    const cached = memoryProdCommentsCache.get(productId);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
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

    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      // Query comments for this product
      const { data, error } = await supabase
        .from('product_comments')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[ManuX Product Comments] Supabase fetch error (fallback to local storage):', error.message);
        const local = localStorage.getItem(localCacheKey);
        if (local) {
          setComments(JSON.parse(local));
        }
      } else if (data) {
        const topLevel: ProductComment[] = [];
        const replyMap: Record<string, ProductComment[]> = {};

        data.forEach((c: any) => {
          const item: ProductComment = {
            id: c.id,
            product_id: c.product_id,
            user_id: c.user_id,
            parent_id: c.parent_id,
            author_name: c.author_name || 'Visiteur ManuX',
            author_username: c.author_username,
            author_avatar: c.author_avatar,
            content: c.content,
            likes_count: c.likes_count || 0,
            is_creator_reply: Boolean(c.is_creator_reply),
            is_pinned: Boolean(c.is_pinned),
            created_at: c.created_at || new Date().toISOString(),
          };

          if (item.parent_id) {
            if (!replyMap[item.parent_id]) replyMap[item.parent_id] = [];
            replyMap[item.parent_id].push(item);
          } else {
            topLevel.push(item);
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
      setRefreshing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = newCommentText.trim();
    if (!cleanText || isSubmitting) return;

    setIsSubmitting(true);
    const authorName = profile?.display_name || user?.email?.split('@')[0] || 'Visiteur ManuX';
    const authorUsername = profile?.username || user?.email?.split('@')[0] || 'visiteur';
    const authorAvatar = profile?.avatar_url || null;
    const isCreator = Boolean(user && creatorId && user.id === creatorId);

    const tempId = `prod_comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newCommentObj: ProductComment = {
      id: tempId,
      product_id: productId,
      user_id: user?.id || null,
      parent_id: null,
      author_name: authorName,
      author_username: authorUsername,
      author_avatar: authorAvatar,
      content: cleanText,
      likes_count: 0,
      is_creator_reply: isCreator,
      created_at: new Date().toISOString(),
      replies: [],
    };

    // Optimistic UI update
    const updated = [...comments, newCommentObj];
    setComments(updated);
    setNewCommentText('');
    localStorage.setItem(localCacheKey, JSON.stringify(updated));
    memoryProdCommentsCache.set(productId, { comments: updated, timestamp: Date.now() });

    try {
      const payload: any = {
        product_id: productId,
        author_name: authorName,
        author_username: authorUsername,
        author_avatar: authorAvatar,
        content: cleanText,
        is_creator_reply: isCreator,
      };
      if (user?.id) {
        payload.user_id = user.id;
      }

      const { data, error } = await supabase
        .from('product_comments')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.warn('[ManuX Product Comments] Supabase insert note:', error.message);
      } else if (data) {
        // Replace temp ID with real UUID
        const finalComments = updated.map((c) => (c.id === tempId ? { ...c, id: data.id } : c));
        setComments(finalComments);
        memoryProdCommentsCache.set(productId, { comments: finalComments, timestamp: Date.now() });
        localStorage.setItem(localCacheKey, JSON.stringify(finalComments));
      }
      // Re-fetch to ensure sync
      await fetchComments(true);
    } catch (err: any) {
      console.warn('[ManuX Product Comments] Insert exception:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    const cleanText = replyText.trim();
    if (!cleanText || isSubmitting) return;

    setIsSubmitting(true);
    const authorName = profile?.display_name || user?.email?.split('@')[0] || 'Visiteur ManuX';
    const authorUsername = profile?.username || user?.email?.split('@')[0] || 'visiteur';
    const authorAvatar = profile?.avatar_url || null;
    const isCreator = Boolean(user && creatorId && user.id === creatorId);

    const tempId = `prod_rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newReplyObj: ProductComment = {
      id: tempId,
      product_id: productId,
      user_id: user?.id || null,
      parent_id: parentId,
      author_name: authorName,
      author_username: authorUsername,
      author_avatar: authorAvatar,
      content: cleanText,
      likes_count: 0,
      is_creator_reply: isCreator,
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
    memoryProdCommentsCache.set(productId, { comments: updated, timestamp: Date.now() });

    try {
      const payload: any = {
        product_id: productId,
        parent_id: parentId.startsWith('prod_comm_') ? null : parentId,
        author_name: authorName,
        author_username: authorUsername,
        author_avatar: authorAvatar,
        content: cleanText,
        is_creator_reply: isCreator,
      };
      if (user?.id) {
        payload.user_id = user.id;
      }

      const { error } = await supabase.from('product_comments').insert(payload);
      if (error) {
        console.warn('[ManuX Product Comments] Reply insert note:', error.message);
      } else {
        await fetchComments(true);
      }
    } catch (err: any) {
      console.warn('[ManuX Product Comments] Reply exception:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (commentId: string) => {
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

    // If real UUID, try updating in Supabase
    if (!commentId.startsWith('prod_')) {
      try {
        await supabase.rpc('increment_comment_likes', { comment_id: commentId });
      } catch {
        // Fallback
      }
    }
  };

  const toggleThread = (id: string) => {
    setExpandedThreads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCommentsCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
    0
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm sm:text-base font-black text-slate-900 font-serif-heading">
            Avis & Questions sur le Produit
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs">
            {totalCommentsCount}
          </span>
        </div>

        <button
          type="button"
          onClick={() => fetchComments(true)}
          disabled={refreshing || loading}
          title="Actualiser les avis"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleAddComment} className="flex gap-2 sm:gap-3 items-start">
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
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            <span>Publier</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Comments Scrollable List Container (Fixed viewport to avoid pushing down the page endlessly) */}
      <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 space-y-4 scrollbar-thin">
        {loading ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-xl w-3/4" />
            <div className="h-10 bg-slate-100 rounded-xl w-1/2" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs space-y-1 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <p className="font-bold text-slate-700">Aucun avis ou question pour le moment.</p>
            <p>Soyez le premier à commenter ce produit Chariow !</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {comments.map((comment) => {
              const isLiked = Boolean(likedComments[comment.id]);
              const hasReplies = comment.replies && comment.replies.length > 0;
              const isExpanded = Boolean(expandedThreads[comment.id]);

              return (
                <div key={comment.id} className="space-y-2 group bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-start gap-3">
                    {comment.author_avatar ? (
                      <img
                        src={comment.author_avatar}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                        {comment.author_name?.slice(0, 1).toUpperCase() || 'A'}
                      </div>
                    )}

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
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

                      <p className="text-xs text-slate-800 leading-relaxed font-normal break-words whitespace-pre-wrap">
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
                    <div className="ml-10 flex gap-2 items-center pt-2">
                      <input
                        type="text"
                        placeholder={`Répondre à ${replyingToUsername}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyText.trim() || isSubmitting}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl"
                      >
                        Envoyer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText('');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 px-1"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {/* Replies Thread */}
                  {hasReplies && (
                    <div className="ml-10 space-y-2.5 pt-1">
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

                          <div className="space-y-2.5 border-l-2 border-slate-200 pl-3">
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

                                  <div className="flex-1 space-y-0.5 min-w-0">
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
                                    <p className="text-xs text-slate-700 leading-relaxed break-words">
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
    </div>
  );
};
