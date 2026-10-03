# Josh's Wishlist

A fast, dependency-free wishlist web app. Friends and family can browse gift ideas by price, priority, or project, and mark an item as purchased so nobody buys the same gift twice.

**Live site:** https://testler.github.io/Wish-list/

## Features

- **Browse several ways:** under $20, $20–30, by priority tier (S / A / B / C), or by project (Garden, 3D Printing, Home Improvement, …).
- **Search** across every item from any page.
- **Purchase tracking that handles more than one shopper.** Purchased items are greyed out and moved to the bottom. If two people go for the same gift, the second one is told it's already taken, so nobody's purchase is silently lost.
- **Admin dashboard** behind a hidden gesture and password: add or delete items and projects, and change the password.
- **Offline fallback:** if the data service can't be reached, the last copy the browser saw is shown, read-only.
- **Mobile first:** a hamburger menu on phones, responsive grids on tablet and desktop, and cards you can open with the keyboard.
- **Small extras:** retro sound effects on navigation, admin unlock, and purchase.

## Tech stack

| Layer | Choice |
|---|---|
| UI | Vanilla HTML, CSS, JavaScript (ES2020+), with no framework and no build step |
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
├── style.css                   Dark theme and responsive layout
├── sounds/                     Sound effects
└── .github/workflows/deploy.yml
```

## Roadmap

- Edit existing items and projects in the admin dashboard
- "New season" reset for purchased items
- Automated link and price checking
- Visual redesign
- Optional serverless proxy for writes

## License

MIT
