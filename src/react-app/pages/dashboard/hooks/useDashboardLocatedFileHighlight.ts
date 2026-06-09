import { useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { clearDashboardLocatedFilePath } from '../actions'
import {
  DASHBOARD_FILE_LOCATION_HIGHLIGHT_MS,
  DASHBOARD_FILE_LOCATION_SCROLL_DELAY_MS,
  scrollDashboardLocatedFileIntoView,
} from '../utils/dashboardFileLocation'

export function useDashboardLocatedFileHighlight<TElement extends HTMLElement>(filePath: string) {
  const elementRef = useRef<TElement>(null)
  const { dashboardLocatedFilePath } = useAppStore()
  const isHighlighted = dashboardLocatedFilePath === filePath

  useEffect(() => {
    if (!isHighlighted) {
      return
    }

    const scrollTimer = window.setTimeout(() => {
      scrollDashboardLocatedFileIntoView(elementRef.current)
    }, DASHBOARD_FILE_LOCATION_SCROLL_DELAY_MS)
    const highlightTimer = window.setTimeout(() => {
      clearDashboardLocatedFilePath(filePath)
    }, DASHBOARD_FILE_LOCATION_HIGHLIGHT_MS)

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(highlightTimer)
    }
  }, [filePath, isHighlighted])

  return {
    elementRef,
    isHighlighted,
  }
}
