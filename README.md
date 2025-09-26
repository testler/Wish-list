## Josh's Wishlist

An elegant, single‑page wishlist built with vanilla HTML/CSS/JS. It’s fast, mobile‑first, and delightful to use. Projects group ideas, items can be marked purchased, and a “secret” admin area lets you manage everything with instant persistence.

### Table of Contents
- Quick Start
- Features
- Data Model
- Routing and Navigation
- Admin Area (Secret)
- Development Guide
- Troubleshooting
- Roadmap
- License

## Quick Start
1) Clone or download this repo.
2) Open `index.html` directly in your browser.
   - On Windows you can double‑click the file or run:
```bash
start index.html
```
3) You’re done. No build step, no tooling required.

Optional: Use a lightweight static server for better history/navigation support.
```bash
npx serve .
```

## Features
- Purchased item UX
  - Purchased items are visually muted, moved to the bottom, and show a red “Purchased” button.
- Views and sorting
  - Under $20, $30 Items, By Priority (S/A/B/C), By Project, Purchased.
  - Projects are sorted by available item count.
- Project detail pages
  - Clean header with name, description, and stats (Total / Available / Purchased).
- Dynamic favicon/vendor handling
  - Item links and vendor badges are consistent and robust.
- Mobile‑first, responsive UI
  - 2‑column project layout on small screens, fluid grids elsewhere.
- Fast client‑side router
  - Hash‑free navigation using `history.pushState`, with full Back/Forward support.
- Secret admin area
  - 5 taps on the gift hero icon → password `secret` → add/update/delete items and projects.
- Persistence
  - Primary: JSONBin (cloud) via REST; Fallback: `localStorage` (offline‑safe).
- Sound effects (tasteful, low volume)
  - Category tap: Mario; Admin enter: Zelda secret; Purchase confirm: Zelda chest.
- Static landing page
  - The landing markup is pre‑rendered; JavaScript only updates dynamic counts/pills, so there’s no post‑load layout shift.

## Data Model
Items and projects live in JSON. The app reads/writes to JSONBin and mirrors data to `localStorage`.

### Item
```json
{
  "id": "FLIR-ONE-Gen-3",
  "title": "FLIR ONE Gen 3 - Thermal Imaging Camera for iOS Smartphones",
  "price": 204,
  "project": "home-improvement",
  "rank": "S",
  "vendor": "Amazon",
  "image": "https://m.media-amazon.com/images/I/71ggGSZaK+L._AC_SL1500_.jpg",
  "url": "https://www.amazon.com/dp/B0DPXX7P5M/...",
  "purchased": false
}
```

### Project
```json
{
  "id": "home-improvement",
  "name": "Home Improvement",
  "description": "House upgrades, tools, and lighting that push back the entropy gremlins.",
  "icon": "🛠️",
  "color": "#EAB308",
  "project-icon-image": "https://...optional-large-image.png"
}
```

## Routing and Navigation
- Routes are stored in `?route=...` and managed with `history.pushState`.
- Core API
  - `nav(route)` → navigates and renders
  - `render()` → re‑renders current route
- Containers
  - `#home-content` is static HTML for the landing page.
  - `#route-view` is where routed pages render. It remains hidden while on `home`.

## Admin Area (Secret)
- Access: tap the hero gift icon 5 times → enter password `secret`.
- Tabs: Items | Projects.
  - Items: add with fields Name, Price, Vendor, Project, Rank (S/A/B/C), Image URL, Item URL, Purchased.
  - Projects: add with fields Name, Description, Icon, Color, Project Icon Image URL.
- Persistence
  - Saves to JSONBin (PUT) and mirrors to `localStorage`.
  - If JSONBin is unreachable, changes still persist locally until connectivity returns.

Security note: This is a static SPA; the JSONBin key is client‑side by design. For sensitive use, proxy requests through a tiny backend.

## Development Guide
- Stack: plain HTML/CSS/JS, no framework.
- Entry points
  - `index.html` → static layout and pre‑rendered home
  - `app.js` → state, router, rendering, admin, sounds
- Key functions
  - `load()` → fetches JSONBin, heals missing projects, persists to localStorage
  - `save()` → writes to JSONBin and localStorage
  - `nav(to)` / `render()` → routing and view rendering
  - `home()` → updates dynamic counts and attaches home interactions
- Sounds
  - Implemented with `new Audio(file)`. Default volume is set low for comfort.

### Local Editing Flow
1) Open `index.html` in your browser.
2) Make changes to `app.js` or styles as needed.
3) Refresh to see results. No build step required.

## Troubleshooting
- Landing page flashes or shifts after load
  - Ensure `<body class="home-page">` and that `#route-view` exists right after `#home-content` in `index.html`.
