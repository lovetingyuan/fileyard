export const DASHBOARD_TREE_SCROLL_CONTAINER_SELECTOR =
  '[data-dashboard-tree-scroll-container="true"]'

function getClampedScrollTop(scrollTop: number, container: Element) {
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.min(Math.max(0, scrollTop), maxScrollTop)
}

function isDashboardTreeScrollContainer(element: Element | null): element is HTMLElement {
  return Boolean(
    element &&
      typeof element.clientHeight === 'number' &&
      typeof element.scrollHeight === 'number' &&
      typeof element.scrollTop === 'number',
  )
}

export function scrollCurrentFileTreeRowIntoView(row: HTMLElement | null, isCurrent: boolean) {
  if (!isCurrent || !row) {
    return
  }

  const scrollContainer = row.closest(DASHBOARD_TREE_SCROLL_CONTAINER_SELECTOR)
  if (!isDashboardTreeScrollContainer(scrollContainer)) {
    return
  }

  const rowRect = row.getBoundingClientRect()
  const containerRect = scrollContainer.getBoundingClientRect()
  const rowOffsetTop = rowRect.top - containerRect.top + scrollContainer.scrollTop
  const targetScrollTop = rowOffsetTop + rowRect.height / 2 - scrollContainer.clientHeight / 2

  scrollContainer.scrollTop = getClampedScrollTop(targetScrollTop, scrollContainer)
}
