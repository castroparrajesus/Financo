import Image from 'next/image';

export function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = {
    sm: { width: 36, height: 30, className: 'h-8 w-9' },
    md: { width: 48, height: 40, className: 'h-10 w-12' },
    lg: { width: 64, height: 54, className: 'h-14 w-16' },
  }[size];

  return (
    <Image
      src="/image copy.png"
      alt="Financo"
      width={dimensions.width}
      height={dimensions.height}
      className={`${dimensions.className} object-contain`}
      priority={size !== 'sm'}
    />
  );
}
