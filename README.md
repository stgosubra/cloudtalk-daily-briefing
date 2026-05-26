# CloudTalk Daily Briefing

A personal daily briefing dashboard for CloudTalk built on top of [Claude Cowork](https://claude.ai).

Pulls today's prospect calls from Google Calendar, joins them with live HubSpot data (lead status, seats, country, phone), enriches each card with the latest Gmail thread signal, and renders a hot-reloading React dashboard at `localhost:5173`. Auto-refreshes every weekday morning via a scheduled task.

![Dashboard preview](docs/preview.png)

## What you get

- Chronological view of every external prospect call for the week
- Per-card: HubSpot link, Meet join button, lead status badge, RSVP badge, local-time display
- Gmail thread signal per prospect (last email subject, snippet, date)
- Challenger insight + qualifier questions per prospect, generated once and cached
- Day/week toggle, timeline, open-slot finder
- Browser notifications 5 min before each call
- Automated morning refresh at 8am weekdays (no manual action needed)

## Requirements

Before installing, you need:

- **[Claude desktop](https://claude.ai/download)** with Cowork mode enabled
- **Google Calendar** connector connected in Cowork
- **Gmail** connector connected in Cowork
- **HubSpot** connector connected in Cowork
- **Node.js 18+** installed on your machine ([download here](https://nodejs.org))

## Install

### Step 1 — Add this marketplace to Cowork

1. Open Claude desktop → Settings → Plugins
2. Click **Add marketplace**
3. Paste this URL: `https://github.com/stgosubra/cloudtalk-daily-briefing`
4. Find **CloudTalk Daily Briefing** in the list and click **Install**

### Step 2 — Run the setup skill

In any Cowork chat, say:

```
set up daily briefing
```

The skill will auto-detect your identity from HubSpot (name, email, ownerId, portalId, timezone), ask you to confirm, then:
- Copy the React/Vite app into the folder you choose (default: `~/Desktop/daily-briefing`)
- Write your personal `config.json`
- Create the morning scheduled task (8am weekdays)

### Step 3 — Start the dashboard

```bash
cd ~/Desktop/daily-briefing   # or whatever folder you chose
npm install
npm run dev
```

Open `http://localhost:5173` in your browser and allow notifications when prompted.

Leave the tab open. The dashboard auto-refreshes every weekday morning at 8am.

## Manual refresh

At any time, say in Cowork:

```
refresh my daily briefing
```

## How it works

| Component | Role |
|---|---|
| `briefing-setup` skill | One-time setup. Copies the Vite scaffold, writes `config.json`, creates the cron task. |
| `briefing-refresh` skill | Morning data pull. Reads `config.json`, fetches Calendar + HubSpot + Gmail, rewrites `src/App.jsx`. |
| `assets/` | React/Vite scaffold template (copied to your machine during setup). |

## Troubleshooting

**"config.json missing"** — Run `set up daily briefing` in Cowork first.

**Dashboard not updating** — Make sure `npm run dev` is still running and the browser tab is open.

**Connectors not found** — Go to Settings → Connections in Claude and verify Google Calendar, Gmail, and HubSpot are all connected.

## Author

Santiago Subra 
