import { For } from 'solid-js'
import type { ChatMessage, MessageFragment } from '../types/chat'
import type { EmoteMap } from '../services/EmoteService'

interface ChatMessageProps {
  message: ChatMessage
  emoteMap: EmoteMap
  scale?: number
}

function renderTextFragment(frag: MessageFragment, emoteMap: EmoteMap, emoteSizePx: number) {
  const tokens = frag.text.split(' ')
  const elements: unknown[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const emoteUrl = emoteMap.get(token)
    if (emoteUrl) {
      if (i > 0) elements.push(' ')
      elements.push(
        <img
          src={emoteUrl}
          width={emoteSizePx}
          height={emoteSizePx}
          alt={token}
          style="vertical-align: middle; display: inline-block"
        />
      )
    } else {
      if (i > 0) elements.push(' ')
      elements.push(<span>{token}</span>)
    }
  }

  return elements
}

export default function ChatMessage(props: ChatMessageProps) {
  const scale = () => props.scale ?? 1
  const fontSizePx = () => Math.max(10, Math.round(14 * scale()))
  const emoteSizePx = () => Math.round(22 * scale())

  const usernameColor = () => {
    const c = props.message.color
    if (!c || c === '#000000') return 'var(--color-text-secondary)'
    return c
  }

  return (
    <div style={{
      'padding-block': '2px',
      'font-size': `${fontSizePx()}px`,
      'line-height': '1.4',
      'word-break': 'break-word',
    }}>
      <span style={{
        'font-weight': 'var(--font-weight-semibold)',
        color: usernameColor(),
      }}>
        {props.message.displayName}:{' '}
      </span>
      <span style={{
        'font-weight': 'var(--font-weight-regular)',
        color: 'var(--color-text-primary)',
      }}>
        <For each={props.message.fragments}>
          {(frag) => {
            if (frag.type === 'emote' && frag.emote) {
              return (
                <img
                  src={`https://static-cdn.jtvnw.net/emoticons/v2/${frag.emote.id}/static/dark/2.0`}
                  width={emoteSizePx()}
                  height={emoteSizePx()}
                  alt={frag.text}
                  style="vertical-align: middle; display: inline-block"
                />
              )
            }
            if (frag.type === 'text') {
              return <>{renderTextFragment(frag, props.emoteMap, emoteSizePx())}</>
            }
            // cheermote or unknown — render as plain text
            return <span>{frag.text}</span>
          }}
        </For>
      </span>
    </div>
  )
}
