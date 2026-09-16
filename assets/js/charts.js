/**
 * Charts — hand-rolled inline SVG, no charting library.
 *
 * House rules these builders enforce (see docs/frontend.md):
 *   · single-series marks use categorical slot 1 (blue); magnitude uses a
 *     one-hue blue ramp; the reserved status palette is only ever used for
 *     state, alongside a text label
 *   · bars cap at 24px with a 4px rounded data-end, square at the baseline
 *   · lines are 2px with an >=8px end marker carrying a 2px surface ring
 *   · gridlines are solid hairlines, one step off the surface
 *   · values are labelled selectively — the endpoint or the extreme, never
 *     every point — and every chart ships a hover tooltip plus a table view
 */

/* -------------------------------------------------------------------------- */
/* Tooltip (one element, shared by every chart on the page)                    */
/* -------------------------------------------------------------------------- */

let tooltipEl = null;

function tooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'viz-tooltip';
    tooltipEl.setAttribute('role', 'status');
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTip(event, html) {
  const tip = tooltip();
  tip.innerHTML = html;
  tip.dataset.open = 'true';
  const pad = 12;
  const box = tip.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + box.width > innerWidth - pad) x = event.clientX - box.width - pad;
  if (y + box.height > innerHeight - pad) y = event.clientY - box.height - pad;
  tip.style.left = `${Math.max(pad, x)}px`;
  tip.style.top = `${Math.max(pad, y)}px`;
}

function hideTip() {
  if (tooltipEl) tooltipEl.dataset.open = 'false';
}

/** Attach hover/focus tooltip behaviour to an SVG or DOM node. */
function bindTip(node, html) {
  node.addEventListener('mousemove', (event) => showTip(event, html));
  node.addEventListener('mouseleave', hideTip);
  node.addEventListener('blur', hideTip);
}

const svgNS = 'http://www.w3.org/2000/svg';

function make(tag, attrs = {}) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  return node;
}

/** Bar path with rounded corners on the data end only. */
function barPath(x, y, width, height, radius, end = 'right') {
  const r = Math.max(0, Math.min(radius, height / 2, width));
  if (width <= 0 || height <= 0) return '';
  if (end === 'right') {
    return `M${x},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r}`
         + ` V${y + height - r} A${r},${r} 0 0 1 ${x + width - r},${y + height} H${x} Z`;
  }
  // 'top' — for columns growing up from a baseline
  return `M${x},${y + height} V${y + r} A${r},${r} 0 0 1 ${x + r},${y}`
       + ` H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r} V${y + height} Z`;
}

const niceMax = (value) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
};

/* -------------------------------------------------------------------------- */
/* Line chart — a single series over time                                     */
/* -------------------------------------------------------------------------- */

/**
 * @param {HTMLElement} container
 * @param {{points:Array<{label:string,value:number}>, format?:Function, tipRows?:Function, yLabel?:string}} config
 */
