import React from 'react';
import { PackageOpen, Users, Video, ShoppingBag } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Link } from 'react-router-dom';

export interface EmptyStateProps {
  type?: 'products' | 'creators' | 'videos' | 'stores' | 'general';
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'general',
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = '',
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'products':
        return {
          icon: <PackageOpen className="w-9 h-9 text-slate-400 stroke-[1.5]" />,
          title: 'Aucun produit pour le moment.',
          description: 'Les créateurs et boutiques partenaires préparent de nouvelles offres.',
        };
      case 'videos':
        return {
          icon: <Video className="w-9 h-9 text-slate-400 stroke-[1.5]" />,
          title: 'Aucune vidéo disponible.',
          description: 'Les vidéos de démonstrations et présentations de produits seront publiées ici.',
        };
      case 'creators':
        return {
          icon: <Users className="w-9 h-9 text-slate-400 stroke-[1.5]" />,
          title: 'Les premiers créateurs arrivent bientôt.',
          description: 'Rejoignez ManuX et soyez parmi les premiers créateurs à présenter vos produits.',
        };
      case 'stores':
        return {
          icon: <ShoppingBag className="w-9 h-9 text-slate-400 stroke-[1.5]" />,
          title: 'Aucune boutique connectée.',
          description: 'Connectez votre boutique Chariow pour synchroniser vos produits instantanément.',
        };
      default:
        return {
          icon: <PackageOpen className="w-9 h-9 text-slate-400 stroke-[1.5]" />,
          title: 'Aucun élément trouvé',
          description: 'Il n\'y a pas encore de données enregistrées dans cette section.',
        };
    }
  };

  const defaultContent = getDefaultContent();
  const finalTitle = title || defaultContent.title;
  const finalDesc = description || defaultContent.description;

  return (
    <Card className={`p-8 lg:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-slate-100/90 flex items-center justify-center mb-4 text-slate-500">
        {defaultContent.icon}
      </div>
      <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1.5">
        {finalTitle}
      </h3>
      <p className="text-xs lg:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {finalDesc}
      </p>

      {actionText && (
        actionHref ? (
          <Link to={actionHref}>
            <Button variant="primary" size="sm">
              {actionText}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        )
      )}
    </Card>
  );
};
