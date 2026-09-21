import React from 'react';
import { ShieldCheck, Target, Users, Zap, ExternalLink } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { SeoHead } from '../components/ui/SeoHead';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <SeoHead
        title="À Propos de ManuX Plateforme"
        description="Découvrez la vision et la mission de ManuX : propulser l'économie numérique et les créateurs africains via les boutiques Chariow."
        canonical="https://manux.xttools.site/about"
      />

      <div className="space-y-3 text-center sm:text-left border-b border-slate-200/80 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 font-serif-heading">
          À Propos de ManuX
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Une plateforme panafricaine dédiée à la visibilité, la démonstration et la croissance commerciale des entrepreneurs du continent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Notre Mission</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Permettre aux créateurs africains de produits numériques (formations, logiciels, guides, templates) et physiques de trouver leur audience grâce à des vidéos de démonstration authentiques et un annuaire qualifié.
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Passerelle Chariow</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Nous intégrons nativement l'écosystème Chariow afin que les vendeurs puissent vendre directement sans intermédiaire de paiement supplémentaire, en toute sécurité.
          </p>
        </Card>
      </div>

      <Card className="p-6 sm:p-8 bg-slate-50 border-slate-200 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-serif-heading">
          « Vendez vos produits Chariow même pendant que vous dormez. »
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          ManuX résout le problème majeur des créateurs en Afrique : l'acquisition de trafic et la conversion. En combinant la preuve par la vidéo et un référencement soigné, les acheteurs comprennent immédiatement la valeur de vos offres avant de finaliser leur commande.
        </p>
      </Card>
    </div>
  );
};
