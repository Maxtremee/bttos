---
phase: quick
plan: 260415-fjn
type: execute
wave: 1
depends_on: []
files_modified:
  - public/largeIcon.png
  - public/webOSTVjs-1.2.13/webOSTV.js
  - public/webOSTVjs-1.2.13/webOSTV-dev.js
  - index.html
autonomous: true
must_haves:
  truths:
    - "webOSTV.js library files exist in public/ for runtime use"
    - "largeIcon.png exists for webOS app manifest"
    - "Existing appinfo.json and icon.png are preserved unchanged"
    - "index.html includes webOSTV.js script tag"
  artifacts:
    - path: "public/webOSTVjs-1.2.13/webOSTV.js"
      provides: "webOS TV JS bridge library"
    - path: "public/largeIcon.png"
      provides: "Large icon for webOS launcher"
  key_links:
    - from: "index.html"
      to: "public/webOSTVjs-1.2.13/webOSTV.js"
      via: "script tag"
      pattern: "webOSTV\\.js"
---

<objective>
Scaffold webOS SDK template files into the existing SolidJS+Vite project to obtain the webOSTVjs library and largeIcon.png without disturbing existing project files.

Purpose: The project needs webOSTV.js (the webOS platform bridge library) and a largeIcon.png that ares-generate provides. These are missing from the hand-built project structure.
Output: webOSTVjs library directory in public/, largeIcon.png in public/, script tag in index.html
</objective>

<context>
@CLAUDE.md
@public/appinfo.json
@index.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Generate webOS template to temp dir and copy missing assets</name>
  <files>public/largeIcon.png, public/webOSTVjs-1.2.13/webOSTV.js, public/webOSTVjs-1.2.13/webOSTV-dev.js</files>
  <action>
1. Create a temp directory (e.g., /tmp/webos-scaffold-temp)
2. Run: `/Users/maksymilianzadka/.nvm/versions/node/v24.14.1/bin/ares-generate -t basic -p "id=com.dev.twitchalt" -p "version=0.1.0" -p "title=Twitch Alt" /tmp/webos-scaffold-temp`
3. Copy ONLY the missing files into the project's public/ directory:
   - `cp /tmp/webos-scaffold-temp/largeIcon.png public/largeIcon.png`
   - `cp -r /tmp/webos-scaffold-temp/webOSTVjs-1.2.13/ public/webOSTVjs-1.2.13/`
4. Verify existing files are untouched: `public/appinfo.json` and `public/icon.png` must not be modified (check git diff)
5. Clean up: `rm -rf /tmp/webos-scaffold-temp`

Do NOT overwrite the project's index.html, appinfo.json, or icon.png with the template versions.
  </action>
  <verify>
    <automated>test -f public/largeIcon.png && test -f public/webOSTVjs-1.2.13/webOSTV.js && test -f public/webOSTVjs-1.2.13/webOSTV-dev.js && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>webOSTVjs library files and largeIcon.png exist in public/. Existing appinfo.json and icon.png unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Add webOSTV.js script tag to index.html</name>
  <files>index.html</files>
  <action>
Read index.html. Add a script tag for webOSTV.js BEFORE the SolidJS app script (the Vite module script). Place it in the head or at the top of body:

```html
<script src="webOSTVjs-1.2.13/webOSTV.js"></script>
```

The path should be relative to the served root (Vite serves from public/ as static assets, so files in public/ are served at root). The webOSTVjs directory in public/ will be available at `/webOSTVjs-1.2.13/webOSTV.js` at runtime.

Do NOT include webOSTV-dev.js — that's for debug logging only and should not be in the production entry point.
  </action>
  <verify>
    <automated>grep -q "webOSTV.js" index.html && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>index.html contains a script tag loading webOSTV.js before the app module script.</done>
</task>

</tasks>

<verification>
- `public/webOSTVjs-1.2.13/webOSTV.js` exists
- `public/webOSTVjs-1.2.13/webOSTV-dev.js` exists
- `public/largeIcon.png` exists
- `public/appinfo.json` is unchanged from before
- `public/icon.png` is unchanged from before
- `index.html` has a `<script>` tag referencing webOSTV.js
- `npm run build` still succeeds
</verification>

<success_criteria>
The webOS SDK template assets (webOSTVjs library, largeIcon) are integrated into the existing project without disrupting the SolidJS+Vite setup. The app can reference webOS platform APIs via the globally loaded webOSTV.js at runtime.
</success_criteria>

<output>
After completion, create `.planning/quick/260415-fjn-use-ares-generate-to-scaffold-the-webos-/260415-fjn-SUMMARY.md`
</output>
