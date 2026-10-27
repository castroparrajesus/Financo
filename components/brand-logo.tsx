import Image from 'next/image';

export function BrandLogo({
  size = 'md',
  className = '',
  priority = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean;
}) {
  const dimensions = {
    sm: { width: 36, height: 30, className: 'h-8 w-9' },
    md: { width: 48, height: 40, className: 'h-10 w-12' },
    lg: { width: 64, height: 54, className: 'h-14 w-16' },
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${dimensions.className} ${className}`}
      suppressHydrationWarning
    >
      <Image
        src="/brand-logo.png"
        alt="Financo"
        width={dimensions.width}
        height={dimensions.height}
        priority={priority}
        style={{ width: 'auto', height: 'auto' }}
        className="max-h-full max-w-full object-contain"
        referrerPolicy="no-referrer"
        suppressHydrationWarning
      />
    </div>
  );
}

