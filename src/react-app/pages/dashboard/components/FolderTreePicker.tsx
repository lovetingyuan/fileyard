import { type ComponentType, type SVGProps } from "react";
import MdiFolder from "~icons/mdi/folder";
import MdiLock from "~icons/mdi/lock";
import type { FolderTreeNode } from "../../../../types";
import { useAppStore } from "../../../store";
import { cn } from "../../../utils/cn";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function getFolderLabel(path: string, name: string) {
  return path ? name : "根目录";
}

function hasExactFolderUnlockToken(folderUnlockTokens: Record<string, string>, path: string) {
  return Object.prototype.hasOwnProperty.call(folderUnlockTokens, path);
}

function FolderTreeItem({
  Icon,
  folderUnlockTokens,
  getDisabledReason,
  isNodeHidden,
  isInteractionDisabled,
  node,
  onSelect,
  selectedPath,
}: {
  Icon: IconComponent;
  folderUnlockTokens: Record<string, string>;
  getDisabledReason: (path: string) => string | null;
  isNodeHidden: (path: string) => boolean;
  isInteractionDisabled: boolean;
  node: FolderTreeNode;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  const isPasswordVerified = hasExactFolderUnlockToken(folderUnlockTokens, node.path);
  const disabledReason =
    node.passwordProtected && !isPasswordVerified ? "已加密" : getDisabledReason(node.path);
  const isDisabled = Boolean(disabledReason) || isInteractionDisabled;
  const isSelected = selectedPath === node.path;
  const isSelectionVisible = isSelected && !isDisabled;
  const visibleChildren = node.children.filter((child) => !isNodeHidden(child.path));

  return (
    <li className={cn(isDisabled && "disabled")}>
      <button
        type="button"
        className={cn(
          "gap-2",
          isSelectionVisible && "menu-active",
          isDisabled && "cursor-not-allowed text-base-content/40",
        )}
        disabled={isDisabled}
        title={disabledReason ?? undefined}
        aria-pressed={isSelected}
        onClick={() => onSelect(node.path)}
      >
        <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              isDisabled
                ? "text-base-content/35"
                : isSelectionVisible
                  ? "text-current"
                  : node.path
                    ? "text-warning"
                    : "text-primary",
            )}
          />
          {node.passwordProtected ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full bg-base-100 shadow-sm ring-1 ring-base-300/70",
                isDisabled
                  ? "text-base-content/45"
                  : isPasswordVerified
                    ? "text-success"
                    : "text-base-content",
              )}
            >
              <MdiLock className="h-2 w-2" />
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">
          {getFolderLabel(node.path, node.name)}
        </span>
        {disabledReason ? (
          <span className="shrink-0 text-xs text-base-content/45">{disabledReason}</span>
        ) : null}
      </button>
      {visibleChildren.length > 0 ? (
        <ul className="!ms-2 !ps-1">
          {visibleChildren.map((child) => (
            <FolderTreeItem
              key={child.path}
              Icon={MdiFolder}
              folderUnlockTokens={folderUnlockTokens}
              getDisabledReason={getDisabledReason}
              isNodeHidden={isNodeHidden}
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
  isNodeHidden = () => false,
  isInteractionDisabled,
  onSelect,
  selectedPath,
  tree,
}: {
  Icon: IconComponent;
  getDisabledReason: (path: string) => string | null;
  isNodeHidden?: (path: string) => boolean;
  isInteractionDisabled: boolean;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  tree: FolderTreeNode;
}) {
  const { folderUnlockTokens } = useAppStore();

  return (
    <ul className="menu menu-md w-full">
      <FolderTreeItem
        Icon={Icon}
        folderUnlockTokens={folderUnlockTokens}
        getDisabledReason={getDisabledReason}
        isNodeHidden={isNodeHidden}
        isInteractionDisabled={isInteractionDisabled}
        node={tree}
        onSelect={onSelect}
        selectedPath={selectedPath}
      />
    </ul>
  );
}
