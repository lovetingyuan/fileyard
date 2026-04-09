import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfileApi";
import { UserAvatar } from "./UserAvatar";
import { ThemeSwitcher } from "./ThemeSwitcher";

function AuthenticatedNavMenu() {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="flex-none flex items-center gap-2">
      <ThemeSwitcher />
      <Link to="/profile" className="btn btn-ghost btn-circle avatar" aria-label="Go to profile">
        <UserAvatar email={user?.email} avatarUrl={profile?.avatarUrl} />
      </Link>
    </div>
  );
}

export function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-base-200">
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

      <div className="relative z-10 flex min-h-screen flex-col">
        <nav className="navbar bg-base-100 shadow-sm px-6">
          <div className="mr-auto p-1">
            <Link to="/" className="flex items-center gap-2 text-xl">
              <img src="/favicon.svg" alt="logo" className="h-6 w-6" />
              <span>File Share</span>
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

        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>

        <footer className="bg-base-200 py-2 text-center text-xs text-base-content/80">
          Built at {import.meta.env.VITE_BUILD_TIME}
        </footer>
      </div>
    </div>
  );
}
