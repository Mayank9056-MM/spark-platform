import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

export type HvpmLogoSize = 'nav' | 'mobile' | 'brand' | 'large';

const SIZE_MAP: Record<HvpmLogoSize, { width: number; height: number; className: string }> = {
  nav: {
    width: 32,
    height: 36,
    className: 'h-8.5 w-auto object-contain',
  },
  mobile: {
    width: 52,
    height: 60,
    className: 'h-13 w-auto object-contain',
  },
  brand: {
    width: 82,
    height: 94,
    className: 'h-22 w-auto object-contain',
  },
  large: {
    width: 104,
    height: 118,
    className: 'h-26 w-auto object-contain',
  },
};

export interface HvpmLogoProps extends Omit<ComponentPropsWithoutRef<typeof Image>, 'src' | 'alt'> {
  size?: HvpmLogoSize;
  alt?: string;
  className?: string;
}

/**
 * Official HVPM COET Institutional Emblem component.
 *
 * Utilizes the high-resolution vector/raster emblem from public/hvpm_coet_logo.png
 * with precise aspect ratio preservation, high-DPI rendering, and accessible metadata.
 */
export function HvpmLogo({
  size = 'brand',
  alt = 'HVPM College of Engineering and Technology emblem',
  className,
  priority = true,
  ...props
}: HvpmLogoProps) {
  const config = SIZE_MAP[size];

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center select-none',
        className,
      )}
    >
      <Image
        src="/hvpm_coet_logo.png"
        alt={alt}
        width={config.width}
        height={config.height}
        priority={priority}
        className={cn(config.className, 'transition-transform duration-200')}
        {...props}
      />
    </div>
  );
}
