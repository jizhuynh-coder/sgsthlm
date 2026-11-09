# 時差 · Vietnam ↔ Sweden Schedule

A small website with two analogue clocks (Vietnam and Sweden) and a weekly calendar. Every event is stored once as a real moment in time and shown in both time zones, so changing the time on one side changes it on the other.

## Features

- Analogue clocks with live hands, day/night face, and upcoming events drawn as arcs
- Weekly calendar in two views:
  - **Merged**: one week with Vietnam hours on one edge and Sweden hours on the other. Unshaded hours are when you are both awake (07:00–23:00 each side).
  - **Split**: two weeks, one per country
- Click an empty hour to add an event, click an event to edit it
- The edit window has a Vietnam row and a Sweden row, linked together
- Handles daylight saving time in Sweden automatically
- Events are saved in the browser. "Copy link" shares them, and Export / Import saves a backup file.
- Light and dark mode follow the device

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page structure (must keep this exact name) |
| `style.css` | Look and layout |
| `script.js` | Clocks, calendar and time zone logic |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |
| `README.md` | This file |

## Put it on GitHub Pages

1. Create a new repository on GitHub, for example `vn-se-schedule`.
2. Click **Add file → Upload files** and drop in all the files from this folder. Make sure `index.html` is in the top level, not inside a folder.
3. Commit the upload to the `main` branch.
4. Go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
5. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/vn-se-schedule/`.

## Changing the countries

Open `script.js` and edit the first line:

```js
const VN = 'Asia/Ho_Chi_Minh', SE = 'Europe/Stockholm';
```

Use any [IANA time zone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). The labels in `index.html` and the helper functions near the top of `script.js` (`name`, `jname`) would need changing to match.
