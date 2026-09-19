import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand and Mission */}
          <div className="md:col-span-2 pr-0 md:pr-8">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-xs">
                M
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-950 font-serif-heading">
                Manu<span className="text-emerald-600">X</span>
              </span>
            </Link>
            <p className="text-xs lg:text-sm text-slate-500 leading-relaxed max-w-md mb-4">
              Plateforme africaine de découverte, démonstration et vente de produits numériques et physiques créés par des entrepreneurs talentueux, connectée directement aux boutiques Chariow.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>« Vendez vos produits Chariow même pendant que vous dormez. »</span>
            </div>
          </div>

          {/* Navigation links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 font-sans">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs lg:text-sm text-slate-600">
              <li>
                <Link to="/discover" className="hover:text-emerald-700 transition-colors">
                  Découvrir
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-emerald-700 transition-colors">
                  Tous les produits
                </Link>
              </li>
              <li>
                <Link to="/videos" className="hover:text-emerald-700 transition-colors">
                  Démonstrations vidéo
                </Link>
              </li>
              <li>
                <Link to="/creators" className="hover:text-emerald-700 transition-colors">
                  Répertoire des créateurs
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-emerald-700 transition-colors">
                  Toutes les catégories
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-emerald-700 transition-colors">
                  Plans & Tarifs
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 font-sans">
              Confiance & Légal
            </h4>
            <ul className="space-y-2 text-xs lg:text-sm text-slate-600">
              <li>
                <Link to="/guide" className="text-amber-600 font-bold hover:text-amber-700 transition-colors flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Guide ManuX + Chariow</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-700 transition-colors">
                  À propos de ManuX
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-emerald-700 transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-emerald-700 transition-colors">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-emerald-700 transition-colors">
                  Centre d'aide
                </Link>
              </li>
              <li className="pt-2">
                <a
                  href="https://chariow.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-amber-700 font-medium transition-colors"
                >
                  <span>Chariow E-commerce</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>© {new Date().getFullYear()} ManuX. Plateforme officielle sur manux.xttools.site.</span>
          </div>
          <div className="text-slate-400">
            Conçu pour propulser l'entrepreneuriat et l'économie numérique en Afrique.
          </div>
        </div>
      </div>
    </footer>
  );
};
