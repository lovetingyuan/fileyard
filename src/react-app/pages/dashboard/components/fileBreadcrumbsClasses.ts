const enabledBreadcrumbButtonClassName = "link link-hover";
const disabledBreadcrumbButtonClassName = "cursor-not-allowed text-base-content/50 no-underline";

export function getBreadcrumbButtonClassName(isNavigationDisabled: boolean) {
  return isNavigationDisabled
    ? disabledBreadcrumbButtonClassName
    : enabledBreadcrumbButtonClassName;
}
