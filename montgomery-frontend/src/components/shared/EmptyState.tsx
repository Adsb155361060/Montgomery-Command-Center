import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <div className="w-16 h-16 rounded-full bg-slate-700/50 border border-slate-600/50 flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-medium">{title}</p>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>
    </motion.div>
  );
}
