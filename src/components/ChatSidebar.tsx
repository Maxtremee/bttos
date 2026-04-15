import { For, Show } from 'solid-js'
import type { ChatMessage } from '../types/chat'
import type { EmoteMap } from '../services/EmoteService'
import ChatMessageComponent from './ChatMessage'

interface ChatSidebarProps {
  messages: ChatMessage[]
  emoteMap: EmoteMap
  status: 'connecting' | 'loading-emotes' | 'active' | 'reconnecting'
}

export default function ChatSidebar(props: ChatSidebarProps) {
  return (
    <div style={{
      width: '260px',
      'flex-shrink': 0,
      height: '100vh',
      background: '#000000',
      'border-left': '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      'flex-direction': 'column',
      overflow: 'hidden',
    }}>
      {/* Status bar — only shown when connecting or reconnecting */}
      <Show when={props.status === 'loading-emotes' || props.status === 'reconnecting'}>
        <div style={{
          padding: 'var(--space-lg) var(--space-md) 0',
        }}>
          <Show when={props.status === 'loading-emotes'}>
            <span style={{ 'font-size': 'var(--font-size-label)', color: 'var(--color-text-secondary)' }}>
              Loading chat...
            </span>
          </Show>
          <Show when={props.status === 'reconnecting'}>
            <span style={{ 'font-size': 'var(--font-size-label)', color: 'var(--color-text-secondary)' }}>
              Reconnecting...
            </span>
          </Show>
        </div>
      </Show>

      {/* Message list — column-reverse so newest messages appear at bottom naturally */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        padding: '0 var(--space-md)',
        display: 'flex',
        'flex-direction': 'column-reverse',
      }}>
        <For each={[...props.messages].reverse()}>
          {(msg) => (
            <ChatMessageComponent message={msg} emoteMap={props.emoteMap} />
          )}
        </For>
      </div>
    </div>
  )
}
