import type { ReactNode } from "react";

type DetailItem = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

interface DetailsListProps {
  items: DetailItem[];
  labelWidthClassName?: string;
}

export function DetailsList({ items, labelWidthClassName = "w-12" }: DetailsListProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-1 text-sm">
          <span
            className={`${labelWidthClassName} shrink-0 whitespace-nowrap text-base-content/60`}
          >
            {item.label}：
          </span>
          <div
            className={`min-w-0 flex-1 font-medium text-base-content ${item.valueClassName ?? ""}`}
          >
            {item.value}
          </div>
        </li>
      ))}
    </ul>
  );
}
