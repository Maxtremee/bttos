import { For, Show } from 'solid-js'
import type { ChatMessage } from '../types/chat'
import type { EmoteMap } from '../services/EmoteService'
import ChatMessageComponent from './ChatMessage'
import styles from './ChatSidebar.module.css'

interface ChatSidebarProps {
  messages: ChatMessage[]
  emoteMap: EmoteMap
  status: 'connecting' | 'loading-emotes' | 'active' | 'reconnecting'
  width?: number
  scale?: number
  position?: 'left' | 'right'
}

export default function ChatSidebar(props: ChatSidebarProps) {
  return (
    <div
      class={`${styles.sidebar} ${props.position === 'left' ? styles.borderRight : styles.borderLeft}`}
      style={{ width: `${props.width ?? 260}px` }}
    >
      {/* Status bar — only shown when connecting or reconnecting */}
      <Show when={props.status === 'loading-emotes' || props.status === 'reconnecting'}>
        <div class={styles.statusBar}>
          <Show when={props.status === 'loading-emotes'}>
            <span class={styles.statusText}>
              Loading chat...
            </span>
          </Show>
          <Show when={props.status === 'reconnecting'}>
            <span class={styles.statusText}>
              Reconnecting...
            </span>
          </Show>
        </div>
      </Show>

      {/* Message list — column-reverse so newest messages appear at bottom naturally */}
      <div class={styles.messageList}>
        <For each={[...props.messages].reverse()}>
          {(msg) => (
            <ChatMessageComponent message={msg} emoteMap={props.emoteMap} scale={props.scale ?? 1} />
          )}
        </For>
      </div>
    </div>
  )
}
