---
phase: quick-260415-hnx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/screens/PlayerScreen.tsx
  - src/components/ChatSidebar.tsx
  - src/components/ChatMessage.tsx
autonomous: true
requirements: [quick-260415-hnx]
must_haves:
  truths:
    - "Yellow/blue buttons scale chat text and emotes proportionally alongside chat width"
    - "Font size stays readable (min 10px) at narrowest chat width"
    - "At default width (260), font size is 14px and emotes are 22px"
  artifacts:
    - path: "src/components/ChatMessage.tsx"
      provides: "Scale-aware font and emote sizing"
    - path: "src/components/ChatSidebar.tsx"
      provides: "Passes scale prop through to ChatMessage"
    - path: "src/screens/PlayerScreen.tsx"
      provides: "Computes scale and passes to ChatSidebar"
  key_links:
    - from: "src/screens/PlayerScreen.tsx"
      to: "src/components/ChatSidebar.tsx"
      via: "scale prop"
    - from: "src/components/ChatSidebar.tsx"
      to: "src/components/ChatMessage.tsx"
      via: "scale prop"
---

<objective>
Scale chat text size and emote dimensions proportionally with chat width.

Purpose: When the user presses yellow/blue to resize the chat panel, the font and emotes should grow/shrink with it so the chat stays readable and proportional at any width.
Output: `scale` prop threaded from PlayerScreen → ChatSidebar → ChatMessage; ChatMessage uses it for font-size and emote dimensions.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Thread scale prop from PlayerScreen through ChatSidebar to ChatMessage</name>
  <files>src/screens/PlayerScreen.tsx, src/components/ChatSidebar.tsx, src/components/ChatMessage.tsx</files>
  <action>
In PlayerScreen.tsx:
- Compute `const chatScale = () => chatWidth() / 260` (derived signal — no new createSignal needed)
- Pass `scale={chatScale()}` to `<ChatSidebar>` alongside the existing `width={chatWidth()}`

In ChatSidebar.tsx:
- Add `scale?: number` to the Props type (default: 1)
- Pass `scale={props.scale ?? 1}` down to each `<ChatMessageComponent>`

In ChatMessage.tsx:
- Add `scale?: number` to the Props type (default: 1)
- Replace hardcoded `font-size: '14px'` with `font-size: \`${Math.max(10, Math.round(14 * (props.scale ?? 1)))}px\``
- Replace hardcoded `line-height: '1.4'` — keep it as-is (unitless ratio, scales naturally)
- Replace hardcoded `width="22" height="22"` on both emote `<img>` elements with computed values: `width={Math.round(22 * (props.scale ?? 1))} height={Math.round(22 * (props.scale ?? 1))}`
  - This applies to both the text-fragment emote path (lines ~22-23) and the native emote path (lines ~67-68)
- The minimum font-size clamp (10px) prevents text from becoming unreadable at min chat width (140px → scale ≈ 0.54 → raw 7.5px → clamped to 10px)
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>Build passes with no TypeScript errors. At default width (260) scale=1 produces 14px font and 22px emotes. At width=140 scale≈0.54 produces 10px font (clamped) and 14px emotes. At width=500 scale≈1.92 produces 27px font and 42px emotes.</done>
</task>

</tasks>

<verification>
- `npm run build` exits 0 with no type errors
- PlayerScreen passes both `width` and `scale` to ChatSidebar
- ChatSidebar passes `scale` to ChatMessageComponent
- ChatMessage uses clamped scaled font-size and scaled emote dimensions (no hardcoded 14px or 22px remaining)
</verification>

<success_criteria>
Pressing yellow/blue to resize the chat panel proportionally resizes both the text and emote images alongside the panel width. Font-size never drops below 10px.
</success_criteria>

<output>
After completion, create `.planning/quick/260415-hnx-scale-chat-text-size-with-yellow-blue-bu/260415-hnx-SUMMARY.md`
</output>
