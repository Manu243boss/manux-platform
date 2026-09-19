import { supabase } from '../lib/supabase';

export class AnalyticsService {
  private static getSessionId(): string {
    const key = 'manux_anon_session_id';
    try {
      let sessionId = localStorage.getItem(key);
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(key, sessionId);
      }
      return sessionId;
    } catch {
      return `sess_${Date.now()}`;
    }
  }

  /**
   * Log an analytics event (works seamlessly for both anonymous and authenticated users)
   */
  public static async logEvent(params: {
    eventType:
      | 'product_view'
      | 'product_click'
      | 'creator_view'
      | 'video_view'
      | 'video_click'
      | 'external_click'
      | 'search'
      | 'category_view';
    productId?: string | null;
    creatorId?: string | null;
    videoId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const sessionId = this.getSessionId();
      const userId = session?.user?.id || null;

      const payload = {
        event_type: params.eventType,
        user_id: userId,
        creator_id: params.creatorId || null,
        product_id: params.productId || null,
        video_id: params.videoId || null,
        session_id: sessionId,
        metadata: {
          is_anonymous: !userId,
          referrer: typeof document !== 'undefined' ? document.referrer : '',
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          timestamp: new Date().toISOString(),
          ...(params.metadata || {}),
        },
      };

      await supabase.from('analytics_events').insert(payload);
    } catch (err) {
      // Non-blocking: analytics should never crash user navigation or purchase flows
      console.warn('[ManuX Analytics] Warning logging event:', err);
    }
  }

  public static async trackProductView(productId: string, creatorId?: string | null) {
    return this.logEvent({
      eventType: 'product_view',
      productId,
      creatorId,
    });
  }

  public static async trackProductClick(productId: string, creatorId?: string | null) {
    return this.logEvent({
      eventType: 'product_click',
      productId,
      creatorId,
    });
  }

  public static async trackExternalClick(
    productId: string,
    creatorId?: string | null,
    targetUrl?: string | null
  ) {
    return this.logEvent({
      eventType: 'external_click',
      productId,
      creatorId,
      metadata: { target_url: targetUrl || '' },
    });
  }

  public static async trackVideoView(videoId: string, creatorId?: string | null) {
    // Also trigger the RPC increment if available
    try {
      await supabase.rpc('increment_video_views', { vid: videoId });
    } catch {
      // ignore
    }

    return this.logEvent({
      eventType: 'video_view',
      videoId,
      creatorId,
    });
  }
}
