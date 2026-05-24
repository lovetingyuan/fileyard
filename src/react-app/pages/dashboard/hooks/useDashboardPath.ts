import { useSearchParams } from "react-router-dom";
import { resetDashboardPathState } from "../actions";

export function useDashboardPath() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPath = searchParams.get("path") ?? "";
  const breadcrumbs = currentPath ? currentPath.split("/") : [];

  const setPath = (path: string) => {
    const nextSearchParams = new URLSearchParams();
    if (path) {
      nextSearchParams.set("path", path);
    }
    setSearchParams(nextSearchParams);
    resetDashboardPathState();
  };

  return {
    breadcrumbs,
    currentPath,
    setPath,
  };
}
