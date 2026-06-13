import { cn } from "../utils/cn";

type UserAvatarProps = {
  email: string | undefined;
  avatarUrl?: string | null;
  authImage?: string | null;
  className?: string;
  textClassName?: string;
};

export function UserAvatar({
  email,
  avatarUrl,
  authImage,
  className = "w-8 h-8",
  textClassName = "text-lg",
}: UserAvatarProps) {
  const fallback = email?.charAt(0).toUpperCase() ?? "?";
  const authAvatarUrl = authImage
    ? `/api/profile/auth-avatar?v=${encodeURIComponent(authImage)}`
    : null;
  const effectiveAvatarUrl = avatarUrl ?? authAvatarUrl;

  if (effectiveAvatarUrl) {
    return (
      <div className={cn("shrink-0 overflow-hidden rounded-full bg-base-200", className)}>
        <img
          src={effectiveAvatarUrl}
          alt={`${email ?? "User"} avatar`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-content",
        className,
      )}
    >
      <span className={cn("font-bold", textClassName)}>{fallback}</span>
    </div>
  );
}
