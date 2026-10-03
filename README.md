# Josh's Wishlist

A fast, dependency-free wishlist web app laid out as a tier list. Friends and family see what I want most at a glance, filter by budget or project, and mark a gift as bought so nobody buys the same thing twice.

**Live site:** https://testler.github.io/Wish-list/

## Features

- **The home page is the tier list.** Every gift sits in an S / A / B / C row with its price on the thumbnail, so the most-wanted gifts are the first thing anyone sees.
- **Filter in place:** budget (up to $20 / $30 / $50 / $100), project, and search all narrow the same list, with no extra pages to dig through.
- **Shareable views:** filters and the open gift live in the URL, so "everything under $30 in Garden" or a single gift can be sent as a link.
- **Purchase tracking that handles more than one shopper.** Marking a gift as bought takes a confirmation, stamps it "Bought", and removes it from the list. If two people go for the same gift, the second one is told it's already taken, so nobody's purchase is silently lost.
- **Admin dashboard** behind a hidden gesture and password: add or delete gifts and projects, and change the password.
- **Offline fallback:** if the data service can't be reached, the last copy the browser saw is shown, read-only.
- **Built for phones:** large tap targets, a bottom sheet for gift details that the phone's back button closes, visible keyboard focus, and reduced motion respected.
- **Small extras:** retro sound effects when opening a gift, unlocking admin, and marking a gift as bought.

## Tech stack

| Layer | Choice |
|---|---|
| UI | Vanilla HTML, CSS, JavaScript (ES2020+), with no framework and no build step; native `<dialog>` and Popover APIs |
| Type | Rubik Mono One (wordmark, tier letters) and Atkinson Hyperlegible Next (everything else), from Google Fonts |
| Data | [JSONBin.io](https://jsonbin.io), a hosted JSON document used as a small database |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |

## Architecture

The whole app is one static page (`index.html`) plus one script (`app.js`), split into a few layers:

```
JSONBin (one JSON document)
   │  GET /latest           PUT
   ▼                         ▲
normalize()  ──►  state  ──► mutate(fn): re-fetch → apply fn → normalize → write
   │                │
   │                ▼
   │            render() ──► view functions (template strings, every value escaped)
   ▼                ▲
localStorage     one delegated click / submit / keydown listener (data-action="…")
(offline copy)
```

### Design decisions

- **Read-modify-write on every save.** Visitors can keep a tab open for days, so writing the tab's in-memory copy would undo everything changed since it loaded. Instead, `mutate()` fetches the latest document, applies one small change to it, and writes the result back. Writes are queued so a double click can't race itself.
- **Self-healing data.** The JSON is sometimes edited by hand, so everything passes through `normalize()`: unsafe or duplicate IDs are turned into clean slugs, prices like `"$24.99"` become numbers, unknown ranks fall back to a default, and items that point at a missing project get a placeholder project. The repaired data is saved on the next write.
- **Safe rendering.** Views are template strings, and every value from the data store goes through `esc()` before it reaches the DOM. Links and images must use `http(s)` URLs, so a `javascript:` URL in the data can't run. Inline `onclick` handlers are replaced by `data-action` attributes and one event listener.
- **Hashed admin password.** The password is stored as a salted PBKDF2-SHA-256 hash (Web Crypto API), never as plain text.
- **Native browser features over libraries.** The gift sheet is a `<dialog>`, so focus trapping, Escape-to-close, and the backdrop come for free. Toasts use the Popover API so they appear above an open dialog.
- **No build step.** The site is three files and a sounds folder, so it can be opened, read, and deployed as-is.

### Known trade-offs

The JSONBin access key ships to the browser, which is unavoidable for a purely static site. A determined visitor could use it to edit the data directly. For a personal gift list that risk is acceptable, and JSONBin keeps version history for recovery. The upgrade path is a small serverless proxy (for example, a Cloudflare Worker) that holds the key and accepts only narrow operations like "mark item X purchased".

## Data model

The whole wishlist is one JSON document:

```json
{
  "items": [
    {
      "id": "flir-one-gen-3",
      "title": "FLIR ONE Gen 3 - Thermal Imaging Camera",
      "price": 204,
      "project": "home-improvement",
      "rank": "S",
      "vendor": "Amazon",
      "image": "https://…",
      "url": "https://…",
      "purchased": false
    }
  ],
  "projects": [
    {
      "id": "home-improvement",
      "name": "Home Improvement",
      "description": "House upgrades, tools, and lighting.",
      "icon": "🛠️",
      "color": "#EAB308",
      "project-icon-image": "https://… (optional)"
    }
  ],
  "auth": { "salt": "…", "iterations": 100000, "hash": "…" }
}
```

`rank` is one of `S`, `A`, `B`, `C`. Fields the app doesn't recognise are kept as they are.

## Running locally

Any static file server works. Serving over `localhost` is recommended because browsers only allow the Web Crypto API (used for admin login) in secure contexts.

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open http://localhost:8000.

## Deployment

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which:

1. checks `app.js` for syntax errors,
2. checks that every local file the page references (stylesheet, script, sounds) exists,
3. publishes the site files to GitHub Pages.

If either check fails, the live site is left unchanged.

## Project structure

```
├── index.html                  Page shell and the pre-rendered home view
├── app.js                      Data layer, router, views, admin, events
├── style.css                   Design tokens, tier list, sheet, responsive layout
├── sounds/                     Sound effects
└── .github/workflows/deploy.yml
```

## Roadmap

- Edit existing items and projects in the admin dashboard
- "New season" reset for purchased items
- Automated link and price checking
- Optional serverless proxy for writes

## License

MIT
