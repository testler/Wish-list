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
