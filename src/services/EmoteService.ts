export type EmoteMap = Map<string, string> // emote code -> image URL

interface BttvEmote {
  id: string
  code: string
}

interface SevenTvEmote {
  name: string
  data: {
    host: {
      url: string
    }
  }
}

interface FfzEmoticon {
  id: number
  name: string
}

interface FfzSet {
  emoticons: FfzEmoticon[]
}

export class EmoteService {
  private cache = new Map<string, EmoteMap>()

  async getEmoteMap(broadcasterId: string): Promise<EmoteMap> {
    const cached = this.cache.get(broadcasterId)
    if (cached) return cached
    const map = await this.buildEmoteMap(broadcasterId)
    this.cache.set(broadcasterId, map)
    return map
  }

  async buildEmoteMap(broadcasterId: string): Promise<EmoteMap> {
    const map: EmoteMap = new Map()
    // Fetch all providers in parallel, each wrapped in try/catch
    await Promise.all([
      this.fetchBttvGlobal(map),
      this.fetchBttvChannel(map, broadcasterId),
      this.fetchSevenTvGlobal(map),
      this.fetchSevenTvChannel(map, broadcasterId),
      this.fetchFfzGlobal(map),
      this.fetchFfzChannel(map, broadcasterId),
    ])
    return map
  }

  private async fetchBttvGlobal(map: EmoteMap): Promise<void> {
    try {
      const res = await fetch('https://api.betterttv.net/3/cached/emotes/global')
      if (!res.ok) return
      const emotes = await res.json() as BttvEmote[]
      for (const e of emotes) {
        map.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`)
      }
    } catch (err) {
      console.warn('[EmoteService] BTTV global fetch failed:', err)
    }
  }

  private async fetchBttvChannel(map: EmoteMap, broadcasterId: string): Promise<void> {
    try {
      const res = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`)
      if (!res.ok) return
      const data = await res.json() as { channelEmotes: BttvEmote[]; sharedEmotes: BttvEmote[] }
      for (const e of [...(data.channelEmotes ?? []), ...(data.sharedEmotes ?? [])]) {
        map.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`)
      }
    } catch (err) {
      console.warn('[EmoteService] BTTV channel fetch failed:', err)
    }
  }

  private async fetchSevenTvGlobal(map: EmoteMap): Promise<void> {
    try {
      const res = await fetch('https://7tv.io/v3/emote-sets/global')
      if (!res.ok) return
      const data = await res.json() as { emotes: SevenTvEmote[] }
      for (const e of data.emotes ?? []) {
        // Always use .webp — never AVIF (Chromium 68 compatibility)
        map.set(e.name, `https:${e.data.host.url}/2x.webp`)
      }
    } catch (err) {
      console.warn('[EmoteService] 7TV global fetch failed:', err)
    }
  }

  private async fetchSevenTvChannel(map: EmoteMap, broadcasterId: string): Promise<void> {
    try {
      const res = await fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`)
      if (!res.ok) return
      const data = await res.json() as { emote_set: { emotes: SevenTvEmote[] } }
      for (const e of data.emote_set?.emotes ?? []) {
        map.set(e.name, `https:${e.data.host.url}/2x.webp`)
      }
    } catch (err) {
      console.warn('[EmoteService] 7TV channel fetch failed:', err)
    }
  }

  private async fetchFfzGlobal(map: EmoteMap): Promise<void> {
    try {
      const res = await fetch('https://api.frankerfacez.com/v1/set/global')
      if (!res.ok) return
      const data = await res.json() as { default_sets: number[]; sets: Record<string, FfzSet> }
      for (const setId of data.default_sets ?? []) {
        const set = data.sets[String(setId)]
        if (!set) continue
        for (const e of set.emoticons ?? []) {
          map.set(e.name, `https://cdn.frankerfacez.com/emote/${e.id}/2`)
        }
      }
    } catch (err) {
      console.warn('[EmoteService] FFZ global fetch failed:', err)
    }
  }

  private async fetchFfzChannel(map: EmoteMap, broadcasterId: string): Promise<void> {
    try {
      const res = await fetch(`https://api.frankerfacez.com/v1/room/id/${broadcasterId}`)
      if (!res.ok) return
      const data = await res.json() as { sets: Record<string, FfzSet> }
      for (const set of Object.values(data.sets ?? {})) {
        for (const e of set.emoticons ?? []) {
          map.set(e.name, `https://cdn.frankerfacez.com/emote/${e.id}/2`)
        }
      }
    } catch (err) {
      console.warn('[EmoteService] FFZ channel fetch failed:', err)
    }
  }
}

export const emoteService = new EmoteService()
