import React from 'react';
import { HelpCircle, BookOpen, ShoppingBag, Video, MessageSquare } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { SeoHead } from '../components/ui/SeoHead';

export const HelpPage: React.FC = () => {
  const faqs = [
    {
      q: 'Comment connecter ma boutique Chariow ?',
      a: 'Rendez-vous dans votre Dashboard ManuX > Ma boutique Chariow. Vous pourrez y renseigner le lien de votre boutique ou votre clé API pour synchroniser automatiquement vos produits.',
    },
    {
      q: 'Comment ajouter une vidéo de démonstration ?',
      a: 'Pour chaque produit, vous pouvez ajouter une URL de vidéo YouTube (idéalement en mode non répertorié ou public). Notre système extrait automatiquement le lecteur et l’associe à votre produit.',
    },
    {
      q: 'ManuX prend-il une commission sur mes ventes ?',
      a: 'Non. Les ventes et paiements se font directement sur votre boutique Chariow. ManuX fonctionne sur un modèle d’abonnement mensuel transparent (0$, 2.50$, 9$).',
    },
    {
      q: 'Les prix sont-ils modifiés par ManuX ?',
      a: 'Jamais. Chaque produit conserve scrupuleusement son prix et sa devise d’origine (ex: CDF, XAF, USD). Les conversions affichées sont fournies à titre strictement indicatif pour faciliter la compréhension des visiteurs.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <SeoHead
        title="Centre d'aide"
        description="Foire aux questions et guide d'utilisation de ManuX pour les créateurs et visiteurs."
      />

      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif-heading">
          Centre d'Aide & FAQ
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tout ce que vous devez savoir pour démarrer et tirer le meilleur parti de ManuX
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <Card key={idx} className="p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{faq.q}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
              {faq.a}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};
