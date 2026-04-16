import { createSignal, onCleanup } from 'solid-js'
import Hls from 'hls.js'
import { twitchStreamService } from '../services/TwitchStreamService'
import type { PlayerErrorKind } from '../components/organisms/PlayerErrorOverlay'

export type HlsPlayerState = 'loading' | 'playing' | 'error'

interface UseHlsPlayerOptions {
  /** Called once after the first MANIFEST_PARSED when playback actually starts. */
  onPlaying?: () => void
}

/**
 * Determine errorKind from a caught error.
 * - TypeError (network failure) or message containing "fetch" -> 'network'
 * - Message containing "offline" -> 'offline'
 * - Otherwise -> 'unknown'
 */
function classifyError(err: unknown): PlayerErrorKind {
  if (err instanceof TypeError) return 'network'
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('offline')) return 'offline'
    if (msg.includes('fetch') || msg.includes('network')) return 'network'
  }
  return 'unknown'
}

/**
 * HLS player composable — owns the hls.js lifecycle, error classification,
 * and network-retry backoff for a given channel. Attach the returned
 * `attachVideo` to a <video> ref; invoke `retry()` to re-initialize.
 */
export function useHlsPlayer(channel: string, opts: UseHlsPlayerOptions = {}) {
  const [state, setState] = createSignal<HlsPlayerState>('loading')
  const [errorKind, setErrorKind] = createSignal<PlayerErrorKind>('unknown')

  let videoEl: HTMLVideoElement | undefined
  let hls: Hls | undefined
  let retryCount = 0

  async function init() {
    if (!videoEl) return
    setState('loading')
    retryCount = 0

    try {
      const m3u8Url = await twitchStreamService.fetchStreamM3u8Url(channel)

      if (!Hls.isSupported()) {
        setErrorKind('unknown')
        setState('error')
        return
      }

      hls = new Hls({
        maxBufferLength: 30,
        maxBufferSize: 30_000_000,
        backBufferLength: 0,
        liveSyncDurationCount: 3,
      })

      hls.attachMedia(videoEl)
      hls.loadSource(m3u8Url)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl?.play().catch(() => {})
        setState('playing')
        opts.onPlaying?.()
      })

      hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string; details?: string }) => {
        if (!data.fatal) return

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCount < 3) {
          retryCount++
          setTimeout(() => hls?.startLoad(), 2000 * Math.pow(2, retryCount - 1))
          return
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError()
          return
        }

        // Fatal unrecoverable error
        hls?.destroy()
        hls = undefined

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setErrorKind(
            data.details && data.details.includes('manifestLoadError') ? 'offline' : 'network'
          )
        } else {
          setErrorKind('unknown')
        }
        setState('error')
      })
    } catch (err) {
      setErrorKind(classifyError(err))
      setState('error')
    }
  }

  function attachVideo(el: HTMLVideoElement) {
    videoEl = el
    init()
  }

  function retry() {
    hls?.destroy()
    hls = undefined
    init()
  }

  onCleanup(() => {
    hls?.destroy()
  })

  return { state, errorKind, attachVideo, retry }
}
