import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reading } from '../types'

const history = atom({ plugin: 'token-weather', key: 'history' } as const, [] as Reading[])

const BARS = '▁▂▃▄▅▆▇█'

function weather(p: number): { icon: string; word: string; color: string } {
  if (p < 25) return { icon: '☀', word: 'Clear', color: 'yellow' }
  if (p < 50) return { icon: '☁', word: 'Cloudy', color: 'cyan' }
  if (p < 75) return { icon: '☂', word: 'Showers', color: 'blue' }
  if (p < 90) return { icon: '☇', word: 'Storm', color: 'magenta' }
  return { icon: '↯', word: 'Compact soon', color: 'red' }
}

function k(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`
  return String(n)
}

function spark(rs: Reading[]): string {
  return rs
    .map(r => BARS[Math.min(7, Math.floor((r.percent / 100) * 8))])
    .join('')
}

async function sample($: EngineInterface) {
  const { context } = await $.session.usage()
  if (context.tokens === undefined) return
  const r: Reading = {
    tokens: context.tokens,
    window: context.window,
    percent: context.percent ?? Math.round((context.tokens / context.window) * 100),
  }
  await update($, history, (prev: Reading[]) => [...prev, r].slice(-12))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await sample($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await sample($)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const hist = await read($, history)
    if (e.props.hasSurvey || hist.length === 0) return next(e)

    const now = hist[hist.length - 1]
    if (now === undefined) return next(e)
    const prev = hist.length > 1 ? hist[hist.length - 2] : undefined
    const w = weather(now.percent)
    const delta = prev ? now.tokens - prev.tokens : undefined
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color={w.color} bold>{`${w.icon} ${w.word}`}</Text>
        <Text>{`  ${now.percent}%  ${k(now.tokens)} / ${k(now.window)}  `}</Text>
        <Text color={w.color}>{spark(hist)}</Text>
        {delta !== undefined ? (
          <Text dimColor>{`  ${delta >= 0 ? '▲ +' : '▼ -'}${k(Math.abs(delta))} last turn`}</Text>
        ) : null}
      </Box>
    )
  })
}
