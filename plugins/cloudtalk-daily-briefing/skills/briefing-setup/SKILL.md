---
name: briefing-setup
description: Sets up the CloudTalk Daily Briefing dashboard for a new user. Trigger when the user says "set up daily briefing", "install briefing", "configure daily briefing", "first run daily briefing", or "set up my CloudTalk briefing". Auto-detects the user's HubSpot identity (name, email, ownerId, portalId, timezone) via the HubSpot MCP, asks them to confirm and provide a project folder path, copies the React/Vite scaffold into that folder, writes a config.json, and creates the morning scheduled task that auto-refreshes the dashboard. Run this skill exactly once per machine before the briefing-refresh skill is used.
---

# Briefing Setup

You are guiding a CloudTalk teammate through the one-time setup of their personal Daily Briefing dashboard. The briefing is a local React/Vite app that renders today's prospect calls (from Google Calendar) joined with HubSpot context, and it auto-refreshes every weekday morning via a scheduled task.

## Required prerequisites

Before doing anything, verify the user has these connectors active in Cowork:
- Google Calendar (read access to their primary calendar)
- HubSpot (read access to contacts)
- Scheduled tasks (built-in)

If any are missing, stop and tell the user which connector to install. Do not proceed with setup.

## Step 1 - Auto-fetch identity from HubSpot

Call `mcp__9c7cb11a-50fe-4766-86e1-7f1692a41332__get_user_details` with `include: ["USER_INFORMATION"]`. This returns the connected user's owner ID, name, and email straight from their HubSpot connection - no manual lookup needed.

Then call `mcp__9c7cb11a-50fe-4766-86e1-7f1692a41332__get_organization_details` with `include: ["ACCOUNT_INFORMATION"]`. This returns the account's portalId (sometimes called Hub ID, accessible via `uiDomain` or the account info object), timezone, and currency.

Parse from the responses:
- `ownerId` (numeric, from user details)
- `name` (from user details)
- `email` (from user details)
- `portalId` (numeric, from account info)
- `timezone` (IANA string, from account info)

If either MCP call fails or returns missing fields, fall back to manually asking the user (see "Manual fallback" below).

## Step 2 - Confirm and collect remaining inputs

Show the user what was auto-detected and ask them to confirm or override. Use AskUserQuestion with one question per field that needs confirmation:

1. **Confirm identity** - show "Detected: <name> <email>, HubSpot ownerId <id>, portal <portalId>, timezone <tz>. Use these?" Options: "Yes, use detected values" / "Let me override". If they choose override, collect each field via free text.
2. **Project folder path** - free text. Default to `~/Desktop/daily-briefing`. Always ask, never auto-detect.

Resolve `~` to the user's home directory by reading the `HOME` environment variable via Bash (`echo $HOME`).

## Manual fallback

If auto-fetch fails (HubSpot MCP unavailable, missing scopes, unexpected response shape), drop into manual mode and ask the user via AskUserQuestion:
1. **Full name** - free text
2. **Work email** - free text
3. **HubSpot ownerId** - free text. Tell them: "Find this in HubSpot under Settings - Users & Teams - click your name - the User ID in the URL." Validate numeric.
4. **HubSpot portalId** - free text. Tell them: "Find this in HubSpot under Settings - Account Setup - the Hub ID at the top." Validate numeric.
5. **Timezone** - multiple choice: `Europe/Paris`, `Europe/London`, `Europe/Madrid`, `America/New_York`, `America/Los_Angeles`, plus free-text fallback.
6. **Project folder path** - free text. Default `~/Desktop/daily-briefing`.

## Step 3 - Create the project folder and copy the scaffold

The plugin ships a React/Vite scaffold at `${CLAUDE_PLUGIN_ROOT}/assets/`. Copy these files into the user's project folder:

- `assets/package.json` -> `<projectPath>/package.json`
- `assets/vite.config.js` -> `<projectPath>/vite.config.js`
- `assets/index.html` -> `<projectPath>/index.html`
- `assets/main.jsx` -> `<projectPath>/src/main.jsx`
- `assets/App.jsx.template` -> `<projectPath>/src/App.jsx`
- `assets/index.css` -> `<projectPath>/src/index.css`
- `assets/App.css` -> `<projectPath>/src/App.css`

Use Bash `mkdir -p <projectPath>/src` to ensure the folder exists, then copy each file with `cp`. If the folder already contains an existing `src/App.jsx`, ask the user before overwriting.

## Step 4 - Write config.json

Generate `<projectPath>/config.json` with the structure:

```json
{
  "owner": {
    "name": "<full name>",
    "email": "<work email>",
    "ownerId": <hubspot ownerId as number>,
    "portalId": <hubspot portalId as number>
  },
  "timezone": "<IANA timezone>",
  "projectPath": "<absolute project path>"
}
```

The refresh skill reads from this file every run. The React app imports it at build time.

## Step 5 - Create the morning scheduled task

Call `mcp__scheduled-tasks__create_scheduled_task` with:

- `taskId`: `cloudtalk-daily-briefing`
- `description`: `Refresh CloudTalk Daily Briefing - pulls calendar + HubSpot, rewrites App.jsx`
- `cronExpression`: `0 8 * * 1-5` (8am weekdays, in user's local timezone)
- `prompt`: A short instruction that invokes the briefing-refresh skill. Use this exact text:

```
Run the briefing-refresh skill from the cloudtalk-daily-briefing plugin. It reads <projectPath>/config.json, pulls today's calendar events and HubSpot data, and rewrites <projectPath>/src/App.jsx. No user is present - execute autonomously and report a concise summary at the end.
```

Substitute `<projectPath>` with the actual absolute path.

## Step 6 - Print next steps

After everything succeeds, tell the user (in plain language, no jargon):

1. Open a terminal and `cd <projectPath>`
2. Run `npm install` (one-time)
3. Run `npm run dev` and leave it running in the morning
4. Open `http://localhost:5173` to see the dashboard
5. Browser will prompt for notification permission - allow it for 5-min-before-call alerts
6. The dashboard auto-refreshes every weekday at 8am - tab will hot-reload
7. To trigger a manual refresh, say "refresh my daily briefing" in this Cowork chat

End with a one-line confirmation: "Setup complete. Your first auto-refresh fires at 8am next weekday morning."

## Constraints

- Run setup interactively. Do not skip questions or assume defaults beyond the ones explicitly noted (portalId default and projectPath default only).
- If any HubSpot or Google Calendar connector is missing, abort with a clear message - do not partial-install.
- Do not overwrite an existing config.json without asking.
- Use absolute paths everywhere. Resolve `~` via `$HOME`.
- ASCII hyphens only, no em-dashes.
- 2-space indentation in any code or JSON you write.