export function lineChart(container, { points, format = String, tipRows = null, yLabel = '' }) {
  container.innerHTML = '';
  if (!points.length) return;

  const W = 720;
  const H = 230;
  const pad = { top: 16, right: 30, bottom: 28, left: 42 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const x = (i) => pad.left + (points.length === 1 ? plotW / 2 : (i * plotW) / (points.length - 1));
  const y = (v) => pad.top + plotH - (v / max) * plotH;

  const svg = make('svg', {
    class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `${yLabel || 'Value'} by month, ${points[0].label} to ${points.at(-1).label}`,
  });

  // Gridlines and y ticks — recessive, rounded to clean numbers.
  const ticks = 4;
  for (let t = 0; t <= ticks; t += 1) {
    const value = (max / ticks) * t;
    svg.append(make('line', { class: 'gridline', x1: pad.left, x2: W - pad.right, y1: y(value), y2: y(value) }));
    const label = make('text', { class: 'axis-label', x: pad.left - 8, y: y(value) + 4, 'text-anchor': 'end' });
    label.textContent = Number.isInteger(value) ? value : value.toFixed(0);
    svg.append(label);
  }

  const area = `M${x(0)},${y(0)} ` + points.map((p, i) => `L${x(i)},${y(p.value)}`).join(' ') + ` L${x(points.length - 1)},${y(0)} Z`;
  svg.append(make('path', { class: 'series-area', d: area }));
  svg.append(make('path', { class: 'series-line', d: points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ') }));

  // X labels.
  points.forEach((p, i) => {
    const label = make('text', { class: 'axis-label', x: x(i), y: H - 8, 'text-anchor': 'middle' });
    label.textContent = p.label;
    svg.append(label);
  });

  // Only the endpoint gets a direct label and a marker.
  const last = points.at(-1);
  svg.append(make('circle', { class: 'end-dot', cx: x(points.length - 1), cy: y(last.value), r: 4.5 }));
  const endLabel = make('text', {
    class: 'value-label', x: x(points.length - 1), y: y(last.value) - 12, 'text-anchor': 'end',
  });
  endLabel.textContent = format(last.value);
  svg.append(endLabel);

  // Hover layer: a full-height band per point, wider than the mark itself.
  const band = plotW / Math.max(points.length - 1, 1);
  points.forEach((p, i) => {
    const hit = make('rect', {
      class: 'hit', x: x(i) - band / 2, y: pad.top, width: band, height: plotH, tabindex: '0',
      'aria-label': `${p.label}: ${format(p.value)}`,
    });
    const crosshair = make('line', {
      class: 'crosshair', x1: x(i), x2: x(i), y1: pad.top, y2: pad.top + plotH, opacity: 0,
    });
    const dot = make('circle', { class: 'end-dot', cx: x(i), cy: y(p.value), r: 4.5, opacity: 0 });
    const rows = tipRows
      ? tipRows(p)
      : `<div class="viz-tooltip__row">${format(p.value)}</div>`;
    const html = `<div class="viz-tooltip__title">${p.label}</div>${rows}`;

    const on = () => { crosshair.setAttribute('opacity', 1); dot.setAttribute('opacity', 1); };
    const off = () => { crosshair.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); hideTip(); };
    hit.addEventListener('mouseenter', on);
    hit.addEventListener('focus', on);
    hit.addEventListener('mouseleave', off);
    hit.addEventListener('blur', off);
    hit.addEventListener('mousemove', (event) => showTip(event, html));

    svg.append(crosshair, dot, hit);
  });

  container.append(svg);
}

/* -------------------------------------------------------------------------- */
/* Horizontal bar chart — magnitude by category, one series                    */
/* -------------------------------------------------------------------------- */

/**
 * @param {HTMLElement} container
 * @param {{rows:Array<{label:string,value:number,href?:string}>, format?:Function, labelWidth?:number}} config
 */
export function barChart(container, { rows, format = String, labelWidth = 190 }) {
  container.innerHTML = '';
  if (!rows.length) {
    container.innerHTML = '<p class="empty">No data in range.</p>';
    return;
  }

  const W = 720;
  const band = 30;
  const barH = Math.min(24, band - 8);
  const H = rows.length * band + 12;
  const plotLeft = labelWidth;
  const plotW = W - plotLeft - 70;
  const max = Math.max(...rows.map((r) => r.value), 1);

  const svg = make('svg', {
    class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Bar chart: ${rows.map((r) => `${r.label} ${format(r.value)}`).join(', ')}`,
  });

  svg.append(make('line', { class: 'baseline', x1: plotLeft, x2: plotLeft, y1: 4, y2: H - 8 }));

  rows.forEach((row, i) => {
    const y = i * band + 6;
    const width = Math.max((row.value / max) * plotW, row.value > 0 ? 3 : 0);

    const label = make('text', { class: 'axis-label', x: plotLeft - 10, y: y + barH / 2 + 4, 'text-anchor': 'end' });
    label.textContent = row.label.length > 30 ? `${row.label.slice(0, 29)}…` : row.label;
    svg.append(label);

    const bar = make('path', { class: 'series-bar', d: barPath(plotLeft, y, width, barH, 4, 'right') });
    svg.append(bar);

    const value = make('text', { class: 'value-label', x: plotLeft + width + 8, y: y + barH / 2 + 4 });
    value.textContent = format(row.value);
    svg.append(value);

    const hit = make('rect', {
      class: 'hit', x: plotLeft, y, width: plotW + 60, height: barH, tabindex: '0',
      'aria-label': `${row.label}: ${format(row.value)}`,
    });
    bindTip(hit, `<div class="viz-tooltip__title">${row.label}</div><div class="viz-tooltip__row">${format(row.value)}</div>`);
    if (row.href) {
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', () => { location.href = row.href; });
    }
    svg.append(hit);
  });

  container.append(svg);
}

/* -------------------------------------------------------------------------- */
/* Risk heat map — likelihood x impact, sequential one-hue ramp                */
/* -------------------------------------------------------------------------- */

const RAMP = ['--seq-0', '--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5', '--seq-6'];

/**
 * @param {HTMLElement} container
 * @param {{cells:Array, onSelect?:Function}} config — cells from api.getSummary().heatmap
 */
export function heatmap(container, { cells, onSelect = null }) {
  const max = Math.max(...cells.map((c) => c.count), 1);
  const step = (count) => (count === 0 ? 0 : Math.min(RAMP.length - 1, 1 + Math.round((count / max) * (RAMP.length - 2))));

  const grid = document.createElement('div');
  grid.className = 'heatmap__grid';

  const rows = [5, 4, 3, 2, 1];
  for (const likelihood of rows) {
    const tick = document.createElement('div');
    tick.className = 'heatmap__tick';
    tick.textContent = likelihood;
    grid.append(tick);

    for (let impact = 1; impact <= 5; impact += 1) {
      const cell = cells.find((c) => c.likelihood === likelihood && c.impact === impact) ?? { count: 0, incidents: [] };
      const index = step(cell.count);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'heatmap__cell';
      button.dataset.count = cell.count;
      button.style.background = `var(${RAMP[index]})`;
      // Label colour picked from the fill's luminance so it always clears contrast.
      button.style.color = index >= 4 ? '#ffffff' : 'var(--ink-2)';
      button.textContent = cell.count || '';
      button.setAttribute('aria-label',
        `Likelihood ${likelihood}, impact ${impact}: ${cell.count} open incident${cell.count === 1 ? '' : 's'}`);

      if (cell.count) {
        const list = cell.incidents.slice(0, 4)
          .map((i) => `<div class="viz-tooltip__row">${i.reference} — ${i.title}</div>`).join('');
        const more = cell.incidents.length > 4
          ? `<div class="viz-tooltip__row">+${cell.incidents.length - 4} more</div>` : '';
        bindTip(button,
          `<div class="viz-tooltip__title">Likelihood ${likelihood} × impact ${impact}</div>${list}${more}`);
        if (onSelect) button.addEventListener('click', () => onSelect(cell));
      }
      grid.append(button);
    }
  }

  // X axis ticks.
  grid.append(document.createElement('div'));
  for (let impact = 1; impact <= 5; impact += 1) {
    const tick = document.createElement('div');
    tick.className = 'heatmap__tick';
    tick.textContent = impact;
    grid.append(tick);
  }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="heatmap">
      <div class="heatmap__y-title">Likelihood →</div>
      <div class="heatmap__col" style="flex:1"></div>
    </div>
    <div class="heatmap__x-title">Impact →</div>
    <div class="heatmap__scale">
      <span>Fewer</span>
      ${RAMP.map((token) => `<span class="heatmap__scale-swatch" style="background:var(${token})"></span>`).join('')}
      <span>More open incidents</span>
    </div>`;
  wrap.querySelector('.heatmap__col').append(grid);

  container.innerHTML = '';
  container.append(wrap);
}

/* -------------------------------------------------------------------------- */
/* Status meter — a state breakdown using the reserved status palette          */
/* -------------------------------------------------------------------------- */

const STATUS_TOKEN = {
  good: '--good',
  warning: '--warning',
  serious: '--serious',
  critical: '--critical',
  neutral: '--neutral',
  accent: '--series-1',
};

/**
 * @param {HTMLElement} container
 * @param {{segments:Array<{label:string,value:number,tone:string}>}} config
 */
export function statusMeter(container, { segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  const bar = document.createElement('div');
  bar.className = 'split-meter';
  for (const segment of segments) {
    if (!segment.value) continue;
    const part = document.createElement('div');
    part.className = 'split-meter__part';
    part.style.flex = `${segment.value}`;
    part.style.background = `var(${STATUS_TOKEN[segment.tone] ?? '--neutral'})`;
    part.setAttribute('role', 'img');
    part.setAttribute('aria-label', `${segment.label}: ${segment.value}`);
    bindTip(part,
      `<div class="viz-tooltip__title">${segment.label}</div>`
      + `<div class="viz-tooltip__row">${segment.value} of ${total} (${Math.round((segment.value / total) * 100)}%)</div>`);
    bar.append(part);
  }

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.style.marginTop = '0.6rem';
  legend.innerHTML = segments.map((segment) => `
    <span class="legend__item">
      <span class="legend__swatch" style="background:var(${STATUS_TOKEN[segment.tone] ?? '--neutral'})"></span>
      ${segment.label}
      <span class="muted">${segment.value}</span>
    </span>`).join('');

  container.innerHTML = '';
  container.append(bar, legend);
}
