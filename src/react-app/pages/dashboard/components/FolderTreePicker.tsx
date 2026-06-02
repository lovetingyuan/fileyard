import { type ComponentType, type SVGProps } from "react";
import MdiFolder from "~icons/mdi/folder";
import type { FolderTreeNode } from "../../../../types";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function getFolderLabel(path: string, name: string) {
  return path ? name : "根目录";
}

function FolderTreeItem({
  Icon,
  getDisabledReason,
  isInteractionDisabled,
  node,
  onSelect,
  selectedPath,
}: {
  Icon: IconComponent;
  getDisabledReason: (path: string) => string | null;
  isInteractionDisabled: boolean;
  node: FolderTreeNode;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  const disabledReason = getDisabledReason(node.path);
  const isDisabled = Boolean(disabledReason) || isInteractionDisabled;
  const isSelected = selectedPath === node.path;
  const isSelectionVisible = isSelected && !isDisabled;

  return (
    <li>
      <button
        type="button"
        className={`gap-2 ${isSelectionVisible ? "menu-active" : ""}`.trim()}
        disabled={isDisabled}
        title={disabledReason ?? undefined}
        aria-pressed={isSelected}
        onClick={() => onSelect(node.path)}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isSelectionVisible ? "text-current" : node.path ? "text-warning" : "text-primary"
          }`}
        />
        <span className="min-w-0 flex-1 truncate text-left">
          {getFolderLabel(node.path, node.name)}
        </span>
        {disabledReason ? (
          <span className="shrink-0 text-xs text-base-content/45">{disabledReason}</span>
        ) : null}
      </button>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.path}
              Icon={MdiFolder}
              getDisabledReason={getDisabledReason}
              isInteractionDisabled={isInteractionDisabled}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FolderTreePicker({
  Icon,
  getDisabledReason,
  isInteractionDisabled,
  onSelect,
  selectedPath,
  tree,
}: {
  Icon: IconComponent;
  getDisabledReason: (path: string) => string | null;
  isInteractionDisabled: boolean;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  tree: FolderTreeNode;
}) {
  return (
    <ul className="menu menu-md w-full">
      <FolderTreeItem
        Icon={Icon}
        getDisabledReason={getDisabledReason}
        isInteractionDisabled={isInteractionDisabled}
        node={tree}
        onSelect={onSelect}
        selectedPath={selectedPath}
      />
    </ul>
  );
}
