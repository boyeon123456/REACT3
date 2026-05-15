import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { resolveStorageSrc } from '../../lib/storageAsset';

type StorageImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
};

export default function StorageImage({ src, ...props }: StorageImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    resolveStorageSrc(src)
      .then((nextSrc) => {
        if (active) setResolvedSrc(nextSrc);
      })
      .catch((error) => {
        console.error('Storage image resolve error:', error);
        if (active) setResolvedSrc(null);
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (!resolvedSrc) return null;
  return <img {...props} src={resolvedSrc} />;
}
