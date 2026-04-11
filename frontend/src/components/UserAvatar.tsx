import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type UserAvatarProps = {
  src?: string;
  alt: string;
  fallback: string;
  sizeClass?: string;
  textClass?: string;
  className?: string;
  previewable?: boolean;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function UserAvatar({
  src,
  alt,
  fallback,
  sizeClass = "h-10 w-10",
  textClass = "text-[13px]",
  className,
  previewable = false,
}: UserAvatarProps) {
  const [open, setOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(Boolean(src));
  const [imgFailed, setImgFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canPreview = Boolean(src && imgLoaded && !imgFailed && previewable);

  useEffect(() => {
    setImgLoaded(Boolean(src));
    setImgFailed(false);
  }, [src]);

  useEffect(() => {
    const img = imgRef.current;
    if (!src || !img) return;
    if (!img.complete) return;

    if (img.naturalWidth > 0) {
      setImgLoaded(true);
      setImgFailed(false);
      return;
    }

    setImgLoaded(false);
    setImgFailed(true);
  }, [src]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleActivate = (event: React.MouseEvent | React.KeyboardEvent) => {
    if (!canPreview) return;
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <div
        role={canPreview ? "button" : undefined}
        tabIndex={canPreview ? 0 : undefined}
        aria-label={canPreview ? `Open ${alt} image` : undefined}
        onClick={canPreview ? handleActivate : undefined}
        onKeyDown={
          canPreview
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleActivate(event);
                }
              }
            : undefined
        }
        className={cn(
          "relative grid flex-none place-items-center overflow-hidden rounded-full border border-slate-200 bg-white",
          canPreview && "cursor-zoom-in transition hover:border-violet-200 hover:shadow-[0_10px_24px_rgba(109,94,252,0.14)] focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-200/60",
          sizeClass,
          className
        )}
      >
        <div className={cn("grid h-full w-full place-items-center font-black text-slate-800", textClass)}>
          {fallback}
        </div>
        {src && !imgFailed ? (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className="absolute inset-0 h-full w-full scale-[1.12] object-cover object-center"
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgFailed(true);
              setImgLoaded(false);
            }}
          />
        ) : null}
      </div>

      {open && src && imgLoaded && !imgFailed && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/70 p-4"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label={`${alt} image preview`}
            >
              <div
                className="max-w-[min(92vw,520px)] rounded-[28px] border border-white/20 bg-white p-4 shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="truncate text-[16px] font-black text-slate-950">{alt}</div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
                    aria-label="Close image preview"
                  >
                    Close
                  </button>
                </div>
                <img
                  src={src}
                  alt={alt}
                  className="max-h-[70vh] w-full rounded-[22px] object-contain"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
