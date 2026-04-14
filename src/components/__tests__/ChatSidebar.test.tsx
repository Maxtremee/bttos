// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { render } from 'solid-js/web'
import ChatSidebar from '../ChatSidebar'
import ChatMessage from '../ChatMessage'
import type { ChatMessage as ChatMessageType } from '../../types/chat'
import type { EmoteMap } from '../../services/EmoteService'

// Cleanup container after each test
let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

function makeMessage(overrides: Partial<ChatMessageType> = {}): ChatMessageType {
  return {
    id: 'msg-' + Math.random(),
    displayName: 'TestUser',
    color: '#ff0000',
    fragments: [{ type: 'text', text: 'hello' }],
    ...overrides,
  }
}

describe('ChatSidebar', () => {
  it('Test 1: Messages render as a list', () => {
    const msgs: ChatMessageType[] = [
      makeMessage({ id: '1', displayName: 'Alice', fragments: [{ type: 'text', text: 'hello' }] }),
      makeMessage({ id: '2', displayName: 'Bob', fragments: [{ type: 'text', text: 'world' }] }),
      makeMessage({ id: '3', displayName: 'Charlie', fragments: [{ type: 'text', text: 'foo' }] }),
    ]
    const container = document.createElement('div')
    document.body.appendChild(container)
    dispose = render(() => <ChatSidebar messages={msgs} emoteMap={new Map()} status="active" />, container)
    const text = container.textContent ?? ''
    expect(text).toContain('Alice')
    expect(text).toContain('Bob')
    expect(text).toContain('Charlie')
  })

  it('Test 4: Status loading-emotes shows Loading chat...', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    dispose = render(() => <ChatSidebar messages={[]} emoteMap={new Map()} status="loading-emotes" />, container)
    expect(container.textContent).toContain('Loading chat...')
  })

  it('Test 5: Status reconnecting shows Reconnecting...', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    dispose = render(() => <ChatSidebar messages={[]} emoteMap={new Map()} status="reconnecting" />, container)
    expect(container.textContent).toContain('Reconnecting...')
  })

  it('Test 6: Status active does NOT show status text', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    dispose = render(() => <ChatSidebar messages={[]} emoteMap={new Map()} status="active" />, container)
    const text = container.textContent ?? ''
    expect(text).not.toContain('Loading chat...')
    expect(text).not.toContain('Reconnecting...')
  })
})

describe('ChatMessage', () => {
  it('Test 2: Emote-type fragments render as img', () => {
    const msg: ChatMessageType = {
      id: 'e1',
      displayName: 'Streamer',
      color: '#ff0000',
      fragments: [{
        type: 'emote',
        text: 'Kappa',
        emote: { id: '25', emote_set_id: '0', owner_id: '0', format: ['static'] },
      }],
    }
    const container = document.createElement('div')
    document.body.appendChild(container)
    dispose = render(() => <ChatMessage message={msg} emoteMap={new Map()} />, container)
    const img = container.querySelector('img[alt="Kappa"]') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img?.src).toContain('static-cdn.jtvnw.net/emoticons/v2/25')
  })

  it('Test 3: Text fragments check emoteMap for third-party emotes', () => {
    const msg: ChatMessageType = {
      id: 'e2',
      displayName: 'Viewer',
      color: '#00ff00',
      fragments: [{ type: 'text', text: 'hello PogChamp world' }],
    }
    const emoteMap: EmoteMap = new Map([['PogChamp', 'https://cdn.example.com/pogchamp.png']])
    const container = document.createElement('div')
    document.body.appendChild(container)
    dispose = render(() => <ChatMessage message={msg} emoteMap={emoteMap} />, container)
    const img = container.querySelector('img[alt="PogChamp"]') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img?.src).toContain('cdn.example.com/pogchamp.png')
    const text = container.textContent ?? ''
    expect(text).toContain('hello')
    expect(text).toContain('world')
  })
})
