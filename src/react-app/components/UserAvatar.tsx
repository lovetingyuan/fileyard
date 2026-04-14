type UserAvatarProps = {
  email: string | undefined;
  avatarUrl?: string | null;
  authImage?: string | null;
  className?: string;
  textClassName?: string;
};

function buildAuthAvatarUrl(authImage: string | null | undefined): string | null {
  if (!authImage) {
    return null;
  }

  return `/api/profile/auth-avatar?v=${encodeURIComponent(authImage)}`;
}

export function UserAvatar({
  email,
  avatarUrl,
  authImage,
  className = "w-8 h-8",
  textClassName = "text-lg",
}: UserAvatarProps) {
  const fallback = email?.charAt(0).toUpperCase() ?? "?";
  const effectiveAvatarUrl = avatarUrl ?? buildAuthAvatarUrl(authImage);

  if (effectiveAvatarUrl) {
    return (
      <div className={`shrink-0 rounded-full bg-base-200 overflow-hidden ${className}`}>
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
      className={`shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-content ${className}`}
    >
      <span className={`font-bold ${textClassName}`}>{fallback}</span>
    </div>
  );
}
