'use client';

import type { PostImage } from '@narad/contracts';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

export function PostImages({ images }: { images: PostImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  if (images.length === 0) return null;

  const count = images.length;
  const current = open !== null ? images[open] : undefined;
  const step = (delta: number) => setOpen((i) => (i === null ? null : (i + delta + count) % count));

  function onKey(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  }

  const nav =
    'absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80';

  return (
    <div className="mt-3">
      <div className={'grid gap-1.5 ' + (count === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={'View image ' + (i + 1) + ' of ' + count}
            className="overflow-hidden rounded-lg border border-border"
          >
            <Image
              src={img.url}
              alt={'Attached image ' + (i + 1)}
              width={img.width}
              height={img.height}
              unoptimized
              className={
                count === 1
                  ? 'h-auto max-h-96 w-full object-cover'
                  : 'aspect-square w-full object-cover'
              }
            />
          </button>
        ))}
      </div>

      <dialog
        ref={ref}
        onClose={() => setOpen(null)}
        onKeyDown={onKey}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
        aria-label="Image viewer"
        className="m-auto max-h-[95vh] max-w-[95vw] bg-transparent p-0 backdrop:bg-black/80"
      >
        {current ? (
          <div className="relative">
            <Image
              src={current.url}
              alt={'Image ' + ((open ?? 0) + 1) + ' of ' + count}
              width={current.width}
              height={current.height}
              unoptimized
              className="max-h-[90vh] w-auto max-w-[92vw] rounded-md object-contain"
            />
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous image"
                  className={nav + ' left-2'}
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next image"
                  className={nav + ' right-2'}
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
