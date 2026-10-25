"use client";

import { useCallback, useEffect, useState, type SyntheticEvent, type ReactNode } from 'react';
import { visibleLogoBounds } from '@/lib/logo-bounds';

type Dimensions = { width: number; height: number };

// Fit the visible artwork into its slot, without altering the uploaded file.
export function CompanyLogoImage({ src, alt, className, onDimensions, fallback }: {
  src: string; alt: string; className?: string; onDimensions?: (size: Dimensions) => void; fallback?: ReactNode;
}) {
  const [measured, setMeasured] = useState<{ src: string; size: Dimensions; viewBox: string; intrinsic?: Dimensions } | null>(null);
  const [failure, setFailure] = useState({ src, attempts: 0 });
  const attempts = failure.src === src ? failure.attempts : 0;
  const [retry, setRetry] = useState({ src, count: 0 });
  const retryCount = retry.src === src ? retry.count : 0;
  const imageSrc = retryCount && !src.startsWith('data:') ? `${src}${src.includes('?') ? '&' : '?'}logoRetry=${retryCount}` : src;
  const measureImage = useCallback((image: HTMLImageElement) => {
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
  }, [src, onDimensions]);
  const imageRef = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth) measureImage(image);
  }, [measureImage]);
  useEffect(() => {
    if (!attempts || attempts > 2) return;
    const timer = setTimeout(() => setRetry({ src, count: attempts }), attempts * 1500);
    return () => clearTimeout(timer);
  }, [src, attempts]);
  useEffect(() => {
    if (!attempts) return;
    const recover = () => {
      setFailure({ src, attempts: 0 });
      setRetry(previous => ({ src, count: (previous.src === src ? previous.count : 0) + 1 }));
    };
    window.addEventListener('online', recover);
    window.addEventListener('focus', recover);
    return () => {
      window.removeEventListener('online', recover);
      window.removeEventListener('focus', recover);
    };
  }, [src, attempts]);
  function failed() {
    setFailure(previous => ({ src, attempts: previous.src === src ? previous.attempts + 1 : 1 }));
    setMeasured(null);
  }
  function measure(event: SyntheticEvent<HTMLImageElement>) { measureImage(event.currentTarget); }


  if (attempts > 2 || attempts > retryCount) return fallback ? <>{fallback}</> : <span role="img" aria-label={alt} className={`${className || ''} flex items-center text-xs`}>{alt}</span>;
  if (!measured || measured.src !== src) {
    // Keep artwork visible while measuring; failures must never leave a hidden slot.
    return <img key={imageSrc} ref={imageRef} src={imageSrc} alt={alt} onLoad={measure} onError={failed} className={`${className || ''} object-contain object-left`} />;
  }
  return (
    <svg role="img" aria-label={alt} viewBox={measured.viewBox} preserveAspectRatio="xMinYMid meet" className={className} width={measured.intrinsic?.width} height={measured.intrinsic?.height}>
      <image onError={failed} href={imageSrc} width={measured.size.width} height={measured.size.height} />
    </svg>
  );
}
