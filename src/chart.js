// The annual forecast as a precise chart (never a pencil sketch): real amounts on the
// axis, one bar per month.
//   bars          - what is left each month (after expenses, before tax)
//   dashed line   - the monthly goal
//   lower panel   - the money in the business at the end of each month (stage 3: with
//                   the safety cushion as an amber line)
// Hover, tap or the arrow keys show one month in full.
import { html, useState, useRef, useEffect } from './lib.js';
import { fmt, monthShort, monthYear } from './calc.js';

const INK = '#2d3e66';
const MUTED = '#5f6775';
const GRID = '#ebe6dc';
const BRAND = '#0038b8';
const SKY = '#8fb3ef';
const WARN = '#a8670f';
const BAD = '#c8443a';
const FONT = 'Assistant, sans-serif';

function niceStep(range, n) {
  const raw = range / n;
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10;
}

export function useWidth(ref, fallback) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return w;
}

const short = (v, small) => (small && Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}K` : fmt(v).replace(' ₪', ''));

export function ForecastChart({ fc, goal, showCash = true }) {
  const box = useRef();
  const W = useWidth(box, 760);
  const [hover, setHover] = useState(null);
  const rows = fc.rows;
  const small = W < 520;
  const PAD = { top: 26, right: small ? 8 : 14, left: small ? 44 : 60 };
  const H1 = small ? 210 : 250;
  const H2 = showCash ? (small ? 110 : 130) : 0;
  const GAP = showCash ? 44 : 0;
  const AX = 26;
  const H = PAD.top + H1 + AX + GAP + H2 + 8;
  const iw = W - PAD.left - PAD.right;
  const slot = iw / rows.length;
  const bw = Math.max(8, Math.min(34, slot * 0.58));
  const cx = (i) => PAD.left + slot * i + slot / 2;

  // Upper panel: profit and goal.
  const pMin = Math.min(0, ...rows.map((r) => r.profit));
  const pMaxRaw = Math.max(goal || 0, ...rows.map((r) => r.profit)) * 1.08;
  const pStep = niceStep(pMaxRaw - pMin, small ? 4 : 5);
  const yMin = Math.floor(pMin / pStep) * pStep;
  const yMax = Math.ceil(pMaxRaw / pStep) * pStep;
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * H1;
  const ticks = [];
  for (let v = yMin; v <= yMax + 1; v += pStep) ticks.push(v);

  // Lower panel: the money in the business.
  const top2 = PAD.top + H1 + AX + GAP;
  const cushion = fc.cushion || 0;
  const cVals = [fc.startCash, ...rows.map((r) => r.cash), cushion];
  const cMin = Math.min(0, ...cVals);
  const cMaxRaw = Math.max(...cVals) * 1.1 || 1000;
  const cStep = niceStep(cMaxRaw - cMin, 2);
  const c0 = Math.floor(cMin / cStep) * cStep;
  const c1 = Math.ceil(cMaxRaw / cStep) * cStep;
  const y2 = (v) => top2 + (1 - (v - c0) / (c1 - c0)) * H2;
  const cTicks = [];
  for (let v = c0; v <= c1 + 1; v += cStep) cTicks.push(v);
  const cashPath = rows.map((r, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${y2(r.cash).toFixed(1)}`).join(' ');
  const startX = PAD.left + 2;
  const cashFull = `M${startX} ${y2(fc.startCash).toFixed(1)} L${cashPath.slice(1)}`;

  const pick = (clientX) => {
    const r = box.current.getBoundingClientRect();
    const i = Math.floor((clientX - r.left - PAD.left) / slot);
    setHover(i >= 0 && i < rows.length ? i : null);
  };
  const hr = hover != null ? rows[hover] : null;
  const tipLeft = hr ? Math.min(Math.max(cx(hover) - 115, 4), W - 234) : 0;
  const goalIdx = fc.goalIdx;
  // Labels with Hebrew words run right to left (the svg itself runs left to right), so
  // 'start' and 'end' keep meaning "text begins at x" and "text ends at x".
  const label = (lx, ly, text, anchor = 'middle', weight = 800, color = INK, size = 13, rtl = false) =>
    html`<text x=${lx} y=${ly} direction=${rtl ? 'rtl' : 'ltr'} text-anchor=${rtl ? { start: 'end', end: 'start' }[anchor] || anchor : anchor} font-size=${size} font-weight=${weight} fill=${color} font-family=${FONT} paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round" style="font-variant-numeric: tabular-nums">${text}</text>`;
  const last = rows.length - 1;

  return html`<div ref=${box} class="relative" dir="ltr">
    <svg
      width=${W}
      height=${H}
      viewBox=${`0 0 ${W} ${H}`}
      class="block touch-pan-y select-none rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
      role="img"
      tabindex="0"
      aria-label=${`תחזית ל-12 חודשים: בחודש הראשון נשארים ${fmt(rows[0].profit)}, בחודש האחרון ${fmt(rows[last].profit)}. היעד ${fmt(goal)} בחודש. החיצים מראים כל חודש.`}
      onPointerMove=${(e) => pick(e.clientX)}
      onPointerDown=${(e) => pick(e.clientX)}
      onPointerLeave=${() => setHover(null)}
      onBlur=${() => setHover(null)}
      onKeyDown=${(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setHover((h) => Math.max(0, Math.min(last, (h ?? -1) + (e.key === 'ArrowRight' ? 1 : -1))));
        }
      }}
    >
      ${ticks.map(
        (v) => html`<g key=${'t' + v}>
          <line x1=${PAD.left} x2=${W - PAD.right} y1=${y(v)} y2=${y(v)} stroke=${v === 0 ? '#9aa1ab' : GRID} stroke-width="1" />
          <text x=${PAD.left - 8} y=${y(v) + 4} text-anchor="end" font-size="12" font-weight="600" fill=${MUTED} font-family=${FONT} style="font-variant-numeric: tabular-nums">${short(v, small)}</text>
        </g>`,
      )}
      ${rows.map((r, i) => {
        const top = y(Math.max(0, r.profit));
        const h = Math.max(1, Math.abs(y(r.profit) - y(0)));
        const reached = goal && r.profit >= goal;
        return html`<g key=${r.key}>
          ${hover === i && html`<rect x=${PAD.left + slot * i} y=${PAD.top} width=${slot} height=${H1} fill=${INK} opacity="0.05" />`}
          <rect x=${cx(i) - bw / 2} y=${top} width=${bw} height=${h} rx="3" fill=${r.profit < 0 ? BAD : reached ? BRAND : SKY} />
          <text x=${cx(i)} y=${PAD.top + H1 + 17} text-anchor="middle" font-size=${small ? 11 : 12} font-weight="700" fill=${MUTED} font-family=${FONT}>${monthShort(r.key)}</text>
        </g>`;
      })}
      ${goal > 0 &&
      html`<g>
        <line x1=${PAD.left} x2=${W - PAD.right} y1=${y(goal)} y2=${y(goal)} stroke=${INK} stroke-width="1.5" stroke-dasharray="6 4" />
        ${label(PAD.left + 4, y(goal) - 7, `היעד ${fmt(goal)}`, 'start', 800, INK, 12, true)}
      </g>`}
      ${goalIdx >= 0 && label(cx(goalIdx), y(rows[goalIdx].profit) - 8, 'ביעד', 'middle', 800, BRAND, 12, true)}
      ${label(cx(last), y(Math.max(0, rows[last].profit)) - (goalIdx === last ? 22 : 8), fmt(rows[last].profit), 'end', 800, INK, 12)}

      ${showCash &&
      html`<g>
        ${label(W - PAD.right, top2 - 14, 'הכסף בעסק בסוף כל חודש', 'end', 800, INK, 13, true)}
        ${cTicks.map(
          (v) => html`<g key=${'c' + v}>
            <line x1=${PAD.left} x2=${W - PAD.right} y1=${y2(v)} y2=${y2(v)} stroke=${v === 0 ? '#9aa1ab' : GRID} stroke-width="1" />
            <text x=${PAD.left - 8} y=${y2(v) + 4} text-anchor="end" font-size="12" font-weight="600" fill=${MUTED} font-family=${FONT} style="font-variant-numeric: tabular-nums">${short(v, small)}</text>
          </g>`,
        )}
        ${cushion > 0 &&
        html`<g>
          <line x1=${PAD.left} x2=${W - PAD.right} y1=${y2(cushion)} y2=${y2(cushion)} stroke=${WARN} stroke-width="1.5" stroke-dasharray="6 4" />
          ${label(W - PAD.right - 2, y2(cushion) - 6, `כרית ביטחון ${fmt(cushion)}`, 'end', 700, WARN, 12, true)}
        </g>`}
        <path d=${cashFull} fill="none" stroke=${BRAND} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        <circle cx=${startX} cy=${y2(fc.startCash)} r="4" fill="#fff" stroke=${BRAND} stroke-width="2.5" />
        ${label(startX + 6, y2(fc.startCash) - 8, `היום ${fmt(fc.startCash)}`, 'start', 700, INK, 12, true)}
        ${fc.minRow.cash < fc.startCash && html`<circle cx=${cx(rows.indexOf(fc.minRow))} cy=${y2(fc.minRow.cash)} r="4.5" fill="#fff" stroke=${fc.minRow.cash < 0 ? BAD : BRAND} stroke-width="2.5" />`}
        <circle cx=${cx(last)} cy=${y2(rows[last].cash)} r="4" fill=${BRAND} stroke="#fff" stroke-width="2" />
        ${label(cx(last), y2(rows[last].cash) + 18, fmt(rows[last].cash), 'end', 800, INK, 12)}
        ${hover != null && html`<circle cx=${cx(hover)} cy=${y2(rows[hover].cash)} r="5" fill=${BRAND} stroke="#fff" stroke-width="2" />`}
      </g>`}
    </svg>
    ${hr &&
    html`<div dir="rtl" class="pointer-events-none absolute top-0 z-10 w-[230px] rounded-xl bg-ink px-3 py-2 text-white shadow-xl" style=${{ left: `${tipLeft}px` }}>
      <p class="text-[12px] font-bold text-brand-300">${monthYear(hr.key)} · צפי</p>
      <p class="font-display text-[18px] font-extrabold">נשאר ${fmt(hr.profit)}</p>
      <p class="flex justify-between gap-2 text-[12px]"><span>הכנסות</span><span class="tabular-nums">${fmt(hr.income)}</span></p>
      <p class="flex justify-between gap-2 text-[12px]"><span>עלויות והוצאות</span><span class="tabular-nums">${fmt(-(hr.cogs + hr.fixed))}</span></p>
      ${hr.vat > 1 && html`<p class="flex justify-between gap-2 text-[12px] text-brand-300"><span>מע"מ שעובר למדינה</span><span class="tabular-nums">${fmt(hr.vat)}</span></p>`}
      ${showCash && html`<p class="mt-1 flex justify-between gap-2 border-t border-white/20 pt-1 text-[12px]"><span>בעסק בסוף החודש</span><span class="tabular-nums">${fmt(hr.cash)}</span></p>`}
    </div>`}
  </div>`;
}

