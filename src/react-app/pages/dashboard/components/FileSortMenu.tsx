import MdiArrowDown from "~icons/mdi/arrow-down";
import MdiArrowUp from "~icons/mdi/arrow-up";
import MdiSwapVertical from "~icons/mdi/swap-vertical";
import type { SortKey } from "../../../../types";
import { Dropdown } from "../../../components/Dropdown";
import { useAppStore } from "../../../store";
import { toggleDashboardSort } from "../actions";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "uploadedAt", label: "按时间排序" },
  { key: "name", label: "按名称排序" },
  { key: "size", label: "按大小排序" },
];

export function FileSortMenu() {
  const { dashboardSortKey, dashboardSortOrder } = useAppStore();
  const ActiveSortIcon = dashboardSortOrder === "asc" ? MdiArrowUp : MdiArrowDown;
  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.key === dashboardSortKey)?.label ?? "按时间排序";
  const sortOrderLabel = dashboardSortOrder === "asc" ? "升序" : "降序";

  return (
    <Dropdown
      containerClassName="tooltip"
      containerProps={{ "data-tip": `当前排序：${activeSortLabel}（${sortOrderLabel}）` }}
      trigger={<MdiSwapVertical className="h-5 w-5" />}
      triggerClassName="btn btn-ghost btn-square btn-sm"
      triggerAriaLabel="排序方式"
      placement="bottom-end"
      contentClassName="menu menu-sm bg-base-200 rounded-box z-20 mt-1 w-40 border border-base-300/60 p-2 shadow-lg space-y-1"
    >
      <>
        {SORT_OPTIONS.map((option) => {
          const isActive = dashboardSortKey === option.key;
          const SortIcon = isActive ? ActiveSortIcon : MdiSwapVertical;

          return (
            <li key={option.key}>
              <button
                type="button"
                className={`gap-2 ${isActive ? "active font-medium" : ""}`}
                aria-current={isActive ? "true" : undefined}
                aria-label={option.label}
                onClick={() => toggleDashboardSort(option.key)}
              >
                <SortIcon className={`h-4 w-4 ${isActive ? "" : "opacity-50"}`} />
                {option.label}
              </button>
            </li>
          );
        })}
      </>
    </Dropdown>
  );
}
