// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.stubEnv("VITE_TWITCH_CLIENT_ID", "test_client_id");

// ---------- WebSocket Mock ----------

interface MockWebSocket {
  url: string;
  readyState: number;
  onmessage: ((event: MessageEvent) => void) | null;
  onopen: (() => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  mockSend: (data: unknown) => void;
  mockClose: (code?: number, reason?: string) => void;
}

const mockWebSocketInstances: MockWebSocket[] = [];

class MockWebSocketClass {
  url: string;
  readyState = 1; // OPEN
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn().mockImplementation((code?: number) => {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ code: code ?? 1000, reason: "", wasClean: code === 1000 } as CloseEvent);
    }
  });

  constructor(url: string) {
    this.url = url;
    mockWebSocketInstances.push(this as unknown as MockWebSocket);
    // Simulate async open
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  mockSend(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  mockClose(code = 1006, reason = "") {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: code === 1000 } as CloseEvent);
    }
  }
}

// ---------- Helpers ----------

function getLatestWs(): MockWebSocket {
  return mockWebSocketInstances[mockWebSocketInstances.length - 1];
}

function makeSessionWelcome(sessionId = "test-session-id", keepaliveSecs = 10) {
  return {
    metadata: { message_type: "session_welcome" },
    payload: {
      session: {
        id: sessionId,
        status: "connected",
        keepalive_timeout_seconds: keepaliveSecs,
        reconnect_url: null,
      },
    },
  };
}

function makeNotification(eventData: Record<string, unknown>) {
  return {
    metadata: {
      message_type: "notification",
      subscription_type: "channel.chat.message",
    },
    payload: {
      subscription: { type: "channel.chat.message" },
      event: eventData,
    },
  };
}

function makeReconnectMessage(reconnectUrl: string) {
  return {
    metadata: { message_type: "session_reconnect" },
    payload: {
      session: {
        id: "new-session-id",
        reconnect_url: reconnectUrl,
      },
    },
  };
}

// ---------- Tests ----------

