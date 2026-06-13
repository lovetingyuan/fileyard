import {
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
} from "react";
import {
  createDropdownAnchorName,
  type DropdownPlacement,
  getDropdownPlacementClassName,
  isPopoverAnchorDropdownSupported,
} from "./dropdownSupport";
import { cn } from "../utils/cn";

type AnchorPositionStyle = CSSProperties & {
  anchorName?: string;
  positionAnchor?: string;
};

type DataAttributes = {
  [key: `data-${string}`]: string | number | undefined;
};

type DropdownContainerProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "className"> &
  DataAttributes;

type DropdownProps = {
  trigger: ReactNode;
  triggerClassName?: string;
  triggerAriaLabel: string;
  disabled?: boolean;
  placement?: DropdownPlacement;
  containerClassName?: string;
  containerProps?: DropdownContainerProps;
  contentClassName?: string;
  closeOnContentClick?: boolean;
  children: ReactNode;
};

export function Dropdown({
  trigger,
  triggerClassName = "",
  triggerAriaLabel,
  disabled = false,
  placement = "bottom-end",
  containerClassName = "",
  containerProps,
  contentClassName = "",
  closeOnContentClick = true,
  children,
}: DropdownProps) {
  const reactId = useId();
  const contentRef = useRef<HTMLUListElement | null>(null);
  const anchorName = createDropdownAnchorName(reactId);
  const popoverId = `${anchorName.slice(2)}-popover`;
  const placementClassName = getDropdownPlacementClassName(placement);
  const supportsPopover = isPopoverAnchorDropdownSupported();
  const triggerAnchorStyle: AnchorPositionStyle = { anchorName };
  const contentAnchorStyle: AnchorPositionStyle = { positionAnchor: anchorName };

  const closeDropdown = () => {
    if (!closeOnContentClick) {
      return;
    }

    const popoverElement = contentRef.current as
      | (HTMLUListElement & { hidePopover?: () => void })
      | null;
    if (popoverElement?.hasAttribute("popover")) {
      popoverElement.hidePopover?.();
    }
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const handleFallbackTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.key === " ") {
      event.preventDefault();
    }
  };

  if (supportsPopover) {
    return (
      <div {...containerProps} className={containerClassName}>
        <button
          type="button"
          className={triggerClassName}
          disabled={disabled}
          aria-label={triggerAriaLabel}
          popoverTarget={disabled ? undefined : popoverId}
          style={triggerAnchorStyle}
        >
          {trigger}
        </button>
        <ul
          ref={contentRef}
          popover="auto"
          id={popoverId}
          className={cn("dropdown", placementClassName, contentClassName)}
          style={contentAnchorStyle}
          onClick={closeDropdown}
        >
          {children}
        </ul>
      </div>
    );
  }

  return (
    <div
      {...containerProps}
      className={cn("dropdown", placementClassName, containerClassName)}
    >
      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        className={cn(triggerClassName, disabled && "pointer-events-none opacity-40")}
        aria-label={triggerAriaLabel}
        aria-disabled={disabled || undefined}
        onKeyDown={handleFallbackTriggerKeyDown}
      >
        {trigger}
      </div>
      <ul
        ref={contentRef}
        tabIndex={-1}
        className={cn("dropdown-content", contentClassName)}
        onClick={closeDropdown}
      >
        {children}
      </ul>
    </div>
  );
}
