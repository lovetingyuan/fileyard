import { Hono } from 'hono'
import type { TopBannerMessage, TopBannerResponse } from '../../types'
import type { AppContext } from '../context'
import { jsonError } from '../utils/response'

const TOP_BANNER_MESSAGE_KEY = 'top_banner_message'

const topBanner = new Hono<AppContext>()

function toBannerDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function parseTopBannerMessage(rawMessage: string | null): TopBannerMessage | null {
  if (!rawMessage?.trim()) {
    return null
  }

  try {
    const parsed = JSON.parse(rawMessage) as unknown
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const record = parsed as Record<string, unknown>
    if (!record.show) {
      return null
    }
    const date = toBannerDate(record.date)
    const contentHtml = typeof record.content === 'string' ? record.content.trim() : null

    if (!date || !contentHtml || record.show !== true) {
      return null
    }

    return {
      date,
      contentHtml,
    }
  } catch {
    return null
  }
}

topBanner.get('/api/top-banner', async c => {
  try {
    const rawMessage = await c.env.FILE_YARD_KV.get(TOP_BANNER_MESSAGE_KEY)
    const response: TopBannerResponse = {
      success: true,
      banner: parseTopBannerMessage(rawMessage),
    }

    return c.json(response, 200, {
      'Cache-Control': 'no-store',
    })
  } catch (error) {
    console.error('Failed to load top banner message', error)
    return jsonError(c, 'Failed to load top banner message', 500)
  }
})

export default topBanner
