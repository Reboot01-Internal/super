type UserAvatarProps = {
  src?: string;
  alt: string;
  fallback: string;
  sizeClass?: string;
  textClass?: string;
  className?: string;
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
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "relative grid flex-none place-items-center overflow-hidden rounded-full border border-slate-200 bg-white",
        sizeClass,
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full scale-[1.12] object-cover object-center"
        />
      ) : (
        <div className={cn("font-black text-slate-800", textClass)}>{fallback}</div>
      )}
    </div>
  );
}
