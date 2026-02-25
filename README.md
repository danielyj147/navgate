# Colgate Parking & Shuttle Tracker

A real-time, interactive campus parking availability map and shuttle tracker built for Colgate University. This project was born out of frustration with the official parking information and shuttle tracking tools, which are unintuitive, hard to read, and scattered across multiple pages. The goal was to consolidate everything into a single, clean interface that answers two simple questions at a glance: **"Where can I park right now?"** and **"Where is the shuttle?"**

---

## Why This Exists

Colgate University's official parking resources suffer from a few core problems:

- **Parking rules are confusing.** Lot availability depends on the time of day, day of the week, lot category (student, employee, restricted), and whether a lot is overnight-exempt. The official documentation buries this logic across different web pages that require manual cross-referencing.
- **The shuttle tracker is clunky.** The existing Peak Transit-based tracker works, but it's interface isn't tailored to the Colgate campus. Route schedules, vehicle positions, and stop information are spread across different views with no cohesive experience.
- **There's no unified view.** Parking and transit are two halves of the same question — "How do I get where I need to go?"

This app solves all three by combining a time-aware parking availability map with a live shuttle tracker in a single interactive interface.

---

## Features

### Parking Availability Map

- **campus lots** mapped with precise polygon boundaries on an interactive Leaflet map
- **Real-time status calculation** based on the current time, day of week, and lot category:
  - **Overnight (3:00 AM – 7:00 AM):** Most lots restricted; only overnight-exempt lots available
  - **Business Hours (7:00 AM – 4:30 PM):** Student lots open; employee lots restricted to permit holders
  - **Open Hours (4:30 PM – 3:00 AM):** All non-restricted lots available
  - **Weekends:** Relaxed rules — all non-restricted lots generally open
- **Color-coded lot polygons** that update every 15 seconds:
  - Green = Available
  - Yellow = Opening soon (within 30 minutes of a transition)
  - Orange = Closing soon (within 30 minutes of a transition)
  - Red = Unavailable / Restricted
- **Click any lot** to zoom in and see its name, status, reason, and category
- **Live clock and period indicator** showing the current Eastern Time, active parking period, and countdown to the next transition

### Search, Filters & Near Me

- **Search by lot name** with instant filtering
- **Status filters:** Show only lots that are opening soon or closing soon
- **Category filters:** Filter by Student, Employee, or Overnight-exempt lots
- **"Near Me" mode:** Uses browser geolocation to sort lots by distance (Haversine formula), showing only available or soon-to-open lots nearby with distance labels

### Shuttle Tracker

- **Live vehicle positions** pulled from the Peak Transit API, displayed as colored dots on the map
- **4 active routes** with distinct colors:
  - Bookstore–Apartments (Red)
  - Shopping (Blue)
  - Townhouse
  - Wellness
- **Route polylines** with directional arrow decorators so you can see which way the shuttle is heading
- **Stop markers** with popups showing stop names — multi-route stops display a pie-chart icon showing which routes serve them
- **Active vehicle counts** per route
- **Full schedules** pulled from official Colgate Transportation data, with:
  - Sub-schedules for different days and time blocks (daytime, evening, etc.)
  - Day-of-week filtering
  - Highlighted next departure

### UI & Experience

- **Dark mode / Light mode** toggle with matching map tiles (Carto Voyager light / Carto Dark Matter dark)
- **Responsive sidebar** with a parking lot list panel and a shuttle detail panel
- **Seamless mode switching** between parking view and shuttle view
- **Map legend** explaining the color coding
- **Custom tile layer ordering** — base tiles, shuttle routes, label tiles, and parking markers are rendered on separate Leaflet panes for clean visual layering

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org) 5 |
| UI | [React](https://react.dev) 19 |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 |
| Maps | [Leaflet](https://leafletjs.com) 1.9 + [React Leaflet](https://react-leaflet.js.org) 5 |
| Route Arrows | [leaflet-polylinedecorator](https://github.com/bbecquet/Leaflet.polylineDecorator) |
| Shuttle Data | [Peak Transit API](https://peaktransit.com) |
| Fonts | [Geist](https://vercel.com/font) (via next/font) |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with Geist font
│   ├── page.tsx            # Entry point — renders ClientApp
│   └── globals.css         # Global styles + Tailwind directives
│
├── components/
│   ├── ClientApp.tsx       # Lazy-loaded client wrapper with loading state
│   ├── ParkingMap.tsx      # Central map hub — state, filters, geolocation, tiles
│   ├── LotListPanel.tsx    # Left sidebar — search, filters, lot list, dark mode toggle
│   ├── LotMarker.tsx       # Individual lot polygon with status color and popup
│   ├── ShuttleLayer.tsx    # Map layer — route lines, stops, vehicle dots
│   ├── ShuttlePanel.tsx    # Right sidebar — route toggles, schedules, departures
│   ├── MapLegend.tsx       # Color legend overlay
│   └── TimeDisplay.tsx     # Live clock, period label, transition countdown
│
├── data/
│   ├── lots.ts             # 65 parking lot definitions (coordinates, polygons, categories)
│   ├── rules.ts            # Parking period boundaries and transition window config
│   └── shuttle-schedules.ts # Official route schedules from Colgate Transportation
│
├── types/
│   └── index.ts            # TypeScript interfaces (ParkingLot, LotStatus, Shuttle*, etc.)
│
└── utils/
    ├── availability.ts     # Lot status logic — period detection, status calculation
    ├── time-utils.ts       # Eastern Time conversion, minutes-since-midnight, day mapping
    ├── transitions.ts      # Next period boundary + countdown formatting
    └── shuttle-api.ts      # Peak Transit API client — vehicles, routes, stops, shapes
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- npm (comes with Node.js)

### Installation

```bash
git clone https://github.com/your-username/colgate-parking.git
cd colgate-parking
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The page hot-reloads as you edit. The map will center on the Colgate University campus and begin calculating lot availability based on the current time.

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```
---

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com):

```bash
npx vercel
```

Or connect the GitHub repository to Vercel for automatic deployments on push. No environment variables or external configuration are required — the Peak Transit API is accessed client-side and the parking rules are bundled statically.

---

## Acknowledgments

- Parking lot boundaries, categories, and rules are based on official Colgate University parking documentation
- Shuttle schedules sourced from Colgate University Transportation Services
- Live shuttle vehicle data provided by [Peak Transit](https://peaktransit.com)
- Map tiles by [CARTO](https://carto.com) (Voyager and Dark Matter)

---

## License

This project is not affiliated with or endorsed by Colgate University. It is an independent tool built to improve the campus parking and transit experience.
