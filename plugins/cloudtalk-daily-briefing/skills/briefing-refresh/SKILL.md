---
name: briefing-refresh
description: Rebuilds the CloudTalk Daily Briefing React dashboard with today's prospect calls and live HubSpot context. Trigger when the user says "refresh my daily briefing", "update my briefing", "rebuild the daily briefing", or when the cloudtalk-daily-briefing scheduled task fires. Reads config.json from the user's project folder to know whose calendar and HubSpot to pull, fetches today's external prospect calls from Google Calendar, joins them with HubSpot contact records, enriches each card with the latest Gmail thread signal, and generates companyBrief + challengerInsight + qualifierQuestions for any new prospect not seen before. Rewrites App.jsx so Vite hot-reloads the browser. Runs autonomously when invoked by the scheduled task.
---

# Briefing Refresh

You are refreshing the CloudTalk Daily Briefing dashboard so the user's `App.jsx` reflects today's calendar joined to live HubSpot data and Gmail signals. Vite watches the file and hot-reloads `http://localhost:5173`.

## Step 1 - Locate the project and read config

The user's project folder path was passed in the scheduled task prompt or is implied by recent context. If not, ask the user where their daily-briefing project lives. Default check: `~/Desktop/daily-briefing`.

Read `<projectPath>/config.json`. Parse it. Extract:

- `owner.name` -> goes into App.jsx `OWNER.name`
- `owner.email` -> goes into `OWNER.email`
- `owner.ownerId` -> goes into `OWNER.ownerId`
- `owner.portalId` -> used in the `HS()` helper URL
- `timezone` -> use as the timezone arg for the calendar pull
- `projectPath` -> absolute path; the target file is `<projectPath>/src/App.jsx`

If config.json is missing or malformed, abort and tell the user to run "set up daily briefing" first.

If the user is invoking this through Cowork and the project folder is not yet mounted, call `mcp__cowork__request_cowork_directory` with the projectPath before reading.

## Step 2 - Snapshot carry-over emails from current App.jsx

Before pulling any live data, read the first ~700 lines of the current `App.jsx` and extract the set of prospect emails already present in any `*_PROSPECTS` array. Call this the **carry-over set**.

This matters because cards whose email already exists in the file are carry-over cards. Their `companyBrief`, `challengerInsight`, and `qualifierQuestions` must be preserved byte-for-byte from the existing file - do NOT regenerate them. Only generate those three fields for genuinely new cards (email not in the carry-over set).

## Step 3 - Pull today's calendar events

Use `mcp__6bc81bae-2153-46e9-9eda-e832bf000b3e__list_events` (Google Calendar MCP) for today (00:00 to 23:59 in `config.timezone`). Use `pageSize: 100`.

If the response is too large to fit in context, the MCP returns a file path - read the file and use `jq` via Bash to extract event fields.

## Step 4 - Classify each event

**Prospect call** = at least one attendee whose email domain is NOT `@cloudtalk.io` AND the event title contains "CloudTalk" OR "Exploration Meeting" OR is a clear 1:1 prospect intro. By default, treat any event with an external attendee as a prospect candidate, but use judgment - team offsites, dinners, hackathons with shared external invitees are NOT prospect calls.

**Internal/personal event** = no external attendees, OR all attendees are `@cloudtalk.io`, OR the event is a recognizable team/personal block (Lunch, Gym, AFK, "Llamar X", etc.).

