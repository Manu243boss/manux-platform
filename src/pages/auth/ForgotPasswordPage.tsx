import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SeoHead } from '../../components/ui/SeoHead';
import { Logo } from '../../components/ui/Logo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      // Supabase sends a secure reset link with the redirect URL pointing to /auth/reset-password
      const resetRedirectUrl = `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectUrl,
      });

      if (error) {
        setErrorMsg('Impossible d\'envoyer le lien de réinitialisation. Vérifiez l\'adresse saisie.');
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg('Une erreur inattendue est survenue. Veuillez réessayer ultérieurement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <SeoHead title="Mot de passe oublié" description="Réinitialisez l'accès à votre compte créateur ManuX." />

      <Card className="max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à la connexion</span>
            </Link>
            <Logo size="sm" showText={false} />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif-heading">
              Réinitialiser votre mot de passe
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Entrez l'adresse e-mail associée à votre compte ManuX. Nous vous enverrons immédiatement un lien direct pour définir un nouveau mot de passe.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-emerald-950">Lien de réinitialisation envoyé !</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Un e-mail contenant le lien sécurisé de réinitialisation vient d'être envoyé à <strong>{email}</strong>.
            </p>
            <p className="text-[11px] text-emerald-700/80">
              Pensez à vérifier votre dossier de courriers indésirables (spams) si vous ne le recevez pas d'ici quelques instants.
            </p>
            <div className="pt-2">
              <Link to="/auth/login" className="text-xs font-bold text-emerald-900 underline">
                Retour à l'écran de connexion
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Adresse e-mail du compte</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre-email@domaine.com"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={loading}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Envoyer le lien de réinitialisation
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
