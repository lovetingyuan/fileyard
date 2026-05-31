export type DropdownPlacement = "bottom-end" | "top-end";

type DropdownSupportEnvironment = {
  htmlElementPrototype?: object | null;
  cssSupports?: ((query: string) => boolean) | null;
};

const DROPDOWN_PLACEMENT_CLASS_NAMES = {
  "bottom-end": "dropdown-end",
  "top-end": "dropdown-top dropdown-end",
} satisfies Record<DropdownPlacement, string>;

export function getDropdownPlacementClassName(placement: DropdownPlacement) {
  return DROPDOWN_PLACEMENT_CLASS_NAMES[placement];
}

export function createDropdownAnchorName(id: string) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");

  return `--fileyard-dropdown-${safeId || "anchor"}`;
}

function getDefaultDropdownSupportEnvironment(): DropdownSupportEnvironment {
  return {
    htmlElementPrototype: typeof HTMLElement === "undefined" ? null : HTMLElement.prototype,
    cssSupports: typeof CSS === "undefined" ? null : (query) => CSS.supports(query),
  };
}

export function isPopoverAnchorDropdownSupported(
  environment = getDefaultDropdownSupportEnvironment(),
) {
  const { cssSupports, htmlElementPrototype } = environment;

  return Boolean(
    htmlElementPrototype &&
    "popover" in htmlElementPrototype &&
    cssSupports?.("position-area: bottom") &&
    cssSupports("anchor-name: --fileyard-dropdown") &&
    cssSupports("position-anchor: --fileyard-dropdown"),
  );
}
