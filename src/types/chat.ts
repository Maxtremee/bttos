export interface MessageFragment {
  type: 'text' | 'emote' | 'cheermote'
  text: string
  emote?: {
    id: string
    emote_set_id: string
    owner_id: string
    format: string[]
  }
  cheermote?: unknown
}

export interface ChatMessageEvent {
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  chatter_user_id: string
  chatter_user_login: string
  chatter_user_name: string
  message_id: string
  message: {
    text: string
    fragments: MessageFragment[]
  }
  color: string
  // Additional fields exist but are not used
}

export interface ChatMessage {
  id: string
  displayName: string
  color: string
  fragments: MessageFragment[]
}
