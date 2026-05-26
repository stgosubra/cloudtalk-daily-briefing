# CloudTalk Daily Briefing

Personal daily briefing dashboard for CloudTalk AEs. Pulls today's prospect calls from Google Calendar, joins them with HubSpot context (lead status, deals, country, job title, phone), and renders a live local React dashboard. Auto-refreshes every weekday morning at 8am via a scheduled task.

## What you get

- A clean single-page dashboard at `http://localhost:5173` showing every prospect call on your day, ordered chronologically
- One-click HubSpot links and Meet join buttons per call
- Per-call notes, RSVP badges, multi-attendee flags, SQL stars, "hard to reach" alerts
- Day timeline, progress bar, open-slot finder, day stats
- Browser notifications 5 min before each call
- Hot-reloads automatically when the morning refresh runs

## Prerequisites

You need these connected in Cowork before installing:

- Google Calendar (read access)
- HubSpot (read access to contacts, search scope)
- Scheduled tasks (built-in)

You also need Node.js 18+ on your machine to run the local Vite dev server.

## Install

1. Install this plugin in Cowork.
2. In any Cowork chat, say: `set up daily briefing`
3. The setup auto-detects your identity (name, email, HubSpot ownerId, portalId, timezone) from your HubSpot connection. Confirm or override, then pick a folder for the project. That's it.
4. Open a terminal:
   ```
   cd <your project folder>
   npm install
   npm run dev
   ```
5. Open `http://localhost:5173` and allow notifications when prompted.
6. Leave the tab open. The dashboard auto-refreshes weekday mornings at 8am.

## Manual refresh

In any Cowork chat, say: `refresh my daily briefing`

The refresh skill pulls today's calendar + HubSpot data and rewrites `src/App.jsx`. Vite hot-reloads the browser automatically.

## Components

| Component | Purpose |
| --- | --- |
| `briefing-setup` skill | First-run onboarding. Triggered by "set up daily briefing". Auto-detects your HubSpot identity (name, email, ownerId, portalId, timezone) via the HubSpot MCP, copies the React/Vite scaffold, writes `config.json`, creates the morning scheduled task. Falls back to manual entry if auto-detect fails. |
| `briefing-refresh` skill | The morning data pull. Reads `config.json`, fetches today's calendar + HubSpot, rewrites `src/App.jsx`. Runs autonomously when the scheduled task fires; can also be triggered manually. |
| `assets/` | React/Vite scaffold copied into the user's project folder during setup. Includes `App.jsx.template`, `package.json`, `vite.config.js`, `index.html`, `main.jsx`, `index.css`, `App.css`, `config.example.json`. |

## Where things live

- `<projectPath>/config.json` - your identity (name, email, HubSpot ownerId/portalId, timezone, projectPath). Single source of truth.
- `<projectPath>/src/App.jsx` - the dashboard. Imports `config.json` for OWNER values. The data constants (PROSPECTS, OTHER_EVENTS, TODAY_LABEL) get rewritten by the refresh skill on every run.
- Scheduled task `cloudtalk-daily-briefing` - cron `0 8 * * 1-5` (8am weekdays, local time). Configurable later via the scheduled-tasks UI.

## How the refresh logic works

1. Read `config.json` to know whose calendar + HubSpot portal to pull from.
2. Pull today's events from Google Calendar (00:00-23:59 in user's timezone).
3. Classify each event: prospect call vs internal/personal. Prospect calls are events with at least one external (non-`@cloudtalk.io`) attendee AND a recognizable prospect-call title pattern.
4. For each prospect call, look up the external attendee in HubSpot by email. Pull lead status, deals, country, job title, phone, company.
5. Build the new PROSPECTS array (chronological, with cancellation/declined flags), OTHER_EVENTS array (rest of day with emoji + color tags), and update TODAY_LABEL/REFRESHED_AT.
6. Write the candidate `App.jsx`, syntax-check it with esbuild, then atomically copy over the live file. Vite hot-reloads.

## Customizing the schedule

After setup, the scheduled task fires at 8am weekdays. To change the time or pause it, ask Cowork: `update my cloudtalk daily briefing schedule to fire at 7am instead` (or pause it via the scheduled-tasks UI).

## Privacy + scope

- This plugin reads your calendar and HubSpot data. It writes only to your local project folder. Nothing leaves your machine.
- Notes you type into prospect cards are kept in React state - they reset on page reload. They're NOT synced anywhere.
- The plugin is intended for CloudTalk teammates. HubSpot portalId defaults to `6195055` (CloudTalk's portal).

## Author

Santiago Subra (santiago.subra@cloudtalk.io)

Internal CloudTalk use only.
