# Front-end notes

Static HTML, CSS and ES modules. No framework, no build step, no dependencies —
the files in the repository are the files the browser gets.

## Architecture

```
page.html  ──▶  assets/js/pages/<page>.js  ──▶  assets/js/api.js  ──▶  data
                        │                              
                        ├──▶  assets/js/ui.js       shell, formatters, badges, tables
                        └──▶  assets/js/charts.js   inline-SVG charts
```

Each page ships a skeleton — `#sidebar`, `#topbar`, `#main` — and its module
fills them in. Navigation is built once in `ui.js` rather than copied into eight
HTML files.

### `api.js` is the seam

**Pages never call `fetch`.** They call `listIncidents()`, `getIncident()`,
`listActions()`, `listControls()`, `getSummary()`. Today those read a bundled
JSON fixture, denormalise it once, and answer from memory. When the Worker gains
`/api/*` routes over D1, the bodies of those functions change and nothing else
does.

The function names deliberately mirror the MCP tool names in
[`mcp-server.md`](mcp-server.md). "What the assistant can ask for" and "what the
UI can show" stay the same shape — and when the MCP server gets written, its
tool list is already specified by working code.

Derived fields are computed once, in `api.js`, never in a page:

- `incident.risk_score` = likelihood × impact
- `incident.is_open`, `incident.days_open`
- `action.is_overdue`, `action.days_to_due`

"Today" is pinned to `meta.as_of` in the dataset rather than the wall clock, so
overdue actions stay overdue and the demo does not quietly heal itself.

### State lives in the URL

Every filter is reflected into the query string via `setQuery()`. Any view can be
linked to, which is what lets the dashboard heat map hand off to a filtered
register mid-demo — `/incidents/?likelihood=3&impact=4&open=1`.

## Styling

One stylesheet, custom properties for everything themeable.

Light and dark are **both selected**, not one inverted from the other: the dark
steps are chosen against the dark surface. Two scopes declare them — a
`prefers-color-scheme` media query for the OS setting, and a `data-theme` stamp
on `<html>` for the header toggle, which wins both ways. A tiny inline script in
each page's `<head>` applies the stored preference before first paint.

## Chart rules

Charts are hand-rolled inline SVG. The rules below are enforced in
`charts.js`, not left to taste:

**Colour is assigned by the job it does.**

- *Identity* — a single blue for single-series marks (categorical slot 1).
  Nothing in this app needs more than one series, which is a feature: the
  multi-series confusion risk never arises.
- *Magnitude* — a one-hue blue ramp, light to dark, for the heat map. Never a
  rainbow.
- *State* — a reserved four-step status palette (good / warning / serious /
  critical) used for severity, incident status, priority and control
  effectiveness. It is never reused as a series colour.

**Status colour never carries meaning alone.** Every badge renders a coloured dot
*and* its text label; every meter segment carries a legend entry with its label
and count. Colour is the fast channel, not the only one.

**Marks are thin and quiet.** Bars cap at 24px with a 4px rounded data end,
square at the baseline. Lines are 2px with an 8px+ end marker carrying a 2px
surface ring. Gridlines are solid hairlines one step off the surface. The data is
the only thing allowed to be loud.

**Labels are selective.** The trend line labels its endpoint, not every point;
bars label their tip; the axis and the tooltip carry the rest. A number on every
mark reads as noise and goes unread.

**Text never wears the data colour.** Values, labels and legends use text tokens;
identity comes from the coloured mark beside them. The one exception is a label
set inside a filled heat-map cell, where the text colour is picked from the
fill's luminance so it always clears contrast.

**Everything is hoverable and everything has a table.** Line, bar and heat-map
marks all carry tooltips with hit targets larger than the mark itself; every
chart offers its underlying numbers behind a "show the figures" disclosure, so
nothing is gated behind seeing colour.

The palette values are the validated reference set (categorical slot 1
`#2a78d6` light / `#3987e5` dark; the blue 100–700 sequential ramp; status
`#0ca30c` / `#fab219` / `#ec835a` / `#d03b3b`) used unchanged against the
documented surfaces `#fcfcfb` and `#1a1a19`. If you substitute a brand palette,
re-run the palette validator against your own surfaces rather than eyeballing it
— and note that the light-mode warning and serious steps sit below 3:1 on the
light surface by design, which is exactly why the icon-plus-label pairing is
mandatory.

## Accessibility

- A skip link on every page; `:focus-visible` outlines throughout.
- Sortable table headers are keyboard operable (`Enter` / `Space`) and expose
  `aria-sort`.
- Chart hit areas are focusable with descriptive `aria-label`s; heat-map cells
  are real buttons.
- Tabs expose `role="tablist"` and `aria-selected`.
- Colour is never the sole carrier of meaning — see the chart rules above.
- A print stylesheet drops the navigation and filters.

## Adding a page

1. Copy an existing page's HTML skeleton; set the `<title>` and the module src.
2. Add the route to the `NAV` array in `assets/js/ui.js`.
3. Write `assets/js/pages/<name>.js`: call `mountShell()`, then render into
   `#main` using `api.js` for data and `renderTable()` / the chart builders for
   output.

For a prose page, use `assets/js/pages/static-page.js` and put the content in
the HTML with `data-page`, `data-page-title`, `data-eyebrow` and `data-sub`
attributes on `<body>`.
