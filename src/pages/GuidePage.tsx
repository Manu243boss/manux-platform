import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  ShoppingBag,
  Video,
  TrendingUp,
  Zap,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Play,
  Share2,
  Users,
  Target,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SeoHead } from '../components/ui/SeoHead';

export const GuidePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 py-8 sm:py-12">
      <SeoHead
        title="Guide Créateur Chariow & Vente 24/24 | ManuX"
        description="Découvrez comment connecter votre boutique Chariow, comprendre l'algorithme de recommandation ManuX et maximiser vos ventes 24h/24 grâce aux vidéos de démonstration."
        canonical="https://manux.xttools.site/guide"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-amber-500/20 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guide Officiel ManuX</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-serif-heading tracking-tight text-white leading-tight">
              Comment Réussir & Vendre avec ManuX et Chariow
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Le manuel complet pour comprendre le fonctionnement de la plateforme, maîtriser l’algorithme de recommandation et transformer vos visiteurs en acheteurs même pendant votre sommeil.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link to="/onboarding">
                <Button variant="primary" size="md" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-md">
                  <span>Démarrer ma vitrine</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="md" className="text-white border-white/30 hover:bg-white/10 text-xs font-bold">
                  <span>Comparer les formules</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* SECTION 1: Le Problème Résolu */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">1</span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 font-serif-heading">
              Quel problème ManuX résout-il pour les créateurs ?
            </h2>
          </div>

          <Card className="p-6 sm:p-8 space-y-6">
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              En Afrique et dans la diaspora, des milliers d’entrepreneurs, formateurs et artisans créent d’excellents produits (formations en ligne, e-books, templates, logiciels SaaS, artisanat, coaching) hébergés sur <strong className="text-slate-900">Chariow</strong>. Cependant, ils font face à deux obstacles majeurs :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Le Défi de la Confiance & de la Preuve</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Une simple page de vente statique ou une image ne suffit plus pour convaincre. Les acheteurs veulent voir concrètement comment le produit fonctionne avant de payer.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Le Manque de Découvrabilité Organique</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sans budget publicitaire massif, un lien de boutique Chariow reste invisible. Il n’existait pas de moteur centralisé de recommandation vidéo dédié.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>La Solution ManuX : Découverte + Preuve Vidéo + Vente 24h/24</span>
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                ManuX agit comme une vitrine intelligente connectée à votre boutique Chariow. Vous y associez une vidéo de démonstration YouTube explicative. L’algorithme ManuX distribue ensuite votre contenu auprès des visiteurs ciblés, redirigeant les acheteurs directement vers votre lien Chariow sécurisé.
              </p>
            </div>
          </Card>
        </section>

        {/* SECTION 2: Comment connecter sa boutique Chariow */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">2</span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 font-serif-heading">
              Comment connecter sa boutique Chariow et publier ses produits ?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center">
                A
              </div>
              <h3 className="text-sm font-black text-slate-950">1. Créer son compte & Profil</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inscrivez-vous gratuitement sur ManuX. Renseignez votre pays, votre devise de référence et votre bio créateur.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                B
              </div>
              <h3 className="text-sm font-black text-slate-950">2. Connecter Chariow</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rendez-vous dans <em>Dashboard &gt; Ma Boutique</em>. Saisissez votre clé API Chariow pour synchroniser vos produits, prix et liens de paiement.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center">
                C
              </div>
              <h3 className="text-sm font-black text-slate-950">3. Lier une Démo Vidéo</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ajoutez le lien d'une vidéo YouTube (non répertoriée ou publique). Expliquez en 2 à 5 minutes la valeur de votre produit.
              </p>
            </Card>
          </div>
        </section>

        {/* SECTION 3: L'Algorithme de Recommandation */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">3</span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 font-serif-heading">
              Comment fonctionne l’Algorithme de Recommandation ?
            </h2>
          </div>

          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-950">
                  Le Moteur Hybride ManuX : 65% Vidéos / 35% Produits
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  L’algorithme évalue chaque contenu en temps réel selon 4 critères mathématiques objectifs :
                </p>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950">
                100% Données Réelles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs">
                    x4
                  </div>
                  <h4 className="text-xs font-black text-slate-950">Engagement Réel & Clics Chariow</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chaque fois qu’un visiteur clique sur « Acheter sur Chariow », laisse un avis pertinent ou aime un commentaire, le score de visibilité du produit augmente.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-xs">
                    x2
                  </div>
                  <h4 className="text-xs font-black text-slate-950">Présence d’une Démonstration Vidéo</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Les produits accompagnés d'une vidéo YouTube de démonstration bénéficient d'une priorisation systématique sur le flux d'accueil et la page Découverte.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                    x1.5
                  </div>
                  <h4 className="text-xs font-black text-slate-950">Fraîcheur & Nouveauté (Freshness)</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Un produit récemment publié ou mis à jour reçoit un coup de projecteur initial automatique pendant 7 jours afin de tester sa résonance avec le public.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center text-xs">
                    x1.2
                  </div>
                  <h4 className="text-xs font-black text-slate-950">Affinité Thématique & Géographique</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  L’algorithme recommande vos créations aux visiteurs qui consultent des catégories similaires ou qui partagent votre zone monétaire/pays.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* SECTION 4: Exemples Concrets de Vidéos de Démonstration */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">4</span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 font-serif-heading">
              Exemples pratiques : Que montrer dans sa vidéo de démonstration ?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                E-book / Guide PDF
              </span>
              <h4 className="text-xs font-black text-slate-950">Exemple : « Guide de l’Investissement »</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filmez votre écran en feuilletant le sommaire, montrez 2 études de cas concrètes sans dévoiler les secrets finaux, et expliquez les résultats obtenus par vos lecteurs.
              </p>
            </Card>

            <Card className="p-5 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                Formation Vidéo
              </span>
              <h4 className="text-xs font-black text-slate-950">Exemple : « Masterclass Montage Vidéo »</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Montrez un avant/après spectaculaire d’un montage, le dashboard de la formation avec les modules, et un extrait de 30 secondes d'un cours captivant.
              </p>
            </Card>

            <Card className="p-5 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                Templates & Logiciels
              </span>
              <h4 className="text-xs font-black text-slate-950">Exemple : « Dashboard Notion Business »</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Faites une démonstration en direct : ajoutez une tâche, générez une facture automatique et montrez comment l'acheteur gagnera 5 heures par semaine.
              </p>
            </Card>
          </div>
        </section>

        {/* SECTION 5: Conseils Pro pour Maximiser les Ventes */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">5</span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 font-serif-heading">
              Les 5 Clés d'Or pour Réussir sur ManuX
            </h2>
          </div>

          <Card className="p-6 sm:p-8 space-y-4">
            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-950">1. Titres clairs et axés sur le bénéfice :</strong> Évitez les titres vagues. Préférez <em>« Pack 50 Templates Canva pour Restaurants »</em> à <em>« Mon Pack Design »</em>.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-950">2. Répondez activement aux commentaires :</strong> Lorsqu’un visiteur pose une question, répondez rapidement depuis votre espace. Votre réponse affichera le badge officiel <strong>CRÉATEUR</strong>, renforçant la confiance.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-950">3. Soignez vos miniatures (Thumbnails) :</strong> Une image lumineuse, lisible sur smartphone et mettant en valeur le produit génère 3x plus de clics.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-950">4. Partagez le lien de votre vitrine ManuX :</strong> Utilisez votre URL publique <code>manux.xttools.site/creators/votre_pseudo</code> sur vos réseaux sociaux (WhatsApp, TikTok, Instagram, LinkedIn).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-950">5. Analysez vos statistiques :</strong> Consultez régulièrement votre onglet Analytics pour identifier les produits qui génèrent le plus de clics vers Chariow et doubler vos efforts sur ces thématiques.
                </div>
              </li>
            </ul>
          </Card>
        </section>

        {/* CTA Box */}
        <div className="bg-amber-400 text-slate-950 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-md">
          <h3 className="text-xl sm:text-2xl font-black font-serif-heading">
            Prêt à faire découvrir vos produits Chariow au monde ?
          </h3>
          <p className="text-xs sm:text-sm font-semibold max-w-lg mx-auto text-slate-900">
            Créez votre profil en 2 minutes, connectez votre boutique Chariow et commencez à publier vos démonstrations vidéo gratuitement.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link to="/auth/register">
              <Button variant="primary" size="md" className="bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-md">
                <span>Créer mon compte créateur</span>
              </Button>
            </Link>
            <Link to="/discover">
              <Button variant="outline" size="md" className="border-slate-950/30 hover:bg-black/5 text-slate-950 text-xs font-bold">
                <span>Explorer la plateforme</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
