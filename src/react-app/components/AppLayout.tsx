import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useProfile } from "../hooks/useProfileApi";
import { UserAvatar } from "./UserAvatar";
import { ThemeSwitcher } from "./ThemeSwitcher";

function AuthenticatedNavMenu() {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="flex-none flex items-center gap-2">
      <ThemeSwitcher />
      <Link
        to="/profile"
        className="btn btn-ghost btn-circle avatar"
        aria-label="Go to profile"
        title={user?.email}
      >
        <UserAvatar email={user?.email} avatarUrl={profile?.avatarUrl} authImage={user?.image} />
      </Link>
    </div>
  );
}

export function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-base-200">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base-100/70 via-base-200 to-base-200"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-[-12rem] h-80 w-80 rounded-full bg-primary/8 blur-3xl md:h-96 md:w-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-20 right-[-10rem] h-72 w-72 rounded-full bg-accent/6 blur-3xl md:h-[26rem] md:w-[26rem]"
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <nav className="navbar sticky top-0 z-20 shrink-0 bg-base-100 px-6 shadow-sm">
          <div className="mr-auto p-1">
            <Link to="/" className="flex items-center gap-2 text-xl">
              <img src="/favicon.svg" alt="logo" className="h-6 w-6" />
              <span>Fileyard</span>
            </Link>
          </div>
          {user ? (
            <AuthenticatedNavMenu />
          ) : (
            <div className="flex-none">
              <ThemeSwitcher />
            </div>
          )}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