export function ForecastLegend({ cushion }) {
  const item = (mark, label) => html`<li class="flex items-center gap-1.5">${mark}${label}</li>`;
  return html`<ul class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold text-muted" aria-label="מקרא">
    ${item(html`<span class="h-3 w-3 rounded-sm bg-[#8fb3ef]"></span>`, 'נשאר בחודש, מתחת ליעד')}
    ${item(html`<span class="h-3 w-3 rounded-sm bg-brand-600"></span>`, 'ביעד')}
    ${item(html`<span class="w-5 border-t-2 border-dashed border-ink"></span>`, 'היעד')}
    ${item(html`<span class="h-[3px] w-5 rounded bg-brand-600"></span>`, 'הכסף בעסק')}
    ${cushion > 0 && item(html`<span class="w-5 border-t-2 border-dashed border-warn"></span>`, 'כרית ביטחון')}
  </ul>`;
}

export function ForecastTable({ fc, goal }) {
  const lic = fc.rows.some((r) => r.vat > 1);
  return html`<div class="thin-scroll overflow-x-auto">
    <table class="w-full min-w-[560px] text-[14px]">
      <thead>
        <tr class="text-[12px] font-bold text-muted">
          <th class="pb-1.5 text-start">חודש</th>
          <th class="pb-1.5 text-start">הכנסות</th>
          ${lic && html`<th class="pb-1.5 text-start">מע"מ</th>`}
          <th class="pb-1.5 text-start">עלויות והוצאות</th>
          <th class="pb-1.5 text-start">נשאר</th>
          <th class="pb-1.5 text-start">בעסק</th>
        </tr>
      </thead>
      <tbody>
        ${fc.rows.map(
          (r) => html`<tr key=${r.key} class="border-t border-line tabular-nums">
            <td class="py-1.5 font-bold">${monthYear(r.key)}</td>
            <td class="py-1.5">${fmt(r.income)}</td>
            ${lic && html`<td class="py-1.5 text-muted">${fmt(r.vat)}</td>`}
            <td class="py-1.5">${fmt(r.cogs + r.fixed)}</td>
            <td class=${'py-1.5 font-display font-extrabold ' + (r.profit >= goal ? 'text-brand-600' : '')}>${fmt(r.profit)}</td>
            <td class=${'py-1.5 ' + (r.cash < 0 ? 'font-bold text-error' : '')}>${fmt(r.cash)}</td>
          </tr>`,
        )}
        <tr class="border-t-2 border-ink/30 font-bold tabular-nums">
          <td class="py-2">כל השנה</td>
          <td class="py-2">${fmt(fc.yearIncome)}</td>
          ${lic && html`<td class="py-2 text-muted">${fmt(fc.yearGross - fc.yearIncome)}</td>`}
          <td class="py-2">${fmt(fc.rows.reduce((x, r) => x + r.cogs + r.fixed, 0))}</td>
          <td class="py-2 font-display font-extrabold">${fmt(fc.yearProfit)}</td>
          <td class="py-2"></td>
        </tr>
      </tbody>
    </table>
  </div>`;
}
