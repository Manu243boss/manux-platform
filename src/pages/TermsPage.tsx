import React from 'react';
import { Card } from '../components/ui/Card';
import { SeoHead } from '../components/ui/SeoHead';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <SeoHead title="Conditions d'utilisation" />
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif-heading">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-xs text-slate-500 mt-1">Dernière mise à jour : Septembre 2026</p>
      </div>

      <Card className="p-6 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <h2 className="text-sm font-bold text-slate-900">1. Objet de la plateforme</h2>
        <p>
          ManuX (accessible sur manux.xttools.site) est une plateforme de référencement, découverte et démonstration vidéo de produits physiques et numériques provenant notamment de boutiques hébergées sur Chariow.
        </p>

        <h2 className="text-sm font-bold text-slate-900">2. Responsabilité des transactions</h2>
        <p>
          ManuX n'est pas le vendeur direct des produits présentés. Chaque achat est conclu directement sur la boutique Chariow du créateur concerné. ManuX ne conserve aucune coordonnée bancaire.
        </p>

        <h2 className="text-sm font-bold text-slate-900">3. Engagements des créateurs</h2>
        <p>
          Les créateurs s'engagent à ne publier que des contenus légaux, respectant les droits d'auteur, la propriété intellectuelle et les lois en vigueur. Tout contenu frauduleux fera l'objet d'un signalement et d'une suppression immédiate.
        </p>
      </Card>
    </div>
  );
};
