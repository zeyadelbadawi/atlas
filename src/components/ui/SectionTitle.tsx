import { cn } from '@/utils/cn';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
  className?: string;
}

export function SectionTitle({ title, subtitle, centered = true, light = false, className = '' }: SectionTitleProps) {
  return (
    <div className={cn(centered && 'text-center', 'mb-12', className)}>
      <h2 className={cn(
        'text-3xl md:text-4xl lg:text-5xl font-bold mb-4',
        light ? 'text-white' : 'text-gray-900'
      )}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn(
          'text-lg md:text-xl max-w-3xl',
          centered && 'mx-auto',
          light ? 'text-white/80' : 'text-gray-600'
        )}>
          {subtitle}
        </p>
      )}
      <div className={cn(
        'mt-6 h-1 w-20 rounded-full bg-[#167F65]',
        centered && 'mx-auto'
      )} />
    </div>
  );
}