---
phase: quick-260415-hjo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/screens/PlayerScreen.tsx
  - src/components/ChatSidebar.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Yellow button decreases chat width, min 140px"
    - "Blue button increases chat width, max 500px"
    - "Chat sidebar renders at the dynamic width"
    - "Toggle hint reflects yellow and blue button actions"
  artifacts:
    - path: "src/screens/PlayerScreen.tsx"
      provides: "chatWidth signal, yellow/blue key handlers"
    - path: "src/components/ChatSidebar.tsx"
      provides: "width prop replacing hardcoded 260px"
  key_links:
    - from: "src/screens/PlayerScreen.tsx"
      to: "src/components/ChatSidebar.tsx"
      via: "width prop"
      pattern: "chatWidth\\(\\)"
---

<objective>
Add yellow (405) and blue (406) color button handlers to scale the chat sidebar width up and down dynamically.

Purpose: Gives users remote-controllable chat sizing without a keyboard.
Output: chatWidth signal in PlayerScreen, width prop in ChatSidebar, updated hint text.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/screens/PlayerScreen.tsx
@src/components/ChatSidebar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add chatWidth signal and yellow/blue key handlers to PlayerScreen</name>
  <files>src/screens/PlayerScreen.tsx</files>
  <action>
1. Import `createSignal` is already imported — no change needed there.

2. Add a `chatWidth` signal near the other signals (around line 60 where `chatVisible` is declared):
   ```ts
   const [chatWidth, setChatWidth] = createSignal(260)
   ```

3. In `handleKeyDown` (line 244), extend the if/else chain to handle keyCodes 405 and 406:
   ```ts
   function handleKeyDown(e: KeyboardEvent) {
     if (e.keyCode === 403) {
       setChatVisible(v => !v)
       setToggleHintVisible(true)
       clearTimeout(toggleHintTimer)
       toggleHintTimer = setTimeout(() => setToggleHintVisible(false), 3000)
     } else if (e.keyCode === 405) {
       // Yellow — shrink chat
       setChatWidth(w => Math.max(140, w - 60))
       setToggleHintVisible(true)
       clearTimeout(toggleHintTimer)
       toggleHintTimer = setTimeout(() => setToggleHintVisible(false), 3000)
     } else if (e.keyCode === 406) {
       // Blue — grow chat
       setChatWidth(w => Math.min(500, w + 60))
       setToggleHintVisible(true)
       clearTimeout(toggleHintTimer)
       toggleHintTimer = setTimeout(() => setToggleHintVisible(false), 3000)
     }
     showInfoBar()
   }
   ```

4. Pass `width` prop to ChatSidebar (around line 474):
   ```tsx
   <ChatSidebar
     messages={messages}
     emoteMap={emoteMap()}
     status={chatStatus()}
     width={chatWidth()}
   />
   ```

5. Update the toggle hint text (line 467) from:
   ```
   Red — toggle chat
   ```
   to:
   ```
   Red — toggle chat  |  Yellow — smaller  |  Blue — larger
   ```
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>PlayerScreen compiles with no TypeScript errors; chatWidth signal exists; keyCodes 405 and 406 are handled; ChatSidebar receives width prop; hint text updated.</done>
</task>

<task type="auto">
  <name>Task 2: Accept width prop in ChatSidebar and remove hardcoded 260px</name>
  <files>src/components/ChatSidebar.tsx</files>
  <action>
1. Read the existing ChatSidebar props type. It currently has `messages`, `emoteMap`, `status`. Add `width?: number` (optional with default of 260 so it stays backwards-compatible).

2. Replace the hardcoded `width: '260px'` on the outer div (line 15) with:
   ```tsx
   width: `${props.width ?? 260}px`
   ```

3. Do not change any other styling or logic in the file.
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>ChatSidebar compiles cleanly; outer div width is driven by props.width; no hardcoded 260px remains on the outer div.</done>
</task>

</tasks>

<verification>
After both tasks:
1. `npx tsc --noEmit` passes with no errors.
2. On-device or in simulator: press yellow remote button repeatedly — chat panel narrows by 60px each press, stops at 140px. Press blue — chat widens by 60px each press, stops at 500px. Red still toggles visibility. Hint overlay shows all three button labels.
</verification>

<success_criteria>
- Yellow (405) decreases chat width by 60px per press, floor 140px
- Blue (406) increases chat width by 60px per press, ceiling 500px
- ChatSidebar outer div width reflects the signal value at runtime
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/260415-hjo-make-the-yellow-button-scale-the-chat-do/260415-hjo-SUMMARY.md`
</output>
