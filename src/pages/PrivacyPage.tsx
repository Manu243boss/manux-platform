import React from 'react';
import { Card } from '../components/ui/Card';
import { SeoHead } from '../components/ui/SeoHead';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <SeoHead title="Politique de Confidentialité" />
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif-heading">
          Politique de Confidentialité
        </h1>
        <p className="text-xs text-slate-500 mt-1">Protection de vos données personnelles sur ManuX</p>
      </div>

      <Card className="p-6 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <h2 className="text-sm font-bold text-slate-900">1. Données collectées</h2>
        <p>
          Nous collectons uniquement les informations nécessaires au bon fonctionnement de la vitrine et du compte créateur : adresse e-mail, pseudonyme/nom public, biographie, lien de boutique et données statistiques anonymisées de consultation.
        </p>

        <h2 className="text-sm font-bold text-slate-900">2. Clés API et données sensibles</h2>
        <p>
          Les identifiants et clés API d'intégration Chariow ne sont jamais divulgués ni exposés dans le navigateur des visiteurs. Ils sont protégés et chiffrés conformément aux normes de sécurité les plus strictes.
        </p>

        <h2 className="text-sm font-bold text-slate-900">3. Vos droits</h2>
        <p>
          Conformément aux réglementations sur la protection des données, vous disposez à tout moment d'un droit d'accès, de rectification et de suppression de vos données personnelles via votre tableau de bord ou en contactant l'administration.
        </p>
      </Card>
    </div>
  );
};