describe("TwitchChatService", () => {
  let service: import("../TwitchChatService").TwitchChatService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    mockWebSocketInstances.length = 0;

    // Install mock WebSocket globally
    (globalThis as unknown as Record<string, unknown>).WebSocket = MockWebSocketClass;

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    globalThis.fetch = mockFetch;

    const mod = await import("../TwitchChatService");
    service = new mod.TwitchChatService();
  });

  afterEach(() => {
    vi.useRealTimers();
    service.disconnect();
  });

  // Test 1
  it("connect() opens WebSocket to wss://eventsub.wss.twitch.tv/ws", () => {
    service.connect("broadcaster123", "user456", "token789");

    expect(mockWebSocketInstances.length).toBe(1);
    expect(mockWebSocketInstances[0].url).toBe("wss://eventsub.wss.twitch.tv/ws");
  });

  // Test 2
  it("on session_welcome, calls subscribe POST to helix/eventsub/subscriptions", async () => {
    service.connect("broadcaster123", "user456", "token789");

    const ws = getLatestWs();
    ws.mockSend(makeSessionWelcome("session-abc"));

    // Flush microtasks (async subscribe) without triggering keepalive interval
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("helix/eventsub/subscriptions");
    expect(options.method).toBe("POST");
    expect(options.headers["Authorization"]).toBe("Bearer token789");
    expect(options.headers["Client-Id"]).toBe("test_client_id");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.type).toBe("channel.chat.message");
    expect(body.version).toBe("1");
    expect(body.condition.broadcaster_user_id).toBe("broadcaster123");
    expect(body.condition.user_id).toBe("user456");
    expect(body.transport.method).toBe("websocket");
    expect(body.transport.session_id).toBe("session-abc");
  });

  // Test 3
  it("on notification, calls onMessage with parsed ChatMessage", () => {
    const onMessage = vi.fn();
    service.onMessage = onMessage;

    service.connect("broadcaster123", "user456", "token789");

    const ws = getLatestWs();
    ws.mockSend(makeSessionWelcome());
    ws.mockSend(
      makeNotification({
        broadcaster_user_id: "broadcaster123",
        chatter_user_id: "chatter001",
        chatter_user_name: "TestChatter",
        message_id: "msg-id-001",
        message: {
          text: "Hello world",
          fragments: [{ type: "text", text: "Hello world" }],
        },
        color: "#FF0000",
      }),
    );

    expect(onMessage).toHaveBeenCalledOnce();
    const chatMsg = onMessage.mock.calls[0][0];
    expect(chatMsg.id).toBe("msg-id-001");
    expect(chatMsg.displayName).toBe("TestChatter");
    expect(chatMsg.color).toBe("#FF0000");
    expect(chatMsg.fragments).toEqual([{ type: "text", text: "Hello world" }]);
  });

  // Test 4
  it("on session_reconnect, opens new WebSocket to reconnect_url, closes old after new connects", async () => {
    service.connect("broadcaster123", "user456", "token789");
    expect(mockWebSocketInstances.length).toBe(1);

    const oldWs = getLatestWs();
    oldWs.mockSend(
      makeReconnectMessage("wss://eventsub-reconnect.wss.twitch.tv/ws?reconnect_token=abc"),
    );

    // New WebSocket should be created
    expect(mockWebSocketInstances.length).toBe(2);
    const newWs = getLatestWs();
    expect(newWs.url).toBe("wss://eventsub-reconnect.wss.twitch.tv/ws?reconnect_token=abc");

    // Simulate new WS open (triggers old close)
    await vi.runAllTimersAsync();

    // Old WS should have been closed
    expect(oldWs.close).toHaveBeenCalled();
  });

  // Test 5
  it("disconnect() closes WebSocket with code 1000", () => {
    service.connect("broadcaster123", "user456", "token789");
    const ws = getLatestWs();

    service.disconnect();

    expect(ws.close).toHaveBeenCalledWith(1000);
  });

  // Test 6
  it("on subscribe 403 response, calls onScopeError callback", async () => {
    const onScopeError = vi.fn();
    service.onScopeError = onScopeError;

    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ message: "missing scope" }),
    });

    service.connect("broadcaster123", "user456", "token789");

    const ws = getLatestWs();
    ws.mockSend(makeSessionWelcome());

    // Flush microtasks for async subscribe without advancing timers.
    // The client abstraction adds additional await boundaries.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onScopeError).toHaveBeenCalledOnce();
  });

  // Test 7
  it("on WebSocket close with non-1000 code, schedules reconnect with exponential backoff", async () => {
    service.connect("broadcaster123", "user456", "token789");
    const ws = getLatestWs();
    ws.mockSend(makeSessionWelcome());

    const initialWsCount = mockWebSocketInstances.length;

    // Simulate abnormal close (e.g. network loss)
    ws.mockClose(1006, "Connection dropped");

    // First reconnect attempt after 1s
    await vi.advanceTimersByTimeAsync(1100);
    expect(mockWebSocketInstances.length).toBe(initialWsCount + 1);

    // Simulate second abnormal close
    const ws2 = getLatestWs();
    ws2.mockClose(1006);

    // Second reconnect after 2s
    await vi.advanceTimersByTimeAsync(2100);
    expect(mockWebSocketInstances.length).toBe(initialWsCount + 2);

    // Third close
    const ws3 = getLatestWs();
    ws3.mockClose(1006);

    // Third reconnect after 4s
    await vi.advanceTimersByTimeAsync(4100);
    expect(mockWebSocketInstances.length).toBe(initialWsCount + 3);
  });

  // Test 8
  it("keepalive timeout detection triggers reconnect when no messages received", async () => {
    service.connect("broadcaster123", "user456", "token789");
    const ws = getLatestWs();
    ws.mockSend(makeSessionWelcome("sid", 10)); // 10s keepalive

    const initialWsCount = mockWebSocketInstances.length;

    // Advance time past keepalive_timeout * 1.5 = 15s without any messages
    // The check interval is 30s, but let's advance to 31s
    await vi.advanceTimersByTimeAsync(31_000);

    // Should have triggered a reconnect (close + new WS)
    expect(mockWebSocketInstances.length).toBeGreaterThan(initialWsCount);
  });
});
