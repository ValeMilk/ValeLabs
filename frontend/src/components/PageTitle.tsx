import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface PageTitleProps {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  /** Classe de cor do ícone — mesma família usada na aba correspondente da navbar. */
  iconColor?: string;
}

const ICON_SIZE = 30;
const ICON_GAP_PX = 12;

/**
 * Título de página com o ícone da respectiva aba da navbar fazendo um
 * balanço leve e contínuo — reforça a identidade da seção sem competir com o
 * conteúdo (a animação para de vez em quando, não é um loop óbvio o tempo todo).
 */
export function PageTitle({ icon: Icon, title, subtitle, iconColor = 'text-blue-600' }: PageTitleProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <motion.div
          className={iconColor}
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        >
          <Icon size={ICON_SIZE} strokeWidth={2.25} />
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      {subtitle && (
        <p className="text-gray-600 mt-1" style={{ marginLeft: ICON_SIZE + ICON_GAP_PX }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
