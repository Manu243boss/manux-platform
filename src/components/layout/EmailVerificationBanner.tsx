import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X, Send, CheckCircle2, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmailVerificationBanner: React.FC = () => {
  const { user, isEmailVerified, resendVerificationEmail } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('manux_dismiss_email_banner') === 'true';
  });
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // If no user or email already verified or dismissed for this session
  if (!user || isEmailVerified || dismissed) {
    return null;
  }

  // Only relevant for email providers
  const isEmailAuth = user.app_metadata?.provider === 'email' || !user.app_metadata?.provider;
  if (!isEmailAuth) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('manux_dismiss_email_banner', 'true');
  };

  const handleResend = async () => {
    if (sending) return;
    setSending(true);
    setSendSuccess(null);
    try {
      const res = await resendVerificationEmail();
      setSendSuccess(res.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sticky top-16 z-30 bg-amber-400 text-slate-950 px-3 sm:px-5 py-2 sm:py-2.5 border-b border-amber-500/40 shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm">
        {/* Left: Icon & Alert Text */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-950 font-bold" />
          </div>
          <p className="font-medium text-slate-950 truncate sm:whitespace-normal">
            <strong className="font-extrabold">Votre compte n'est pas encore vérifié.</strong>{' '}
            <span className="hidden sm:inline">
              Veuillez confirmer votre adresse email pour nous rassurer qu'il s'agit bien de vous.
            </span>
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {sendSuccess ? (
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold bg-black/15 text-slate-950 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Lien envoyé !
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold bg-black text-amber-300 hover:bg-neutral-900 px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{sending ? 'Envoi...' : 'Renvoyer le lien'}</span>
            </button>
          )}

          <Link
            to="/dashboard/profile"
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold bg-amber-300 hover:bg-amber-200 text-slate-950 px-2.5 py-1 rounded-lg border border-amber-500/40 transition-colors"
          >
            <UserCheck className="w-3 h-3" />
            <span>Mon profil</span>
          </Link>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer la notification"
            className="p-1 text-slate-900/70 hover:text-slate-950 hover:bg-black/10 rounded-md transition-colors cursor-pointer"
            title="Masquer temporairement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