- Back button doesn’t navigate
  - Verify the browser allows history updates on `file://` URLs. Using a static server (`npx serve .`) provides the best experience.
- Images show broken icons
  - Broken image URLs are gracefully swapped for a placeholder. Verify the remote URL or add a local image.
- JSONBin write fails
  - The app falls back to localStorage. Check network and JSONBin key/URL in `app.js` (`API_URL`, `KEY`).

## Roadmap
- Edit existing items/projects via inline modals
- Import/export data as a downloadable JSON file
- Optional authentication for admin
- Accessibility polish and keyboard shortcuts

## License
MIT © 2025

# Josh's Wishlist App

A modern, responsive wishlist application built with vanilla HTML, CSS, and JavaScript. Features a clean dark theme with green accents, JSONBin.io integration for data persistence, and full CRUD functionality for wishlist items.

## 🎯 Features

- **Clean, Modern UI**: Dark green and steel gray theme with glowing accents
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Data**: Integrates with JSONBin.io for persistent data storage
- **Multiple Item Types**: Support for both fixed-price items and crowdfunded contributions
- **Smart Sorting**: Multiple sorting options including "Most Wanted" algorithm
- **Interactive Actions**: Claim items, mark as purchased, and contribute to funding
- **Status Tracking**: Visual badges for Available, Claimed, and Purchased items
- **Progress Bars**: Visual contribution tracking for crowdfunded items

## 🚀 Quick Start

### Option 1: Run with Sample Data (No Setup Required)

1. Clone or download this repository
2. Open `index.html` in your web browser
3. The app will load with sample data automatically

### Option 2: Connect to JSONBin.io (Full Functionality)

1. **Create a JSONBin Account**
   - Go to [jsonbin.io](https://jsonbin.io) and create a free account
   - Create a new bin with the following initial data:

```json
{
  "items": [
    {
      "id": "phone-mount",
      "title": "Custom Phone Mount",
      "category": "Tesla Upgrades",
      "status": "available",
      "price": 39.99,
      "priority": 1,
      "dateAdded": "2024-01-15",
      "links": [
        {"label": "Buy at Amazon", "url": "https://amazon.com", "type": "primary"},
        {"label": "Manufacturer", "url": "https://example.com", "type": "secondary"}
      ]
    },
    {
      "id": "strawberries",
      "title": "Flavorfest Strawberries",
      "category": "Garden & Orchard Tools",
      "status": "available",
      "priority": 2,
      "dateAdded": "2024-01-08",
      "contribution": {
        "target": 150,
        "raised": 60
      },
      "links": [
        {"label": "Contribute", "url": "https://example.com", "type": "primary"}
      ]
    }
  ]
}
```

2. **Configure the App**
   - Copy your Bin ID from the JSONBin dashboard
   - Open `app.js` and update the configuration:

```javascript
const CONFIG = {
    BIN_ID: "your_actual_bin_id_here",
    API_KEY: "your_actual_api_key_here",
    BASE_URL: "https://api.jsonbin.io/v3/b"
};
```

3. **Deploy to GitHub Pages**
   - Push your repository to GitHub
   - Go to Settings → Pages → Deploy from main branch
   - Live at `https://yourusername.github.io/wishlist-app/`

## 📁 Project Structure

```
wishlist-app/
├── index.html          # Main HTML structure
├── style.css           # Styling and theme
├── app.js             # JavaScript logic and JSONBin integration
└── README.md          # Documentation
```

## 🎨 Design Features

- **Dark Theme**: Deep green and steel gray color palette
- **Responsive Cards**: Clean, rounded cards with hover effects
- **Status Badges**: Visual indicators for item availability
- **Progress Bars**: Contribution tracking with percentage display
- **Interactive Elements**: Smooth hover animations and transitions

## 🔧 Usage

### Sorting Options
- **Most Wanted**: Priority → Contribution % → Date added
- **Price**: Low to high or high to low
- **Category**: Alphabetical grouping
- **Recently Added**: Newest items first

### Item Actions
- **Claim Item**: Mark an item as claimed by someone
- **Mark Purchased**: Update status to purchased
- **View Links**: Direct links to purchase or contribute

## 🛡️ Security Notes

- **Public API Key**: JSONBin key is visible in source (acceptable for this use case)
- **Version History**: JSONBin maintains backups for data recovery
- **Rate Limits**: Free JSONBin accounts have API call limits

## 📱 Compatibility

- Modern browsers (Chrome 80+, Firefox 75+, Safari 13+)
- Mobile responsive design
- No build tools required - runs directly in browser

---

**Ready to use! Open `index.html` to get started.**
