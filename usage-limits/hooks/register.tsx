import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'usage-limits', key: 'limits' } as const, [] as Limit[], {
  shape: 'limits-1',
})

const NAMES: Record<string, string> = { five_hour: '5h', seven_day: 'Week', spend_limit: 'Spend' }
const ORDER = ['five_hour', 'seven_day', 'spend_limit']
const WARN_AT = [80, 90]
const BAR = 10

function level(p: number): { icon: string; color: string } {
  if (p < 50) return { icon: '☀', color: 'green' }
  if (p < 75) return { icon: '☁', color: 'yellow' }
  if (p < 90) return { icon: '☂', color: 'magenta' }
  return { icon: '↯', color: 'red' }
}

function bar(p: number): string {
  const full = Math.max(0, Math.min(BAR, Math.round((p / 100) * BAR)))
  return '█'.repeat(full) + '░'.repeat(BAR - full)
}

function left(p: number): number {
  return Math.max(0, Math.round((100 - p) * 10) / 10)
}

function untilReset(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return '?'
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms) || ms <= 0) return 'resetting'
  const mins = Math.round(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d}d${h}h`
  if (h > 0) return `${h}h${m}m`
  return `${m}m`
}

function name(kind: string): string {
  return NAMES[kind] ?? kind
}

function pick(rs: readonly SessionRateLimit[]): Limit[] {
  return rs
    .map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt }))
    .sort((a, b) => (ORDER.indexOf(a.kind) + 99) % 99 - (ORDER.indexOf(b.kind) + 99) % 99)
}

async function save($: EngineInterface, rs: readonly SessionRateLimit[]) {
  await update($, limits, () => pick(rs))
}

export const register: Register = on => {
  const warned = new Map<string, number>()

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'usage-limits',
      description: 'Show 5-hour and weekly usage: used, left, time to reset',
    })
    await save($, (await $.session.usage()).rateLimits)
    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await save($, e.rateLimits)
      const now = await $.clock.now()
      for (const l of e.rateLimits) {
        const hit = WARN_AT.filter(t => l.percentUsed >= t).pop() ?? 0
        if (hit > (warned.get(l.kind) ?? 0)) {
          $.ui.toast(`${name(l.kind)} usage reached ${l.percentUsed}% (resets in ${untilReset(l.resetsAt, now)})`)
        }
        warned.set(l.kind, hit)
      }
    }
    return next(e)
  })

  on('command.run', { command: 'usage-limits' }, async $ => {
    const { rateLimits } = await $.session.usage()
    if (rateLimits.length === 0) {
      return { text: 'No usage data yet: needs a Claude subscription (Pro/Max) and at least one response in this session.' }
    }
    const now = await $.clock.now()
    return {
      text: pick(rateLimits)
        .map(l => {
          const at = l.resetsAt ? new Date(l.resetsAt).toLocaleString() : 'unknown'
          return `${name(l.kind)}: ${bar(l.percentUsed)} ${l.percentUsed}% used, ${left(l.percentUsed)}% left, resets in ${untilReset(l.resetsAt, now)} (${at})`
        })
        .join('\n'),
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const ls = await read($, limits)
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)

    if (ls.length === 0) {
      return (
        <Box>
          <Text dimColor>{'◌ Usage: waiting for the first response…'}</Text>
        </Box>
      )
    }

    const now = await $.clock.now()
    return (
      <Box>
        {ls.map((l, i) => {
          const w = level(l.percentUsed)
          return (
            <Box key={l.kind}>
              {i > 0 ? <Text dimColor>{'   │   '}</Text> : null}
              <Text color={w.color} bold>{`${w.icon} ${name(l.kind)} `}</Text>
              <Text color={w.color}>{bar(l.percentUsed)}</Text>
              <Text>{` ${l.percentUsed}%`}</Text>
              <Text dimColor>{` · ${left(l.percentUsed)}% left · ⟳ ${untilReset(l.resetsAt, now)}`}</Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
