# Android Developer Portal

Interactive prototype exported from MockFlow as standalone HTML.

## Run it

Open `index.html` in any browser. No build step, no server, no account needed.
To host it, upload the file(s) to any static host (Netlify, GitHub Pages, S3, ...).

## How it works

- Each screen is a `<section data-screen="id">`; the entry screen has `data-screen-start`.
- Any element with `data-nav="targetScreenId"` navigates to that screen; `data-nav="back"` goes back.
- A small inline `<script>` at the end of the file handles screen switching and history.
- Icons and images load from their hosted URLs, so keep an internet connection for those assets.

## Files

- `index.html`

_MockFlow editor code (the AI bridge and internal element ids) has been stripped so this is clean, portable HTML you can hand to a developer._