For each prospect call, capture:
- Primary external attendee email (first non-cloudtalk address)
- All external attendee emails (for multiAttendee detection)
- Start time HH:MM (in user's timezone)
- End time HH:MM
- Conference URL (Meet link from `hangoutLink` or `conferenceData.entryPoints[0].uri`)
- Event status (`confirmed` vs `cancelled`)
- Each external attendee's responseStatus

## Step 5 - HubSpot lookups

For all unique primary external emails, call `mcp__9c7cb11a-50fe-4766-86e1-7f1692a41332__search_crm_objects` with:

- `objectType`: `contacts`
- `properties`: `["hs_lead_status", "num_associated_deals", "firstname", "lastname", "email", "phone", "jobtitle", "company", "country", "hs_object_id", "seats_indicated__aggregated_", "lead_source"]`
- `filterGroups`: `[{filters: [{propertyName: "email", operator: "IN", values: [<all emails>]}]}]`
- `chatInsights`: `{userIntent: "Refresh CloudTalk Daily Briefing prospect cards from today's calendar", satisfaction: "NEUTRAL"}`

For emails not returned, do a fallback `query` search using name or domain. Emails with zero matches: render the prospect with `hsLink: null` (the artifact shows "Not in HubSpot" for null hsLink).

Do NOT render `num_associated_deals` in the UI. Set `deals: 0` on every card regardless of HubSpot value - the deals badge was intentionally removed from the dashboard.

## Step 6 - Gmail enrichment (lastEmail)

For each prospect's primary email, call `mcp__5052632d-bd77-4b38-a500-585c542e670a__search_threads` with:
- `query`: `"from:<email> OR to:<email>"`
- `pageSize`: `1`

From the returned thread, extract the most recent message and build a `lastEmail` object:

```js
lastEmail: {
  subject: "<thread subject>",
  date: "<human-readable: 'Today HH:MM', 'Yesterday HH:MM', or 'DD Mon HH:MM' for older>",
  snippet: "<first 80-120 chars of the latest message, HTML stripped, sig removed>",
  threadUrl: "https://mail.google.com/mail/u/0/#all/<threadId>"
}
```

If no thread exists, set `lastEmail: null`.

**Date formatting:** Same calendar day -> `"Today HH:MM"`. Previous day -> `"Yesterday HH:MM"`. Older -> `"DD Mon HH:MM"` (e.g. `"20 May 08:01"`). Times are local (CEST = UTC+2 in summer).

**Snippet signal flags** - prepend a short prefix if spotted:
- Cancellation words ("no longer able", "have to cancel", "annuler") -> `"⚠️ Cancellation signal: "`
- Reschedule words ("moved to", "push to", "postpone", "reporter") -> `"🔄 Reschedule signal: "`
- Post-call summary ("Summary & Next Steps", "Compte-rendu", "suite à notre appel") -> `"📋 Post-call: "`
- Urgency words ("ASAP", "urgent", "today") -> `"🔥 "`
- Prospect reply (not just an invite bounce) -> `"🔥 Reply: "` - strong signal, always flag

Strip: HTML tags, "Join with Google Meet" boilerplate, calendar invite headers, email signatures (lines starting with "Best", "Regards", "Cordialement", "--", or containing the sender's name/title).

## Step 7 - Build the new PROSPECTS array

Order chronologically by `start`.

For **carry-over cards** (email in the carry-over set from Step 2): preserve `companyBrief`, `challengerInsight`, and `qualifierQuestions` byte-for-byte from the existing file. Only update `lastEmail`, `start`, `end`, `meetLink`, `rsvp`, `canceled`, and `leadStatus`.

For **new cards** (email NOT in the carry-over set): generate all fields including `companyBrief`, `challengerInsight`, and `qualifierQuestions` per Step 8.

Each entry shape:

```js
{
  name: "<First Last>",
  email: "<primary external email>",
  start: "HH:MM",
  end: "HH:MM",
  hsLink: HS(<contact id>),   // or null if not in HubSpot
  meetLink: "<conferenceUrl>",
  canceled: <true if event status === "cancelled" OR all externals declined>,
  rsvp: "<accepted|needsAction|declined - dominant external response>",
  company: "<HS company or domain-derived guess>",
  companyUrl: "<https://www. + email domain>",
  jobtitle: "<HS jobtitle or null>",
  country: "<HS country lowercased - matches COUNTRY_MAP key, or null>",
  leadStatus: "<HS hs_lead_status verbatim, or null>",
  deals: 0,
  seats: "<HS seats_indicated__aggregated_ or null>",
  phone: "<HS phone with whitespace stripped, or null>",
  multiAttendee: <true if more than one external attendee>,
  companyBrief: "<string - new cards only, see Step 8>",
  challengerInsight: "<string - new cards only, see Step 8>",
  qualifierQuestions: [ ... ],  // new cards only, see Step 8
  lastEmail: { ... }
}
```

Valid `leadStatus` values: `NEW`, `OPEN`, `IN_PROGRESS`, `ATTEMPTED_TO_CONTACT`, `Qualified`, `CONNECTED`, `BAD_TIMING`, `Unable to Contact`. Preserve casing exactly as HubSpot returns.

## Step 8 - Generate enrichment for new cards

For every card whose email was NOT in the carry-over set, generate these three fields. They exist so the AE walks into the call prepared, not researching on the fly.

### companyBrief (string, use \n for line breaks)

3-5 lines covering:
1. What the company does, its size, geography, and any notable scale or funding signals
2. What the HubSpot fields tell you: lead status, lead source, seats indicated, inbound vs outbound signal
3. Who the contact likely is based on their jobtitle and the company name pattern
4. Likely pain: what category of call/communication problem fits this company's motion
5. CloudTalk fit: which specific features address that pain (IVR, power dialer, WhatsApp Business, HubSpot sync, call recording, etc.) and which language/region to run the call in

If the company has no indexable online presence and the domain or email alias looks suspicious (crypto-recovery, backup-wallet, BPO dialing US consumer verticals like Final Expense or Medicare Advantage), say so directly: "DISQUALIFY RISK - [specific reason]". Don't soften it.

### challengerInsight (string, 1-2 sentences)

One sharp observation that reframes the prospect's problem in a way they haven't heard before. Goal: give the AE a conversation opener that provokes genuine thought rather than a features comparison. Structure: state the counterintuitive industry insight or hidden loss metric, then give the single question to ask. Specific to this company's vertical - no generic sales phrasing.

### qualifierQuestions (array of 5-6 objects)

Questions that surface deal fit, urgency, or size in the first 10 minutes. Make them specific to this company's vertical and situation. Each:

```js
{ key: "shortKey", label: "Short label (3-4 words)", hint: "The actual question, phrased naturally" }
```

Good key names: `volume`, `routing`, `stack`, `trigger`, `buyer`, `compliance`, `callMotion`, `teamSize`, `timeline`, `whoShows`, `recording`, `whatsapp`.

For disqualify-risk profiles, put the disqualify probe first: the question that confirms or denies the risk in the first 2 minutes.

## Step 9 - Build the new OTHER_EVENTS array

Today's non-prospect events with meaningful start/end. Skip events already in PROSPECTS. Suggested emojis and palette colors (only `amber`, `purple`, `cyan`, `emerald`, `red` are valid):

- Gym / Workout: `🏋️` amber
- Lunch / Coffee / Meal: `🥗` amber
- Internal CloudTalk standup / team block: `💬` purple
- AFK / Out of office: `🚪` amber
- Pipe clean / admin pipeline task: `🧹` amber
- Self-only Admin calendar blocks: `📋` amber
- Personal todos like "Llamar X": `📞` amber
- Morning ritual / Attico: `💬` purple
- AI workshop / focus block: `🤖` amber
- Coffee chat / donut chat: `🍩` purple

Each entry shape: `{ emoji, name, start, end, color, meetLink?, note? }`. Cap any event ending past midnight at `23:59`.

## Step 10 - Update file constants

- `TODAY_LABEL`: `"Weekday, D Month YYYY"` (e.g. `"Friday, 22 May 2026"`)
- `TODAY_ISO`: today's ISO date string (e.g. `"2026-05-22"`)
- `REFRESHED_AT`: `"<Day> <D> <Mon> <YYYY> HH:MM CEST - Full-week HubSpot + Gmail + Calendar pull"` (ASCII hyphen, no em-dash)

## Step 11 - Extend COUNTRY_MAP if needed

If a prospect's country isn't already in the map, append a new entry using lowercase key. Region buckets: FR (France/Belgium/Switzerland), NL (Netherlands), DACH (Germany/Austria/Hungary), NORDIC (Sweden/Norway/Denmark/Finland), EN (UK/Ireland), ES (Spain/Portugal), IT (Italy), MEA (Pakistan/Algeria/UAE/Saudi/Egypt/Morocco), APAC (South Africa/India/Australia/Singapore/HK), EU (Lithuania/Latvia/Estonia/Poland/Czech/Slovakia), NA (US/Canada/Mexico), INTL (everywhere else).

## Step 12 - Modify ONLY the data constants

Do NOT touch any of: `OWNER`, `FIRST_NAME`, `HS()` helper, `toMin`, `fromMin`, `C` color palette, `STATUS_MAP`, `LANG_BY_COUNTRY`, `TZ_BY_COUNTRY`, `INSIGHT_KIND_STYLE`, `GREETINGS`, `Greeting`, `LinkBtn`, `RsvpBadge`, `HSPanel`, `NotesPanel`, `CopyEmail`, `ProspectCard`, `OtherCard`, `NowIndicator`, `Progress`, `Timeline`, `OpenSlots`, `NotificationToggle`, `DayStats`, `DailyBriefing`, `LiveNotesModal`, imports, or any JSX.

Do not re-introduce deals counters, deals badges, or SQL badges - these were removed intentionally.

### Qualifier questions overflow fix (do not revert)

The `ProspectCard` component contains four intentional CSS properties that prevent qualifier questions and challenger insight from overflowing the card. Do NOT remove or revert these if you ever touch the component:

1. Role/company container div uses `flex: (briefOpen || qualifyOpen) ? "1 1 100%" : "0 0 auto"` - the `qualifyOpen` condition is intentional. Without it, the flex item stays `"0 0 auto"` when the qualify panel is open and the text overflows out of the card to the right.
2. Qualify panel outer div has `overflow: "hidden", wordBreak: "break-word"` - prevents long challenger insight text from escaping.
3. Challenger insight text div has `wordBreak: "break-word"` - defensive wrap on long unbroken sentences.
4. Qualifier hint span has `wordBreak: "break-word"` - wraps long hint text within the checkbox row.

These were introduced 25 May 2026 to fix qualifier question text overflowing the card bounds on the displayed dashboard.


## Step 12b - Pull W-1 and W-2 prospects for Re-engage tab

Run this step every time, after Step 12. It populates `LAST_WEEK_PROSPECTS` and `TWO_WEEKS_AGO_PROSPECTS` in App.jsx.

**Compute the date ranges:**
- W-1: Mon-Fri of last calendar week (7-3 days ago relative to today's Mon)
- W-2: Mon-Fri of the week before that (14-10 days ago)

Use `mcp__6bc81bae-2153-46e9-9eda-e832bf000b3e__list_events` twice - once per week window (Mon 00:00 to Fri 23:59 local time). `pageSize: 50` each.

**Apply the same prospect filter as Step 4** (external attendees, non-cloudtalk domain, meeting title signals). Skip internal/personal events.

**For each historical prospect event:**
1. Run HubSpot lookup (same as Step 5) - batch all new emails together
2. Run Gmail thread lookup (same as Step 7)
3. Build the prospect object with the same field shape as current-week cards, PLUS add:
   `meetingIso: "YYYY-MM-DD"` // the calendar date of the meeting
4. **Filter out**: any card where `hs_lead_status === "Qualified"` or `hs_lead_status === null`
5. **Keep**: NEW, OPEN, IN_PROGRESS, ATTEMPTED_TO_CONTACT, Unable_to_Contact

**Do NOT generate** `companyBrief`, `challengerInsight`, or `qualifierQuestions` for historical cards. Omit those fields entirely - the Re-engage tab does not render them.

**Carry-over logic:** Mid-week runs preserve both arrays from the Step 2 snapshot unless the `meetingIso` dates are no longer within W-1 or W-2 from today's perspective. On the first run of a new week (Monday), W-1 shifts to W-2 and a fresh W-1 pull replaces it.

## Step 13 - Atomic save with syntax check

1. Write the candidate to `/tmp/App.jsx.candidate`
2. Copy to `/tmp/App.candidate.jsx` (esbuild needs the .jsx extension)
3. Run `npx --yes esbuild@0.24.0 /tmp/App.candidate.jsx --loader:.jsx=jsx --outfile=/tmp/App.check.js`
4. If it errors, fix the syntax and retry - do NOT save a broken file
5. If it passes, `cp /tmp/App.jsx.candidate <projectPath>/src/App.jsx` (use cp not mv - cross-filesystem moves fail)
6. Vite hot-reloads the browser

## Step 14 - Report summary

5-8 bullets, plain-spoken, no corporate fluff. The user reads this with morning coffee:
- Today's date and total prospect count
- Lead status breakdown (e.g. "3 NEW, 2 IN_PROGRESS, 1 Unable to Contact")
- New cards added today (these got full enrichment - name them)
- Cancellation or reschedule signals spotted in Gmail snippets
- Prospect replies detected (buying signals)
- Any declined invites
- Any HubSpot misses or disqualify-risk flags

## Constraints

- No em-dashes - ASCII `-` only
- No spaces before semicolons
- 2-space indentation
- `deals` is always `0` in every rendered card regardless of HubSpot value
- If today's calendar has zero prospect calls, set `PROSPECTS = []` - do NOT carry over yesterday's data
- If HubSpot returns nothing for an email, use `hsLink: null` and guess company/country from the domain - never fabricate contact IDs
- Phone numbers: strip internal whitespace (`"+447907 975650"` -> `"+447907975650"`)
- companyBrief + challengerInsight + qualifierQuestions: generate only for NEW cards. Preserve existing values for carry-over cards byte-for-byte - never regenerate them
- When run by the scheduled task, the user is not present - execute autonomously and note decisions in the summary

## Step 15 - Sync GitHub repo after every confirmed change

**This step is mandatory. Run it every time App.jsx is written, or any skill file is modified.**

After the atomic save (Step 13) confirms a clean build, generate a fresh `App.jsx.template` and provide the git push commands.

### Generate the template

Run this Python block:

```python
import re, shutil

projectPath = "<projectPath>"  # from config.json

with open(f"{projectPath}/src/App.jsx") as f:
    content = f.read()

# OWNER placeholders
content = content.replace('name: "Santiago Subra"', 'name: "YOUR_NAME"')
content = content.replace('ownerId: 87191703', 'ownerId: 0')
content = content.replace('portalId: 6195055', 'portalId: 0')
content = re.sub(r'email: "[^"]+@cloudtalk\.io",\n\};', 'email: "your.email@cloudtalk.io",\n};', content)

# Generic header
content = re.sub(r'const TODAY_LABEL = "[^"]*";', 'const TODAY_LABEL = "Monday, 5 Jan 2026";', content)
content = re.sub(r'const REFRESHED_AT = "[^"]*";', "const REFRESHED_AT = \"Not yet refreshed - run 'refresh my daily briefing' in Cowork\";", content)
content = re.sub(r'const TODAY_ISO = "[^"]*";', 'const TODAY_ISO = "2026-01-05";', content)

# Generic WEEK_DAYS
content = re.sub(r'const WEEK_DAYS = \[[\s\S]*?\];',
  'const WEEK_DAYS = [\n  { iso: "2026-01-05", name: "Monday",    short: "Mon", dayNum: "5",  monthShort: "Jan" },\n  { iso: "2026-01-06", name: "Tuesday",   short: "Tue", dayNum: "6",  monthShort: "Jan" },\n  { iso: "2026-01-07", name: "Wednesday", short: "Wed", dayNum: "7",  monthShort: "Jan" },\n  { iso: "2026-01-08", name: "Thursday",  short: "Thu", dayNum: "8",  monthShort: "Jan" },\n  { iso: "2026-01-09", name: "Friday",    short: "Fri", dayNum: "9",  monthShort: "Jan" },\n];', content)

# Empty all PROSPECTS arrays
for arr in ['MONDAY_PROSPECTS','TUESDAY_PROSPECTS','WEDNESDAY_PROSPECTS','THURSDAY_PROSPECTS','FRIDAY_PROSPECTS']:
    content = re.sub(rf'(const {arr} = )\[[\s\S]*?\n\];', r'\1[];', content)
content = re.sub(r'(const LAST_WEEK_PROSPECTS = )\[[\s\S]*?\];', r'\1[];', content)
content = re.sub(r'(const TWO_WEEKS_AGO_PROSPECTS = )\[[\s\S]*?\];', r'\1[];', content)

# Update map keys to match generic WEEK_DAYS
for old, new in [('2026-05-25','2026-01-05'),('2026-05-26','2026-01-06'),
                 ('2026-05-27','2026-01-07'),('2026-05-28','2026-01-08'),('2026-05-29','2026-01-09')]:
    content = content.replace(f'"{old}":', f'"{new}":')

# Clean week comment
content = content.replace(
    '// Week of 25 May 2026 - Santiago back from OOO Mon AM. Active pipeline all 5 days. Shadda rescheduled Mon→Tue 15:30.',
    '// Current week - populated by briefing-refresh skill each morning'
)

out = f"{projectPath}/App.jsx.template.new"
with open(out, 'w') as f:
    f.write(content)
print(f"Written: {out}")
```

### Syntax check the template

```bash
npx esbuild@0.24.0 <projectPath>/App.jsx.template.new --loader:.jsx=jsx --outfile=/tmp/tcheck.js
```

If it fails, fix and retry before proceeding.

### Provide these terminal commands to Santiago

Show this block verbatim in the summary so he can run it:

```bash
cp ~/Desktop/daily-briefing/App.jsx.template.new ~/Desktop/cloudtalk-daily-briefing-repo/plugins/cloudtalk-daily-briefing/assets/App.jsx.template
cd ~/Desktop/cloudtalk-daily-briefing-repo
git add .
git commit -m "Auto-sync: daily briefing update $(date '+%d %b %Y')"
git push origin main
```

If any SKILL.md files were also updated during this session, include them in the same commit:

```bash
cp ~/Desktop/daily-briefing/briefing-refresh-SKILL-updated.md ~/Desktop/cloudtalk-daily-briefing-repo/plugins/cloudtalk-daily-briefing/skills/briefing-refresh/SKILL.md
```

### What NOT to commit

- `src/App.jsx` - contains live prospect data and personal HubSpot IDs
- `config.json` - personal credentials
- `node_modules/`

These are covered by `.gitignore` and must stay local.
