"use client";

import { useState, type SyntheticEvent } from 'react';
import { visibleLogoBounds } from '@/lib/logo-bounds';

type Dimensions = { width: number; height: number };

// Fit the visible artwork into its slot, without altering the uploaded file.
export function CompanyLogoImage({ src, alt, className, onDimensions }: {
  src: string; alt: string; className?: string; onDimensions?: (size: Dimensions) => void;
}) {
  const [measured, setMeasured] = useState<{ src: string; size: Dimensions; viewBox: string; intrinsic?: Dimensions } | null>(null);
  function measure(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const size = { width: image.naturalWidth, height: image.naturalHeight };
    if (!size.width || !size.height) return;
    let viewBox = `0 0 ${size.width} ${size.height}`;
    try {
      // Bound analysis memory even when a compressed upload has huge dimensions.
      const scale = Math.min(1, 1024 / Math.max(size.width, size.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(size.width * scale));
      canvas.height = Math.max(1, Math.round(size.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const bounds = visibleLogoBounds(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        const sx = size.width / canvas.width, sy = size.height / canvas.height;
        viewBox = `${bounds.x * sx} ${bounds.y * sy} ${bounds.width * sx} ${bounds.height * sy}`;
      }
    } catch { /* External images without canvas access retain their full bounds. */ }
    const parts = viewBox.split(' ').map(Number);
    const intrinsic = { width: parts[2], height: parts[3] };
    setMeasured({ src, size, viewBox, intrinsic });
    onDimensions?.(size);
  }

  if (!measured || measured.src !== src) {
    // Reserve the slot without painting padded artwork at a different scale.
    return <img src={src} alt={alt} onLoad={measure} crossOrigin="anonymous" style={{ visibility: 'hidden' }} className={`${className || ''} object-contain object-left`} />;
  }
  return (
    <svg role="img" aria-label={alt} viewBox={measured.viewBox} preserveAspectRatio="xMinYMid meet" className={className} width={measured.intrinsic?.width} height={measured.intrinsic?.height}>
      <image href={src} width={measured.size.width} height={measured.size.height} />
    </svg>
  );
}
