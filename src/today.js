// Step 5, part 1 "המצב היום": a guided list of short sections (one open at a time, the
// rest folded into one line each), with a live summary on the side. The setup and
// expense tables are the finance center's, with what FlowBiz gives marked as saved.
import { html, useState, useRef, useEffect, Icon, PencilCheck, cx } from './lib.js';
import { Button, StepHeading, InlineEdit, How, CalcLines } from './components.js';
import { Field, Tag, Sheet, NumEdit, Num } from './ui.js';
import { TODAY, PARTS, FREQS, sharkExpensesFor, sharkSetupFor, DEMO_REPORT, nextId, g, stageOf, fbSwitchOf, needOf, NEED_LABEL, mustSetupFor, mustExpensesFor } from './data.js';
import {
  fmt, num, monthName, monthYear, monthlyCost, FORECAST_MONTHS, setupSummary, itemLeft, savedOf, todayAvg, runway,
  fixedMonthly, isLicensed, cushionTarget, addMonth,
} from './calc.js';
import { Money, YesNo } from './parts.js';

const cell = (label, node, cls = '') => html`<div class=${cx('min-w-0', cls)}><span class="block text-[12px] font-bold text-muted md:hidden">${label}</span>${node}</div>`;
// What FlowBiz will build: a plain note in the row (future tense: the steps are still ahead).
const Saved = () => html`<span class="text-[14px] font-bold text-muted">${g('תחסוך', 'תחסכי')} עם FlowBiz</span>`;

// On a row that has a FlowBiz way ("פתיחת תיק אצל רואה חשבון", "הנהלת חשבונות"): a small
// button that opens it, with the market price, and switches the row. On the FlowBiz row:
// a way back. So the choice can always be changed.
function FbSwitch({ sw, onSwitch }) {
  const [open, setOpen] = useState(false);
  if (!sw) return null;
  if (sw.to === 'base')
    return html`<button type="button" class="text-[12px] font-bold text-muted hover:underline cursor-pointer" onClick=${() => onSwitch(sw.base)}>לחזור ל${sw.base.name}</button>`;
  const fb = sw.fb;
  return html`<div>
    <button type="button" aria-expanded=${open} class="inline-flex h-7 items-center gap-1 text-[12px] font-bold text-brand-600 hover:underline cursor-pointer" onClick=${() => setOpen(!open)}><${Icon} name="piggy-bank" size=${13} />לחסוך עם FlowBiz</button>
    ${open &&
    html`<div class="rise mt-1 max-w-[420px] rounded-lg bg-canvas px-3 py-2 text-[13px]">
      <p class="font-bold text-ink">${fb.name} · <span class="tabular-nums">${fb.shown}</span></p>
      <p class="text-muted">${fb.pitch}</p>
      <p class="text-muted">${fb.market}</p>
      <button type="button" class="mt-1 inline-flex h-8 items-center gap-1 rounded-lg border-[1.5px] border-brand-300 bg-white px-2.5 text-[13px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${() => onSwitch(fb)}><${Icon} name="repeat" size=${13} />להחליף לזה</button>
    </div>`}
  </div>`;
}

// The shark's suggestions: every one that fits shows, and "עוד הצעות" brings 4 more on each
// click (in production the model writes new ones every time: no limit). A suggestion with a
// FlowBiz way to get it has a small "לחסוך עם FlowBiz" button that opens it, with the
// market price beside it, in the same plain look.
const BATCH = 4;
function SharkCard({ x, label, onAdd }) {
  return html`<button type="button" class="flex min-h-[56px] items-start gap-2 rounded-xl border-[1.5px] border-brand-300 bg-white px-3 py-2 text-start hover:bg-brand-50 cursor-pointer" onClick=${() => onAdd(x)}>
    <span class="mt-0.5 shrink-0 text-brand-600"><${Icon} name="plus" size=${16} /></span>
    <span class="min-w-0 flex-1">
      <span class="flex items-baseline justify-between gap-2"><b class="text-[14px] text-brand-600">${x.name}</b><b class="shrink-0 text-[14px] tabular-nums text-ink">${label(x)}</b></span>
      <small class="block text-[12px] leading-snug text-muted"><span class=${cx('font-bold', x.need === 1 ? 'text-ink' : '')}>${NEED_LABEL[x.need || 3]}</span>${x.note ? ` · ${x.note}` : ''}</small>
    </span>
  </button>`;
}
function SharkChips({ title, items, onAdd, label }) {
  const [more, setMore] = useState(0);
  const base = items.filter((x) => !x.extra);
  const extra = items.filter((x) => x.extra);
  const list = [...base, ...extra.slice(0, more)];
  const left = extra.length - Math.min(more, extra.length);
  if (!items.length) return null;
  return html`<div class="mt-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3">
    <p class="mb-1 flex items-center gap-2 text-[14px] font-bold"><img src="assets/shark/shark-thinking-sm.svg" alt="" class="h-6 w-6 rounded-full bg-white" />${title}</p>
    <p class="mb-2 text-[12px] text-muted">מסודר מהדחוף למה שיכול לחכות. מחירי שוק כולל מע"מ, נובמבר 2026, אלא אם כתוב "+ מע"מ". אחרי שמוסיפים אפשר לשנות כל סכום.</p>
    ${list.length > 0 && html`<div class="grid gap-2 sm:grid-cols-2">${list.map((x) => html`<${SharkCard} key=${x.name} x=${x} label=${label} onAdd=${onAdd} />`)}</div>`}
    <button type="button" class="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg px-1 text-[14px] font-bold text-brand-600 hover:underline cursor-pointer" onClick=${() => setMore(more + BATCH)}>
      <${Icon} name="plus" size=${15} />עוד הצעות
    </button>
    ${left <= 0 && more > 0 && html`<p class="text-[13px] text-muted">הכריש עבר על כל מה שמתאים לעסק כמו שלך. אם חסר משהו, אפשר להוסיף שורה משלך.</p>`}
  </div>`;
}

const Trash = ({ name, onClick }) => html`<button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-error-50 hover:text-error cursor-pointer" aria-label=${`מחיקת ${name || 'השורה'}`} title="מחיקה" onClick=${onClick}><${Icon} name="trash-2" size=${17} /></button>`;

// ---------- the setup table (the finance center's "תקציב ההקמה") ----------

const SETUP_COLS = 'md:grid-cols-[minmax(0,1fr)_112px_112px_104px_84px]';

function SetupRow({ x, set, remove, sw }) {
  const over = (x.spent || 0) - (x.planned || 0);
  const left = itemLeft(x);
  return html`<li class=${cx('grid grid-cols-4 items-end gap-x-2 gap-y-2 border-t border-line py-3 md:items-center md:gap-x-3', SETUP_COLS)}>
    <div class="col-span-4 flex min-w-0 items-center gap-2.5 md:col-span-1">
      <span class="fb-chip-ic h-9 w-9 shrink-0"><${Icon} name=${x.icon || 'package'} size=${17} /></span>
      <span class="min-w-0">
        <${InlineEdit} value=${x.name} placeholder="שם הפריט" onSave=${(v) => set({ name: v })} class=${cx('min-w-0 text-[15px] font-bold leading-tight', x.done && 'text-muted')} />
        ${!x.done && html`<${FbSwitch} sw=${sw} onSwitch=${(y) => set({ name: y.name, icon: y.icon || x.icon, planned: y.planned })} />`}
      </span>
      ${over > 0 && html`<${Tag} tone="fix">חריגה ${fmt(over)}<//>`}
      <span class="flex-1"></span>
      <span class="md:hidden"><${Trash} name=${x.name} onClick=${remove} /></span>
    </div>
    ${cell('תכננת', html`<${NumEdit} value=${x.planned} label=${`תכננת ל${x.name || 'הפריט'}`} onSave=${(v) => set({ planned: v })} quiet class="text-[16px]" />`)}
    ${cell('שולם', html`<${NumEdit} value=${x.spent || 0} label=${`שולם על ${x.name || 'הפריט'}`} onSave=${(v) => set({ spent: v })} quiet class=${cx('text-[16px]', over > 0 && '!text-error')} />`)}
    ${cell('נשאר לשלם', html`<span class=${cx('font-display text-[16px] font-extrabold tabular-nums', left ? 'text-ink' : 'text-faint')}>${fmt(left)}</span>`)}
    <div class="flex items-center justify-end gap-1">
      <div class="flex flex-col items-center md:block"><span class="block text-[12px] font-bold text-muted md:hidden">שולם במלואו</span><button
        type="button"
        role="checkbox"
        aria-checked=${!!x.done}
        aria-label=${`${x.name || 'הפריט'}: שולם במלואו`}
        onClick=${() => set(x.done ? { done: false } : { done: true, spent: Math.max(x.spent || 0, x.planned || 0) })}
        class="inline-flex h-10 items-center gap-2 rounded-lg px-1.5 text-[14px] font-bold text-ink hover:bg-brand-50 cursor-pointer"
      >
        <span class=${cx('grid h-6 w-6 place-items-center rounded-md border-2 bg-white', x.done ? 'border-ink' : 'border-line')}>${x.done && html`<${PencilCheck} size=${16} color="#0038b8" weight=${3} />`}</span>
      </button></div>
      <span class="max-md:hidden"><${Trash} name=${x.name} onClick=${remove} /></span>
    </div>
  </li>`;
}

// What FlowBiz builds, once the user added it: the market price in "תכננת", and "חסכת עם
// FlowBiz" across the rest. Not counted.
function SavedRow({ x, remove }) {
  return html`<li class=${cx('grid grid-cols-4 items-center gap-x-2 gap-y-2 border-t border-line py-3 md:gap-x-3', SETUP_COLS)}>
    <div class="col-span-4 flex min-w-0 items-center gap-2.5 md:col-span-1">
      <span class="fb-chip-ic h-9 w-9 shrink-0"><${Icon} name=${x.icon || 'package'} size=${17} /></span>
      <b class="min-w-0 text-[15px]">${x.name}</b>
      <span class="flex-1"></span>
      <span class="md:hidden"><${Trash} name=${x.name} onClick=${remove} /></span>
    </div>
    ${cell('תכננת', html`<span class="font-display text-[16px] font-extrabold tabular-nums">${fmt(x.value)}</span>`)}
    <div class="col-span-3 flex items-center justify-between gap-2 md:col-span-3"><${Saved} /><span class="max-md:hidden"><${Trash} name=${x.name} onClick=${remove} /></span></div>
  </li>`;
}

function BudgetSlider({ s, b, setBudget }) {
  const [draft, setDraft] = useState(null);
  const v = draft ?? s.setupBudget ?? 0;
  const max = Math.max(20000, Math.ceil((b.allocated * 2) / 5000) * 5000, Math.ceil((s.bank.amount || 0) / 5000) * 5000);
  const free = v - b.allocated - b.over;
  const status =
    s.setupBudget == null && draft == null
      ? `כמה כסף ${g('אתה שם', 'את שמה')} בצד להקמת העסק? אפשר לגרור, או ללחוץ על המספר ולכתוב.`
      : !s.budgetSet && draft == null && s.bank.amount != null && s.setupBudget === s.bank.amount
        ? `התחלנו מכל הכסף שיש לעסק היום (${fmt(s.bank.amount)}). אפשר להוריד: מה שלא בתקציב נשאר פנוי לחודשים הבאים.`
        : b.allocated > v
        ? html`<span class="text-error">הפריטים עוברים את התקציב ב-${fmt(b.allocated - v)}.</span>`
        : free > 0
          ? `חולקו לפריטים ${fmt(b.allocated)}. עוד ${fmt(free)} לא חולקו, ונספרים ב"נשאר לשלם".`
          : 'כל התקציב חולק לפריטים.';
  return html`<div class="rounded-[14px] bg-canvas px-4 pb-3 pt-3.5">
    <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <span class="text-[13px] font-bold text-muted">סך תקציב ההקמה</span>
        <div class="mt-1 min-h-[46px]">
          ${draft != null
            ? html`<span class="font-display text-[36px] font-extrabold leading-none text-ink md:text-[46px]">${fmt(draft)}</span>`
            : html`<${NumEdit} value=${s.setupBudget} label="סך תקציב ההקמה" onSave=${setBudget} class="text-[36px] leading-none md:text-[46px]" />`}
        </div>
      </div>
      <p class="max-w-[360px] text-[13px] font-semibold text-muted">${status}</p>
    </div>
    <input
      type="range"
      min="0"
      max=${max}
      step="100"
      value=${v}
      aria-label="סך תקציב ההקמה"
      aria-valuetext=${fmt(v)}
      onInput=${(e) => setDraft(Number(e.target.value))}
      onChange=${(e) => {
        setDraft(null);
        setBudget(Number(e.target.value));
      }}
      class="fb-range mt-4 w-full"
      style=${{ '--p': `${(Math.min(v, max) / max) * 100}%` }}
    />
    <div class="mt-1 flex justify-between text-[12px] font-bold text-muted"><span>0 ₪</span><span>${fmt(max)}</span></div>
  </div>`;
}

function SetupTable({ s, up }) {
  const b = setupSummary(s);
  const withBudget = b.withBudget;
  const max = Math.max(b.budget, b.final) || 1;
  const pct = (v) => `${(v / max) * 100}%`;
  const set = (id) => (patch) => up((d) => Object.assign(d.setup.find((x) => x.id === id), patch));
  const remove = (x) => up((d) => (d.setup = d.setup.filter((y) => y.id !== x.id)), `${x.name || 'הפריט'} נמחק`);
  const add = (x = {}) => up((d) => d.setup.push({ id: nextId('s'), name: '', icon: 'package', planned: null, spent: 0, done: false, ...x }), x.name ? `${x.name} נוסף` : undefined);
  const have = new Set(s.setup.map((x) => x.name));
  const total = (n) => html`<${Num} n=${n} class="text-[15px] md:text-[17px]" />`;
  return html`<div>
    ${withBudget && html`<${BudgetSlider} s=${s} b=${b} setBudget=${(v) => up((d) => ((d.setupBudget = v), (d.budgetSet = true)))} />`}
    ${b.overBudget > 0 &&
    html`<div role="status" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-error-50 px-3.5 py-2.5">
      <p class="flex min-w-0 grow basis-[260px] items-start gap-2 text-[14px] text-ink"><${Icon} name="triangle-alert" size=${17} class="mt-0.5 shrink-0 text-error" /><b class="text-error">${fmt(b.overBudget)} מעל התקציב</b></p>
      <button type="button" onClick=${() => up((d) => (d.setupBudget = b.final))} class="shrink-0 text-[13px] font-bold text-brand-600 hover:underline cursor-pointer">להגדיל את התקציב ל-${fmt(b.final)}</button>
    </div>`}
    <dl class=${cx('mt-4 grid gap-3', withBudget && s.setupBudget != null ? 'grid-cols-3' : 'grid-cols-2')}>
      <div><dt class="flex items-center gap-1.5 text-[13px] font-bold text-muted"><span class="h-2.5 w-2.5 rounded-sm bg-brand-600"></span>שולם</dt><dd class="font-display text-[20px] font-extrabold md:text-[24px]">${fmt(b.spent)}</dd></div>
      <div><dt class="flex items-center gap-1.5 text-[13px] font-bold text-muted"><span class="h-2.5 w-2.5 rounded-sm bg-brand-300"></span>נשאר לשלם</dt><dd class="font-display text-[20px] font-extrabold md:text-[24px]">${fmt(b.remaining)}</dd></div>
      ${withBudget &&
      s.setupBudget != null &&
      html`<div>
        <dt class="text-[13px] font-bold text-muted">בסוף ההקמה</dt>
        <dd class="font-display text-[20px] font-extrabold md:text-[24px]">${fmt(b.final)}</dd>
        <dd class=${cx('text-[12px] font-bold', b.overBudget > 0 ? 'text-error' : 'text-money')}>${b.overBudget > 0 ? `${fmt(b.overBudget)} מעל התקציב` : b.final < b.budget ? `${fmt(b.budget - b.final)} פחות מהתקציב` : 'בדיוק לפי התקציב'}</dd>
      </div>`}
    </dl>
    ${(b.final > 0 || b.budget > 0) &&
    html`<div class=${cx('relative mb-2 mt-4', withBudget && 'pb-5')} aria-hidden="true">
      <div class="relative flex h-3.5 gap-[2px] overflow-hidden rounded-full bg-line">
        <span class="h-full bg-brand-600" style=${{ width: pct(b.spent) }}></span>
        <span class="h-full bg-brand-300" style=${{ width: pct(b.remaining) }}></span>
      </div>
      ${withBudget &&
      b.budget > 0 &&
      html`<span class="absolute top-[-3px] flex flex-col items-center" style=${{ right: pct(b.budget), transform: 'translateX(50%)' }}>
        <span class="h-5 w-[2px] rounded bg-ink"></span>
        <span class="mt-0.5 whitespace-nowrap text-[11px] font-bold text-ink">התקציב</span>
      </span>`}
    </div>`}

    <div class=${cx('mt-4 hidden pb-2 text-[12px] font-bold text-muted md:grid md:gap-x-3', SETUP_COLS)}>
      <span>פריט</span><span>תכננת</span><span>שולם</span><span>נשאר לשלם</span><span class="text-end">שולם במלואו</span>
    </div>
    <ul>${s.setup.map((x) => (x.flowbiz ? html`<${SavedRow} key=${x.id} x=${x} remove=${() => remove(x)} />` : html`<${SetupRow} key=${x.id} x=${x} set=${set(x.id)} remove=${() => remove(x)} sw=${fbSwitchOf(x.name, s, 'setup')} />`))}</ul>
    ${!s.setup.length && html`<p class="border-t border-line py-4 text-center text-[14px] text-muted">עוד אין פריטים. אפשר להוסיף פריט, או להתחיל מההצעות של הכריש.</p>`}
    <div class=${cx('grid grid-cols-4 items-center gap-x-2 gap-y-1 border-t-2 border-ink/70 pt-3 md:gap-x-3', SETUP_COLS)}>
      <b class="col-span-4 text-[15px] md:col-span-1">סך הכול בפריטים</b>
      ${cell('תכננת', total(b.allocated))}
      ${cell('שולם', total(b.spent))}
      ${cell('נשאר לשלם', total(b.remaining))}
    </div>
    ${s.setup.some((x) => x.flowbiz) && html`<p class="mt-1 text-[12px] text-muted">לא כולל ${s.setup.filter((x) => x.flowbiz).map((x) => x.name).join(' ו')}, ש-FlowBiz בונה: המחיר בשוק (${fmt(savedOf(s.setup.filter((x) => x.flowbiz)))}) לא נספר.</p>`}
    <button type="button" onClick=${() => add()} class="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-brand-300 text-[14px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer"><${Icon} name="plus" size=${16} />פריט להקמה</button>
    <${SetupMust} s=${s} up=${up} />
    <${SharkChips}
      title=${`הכריש: ${g('יועצי', 'יועצות')} שיווק בדרך כלל מוציאים בהקמה גם על`}
      items=${sharkSetupFor(s).filter((x) => !have.has(x.name) && !(mustReady(s, s.stage === 'setup' ? 'setup' : 'setupDone') && mustSetupFor(s).some((y) => y.name === x.name)))}
      label=${(x) => x.shown || fmt(x.planned)}
      onAdd=${(x) => add(x.flowbiz ? { name: x.name, icon: x.icon, flowbiz: true, value: x.value, planned: null, spent: 0 } : { name: x.name, icon: x.icon, planned: x.planned })}
    />

  </div>`;
}

// ---------- what the business must have ----------
// The shark checks the list for the must-haves that are missing, and makes sure each one
// fits: in the setup budget (stage 1), or in how long the money lasts (fixed expenses).
// If it does not fit, it offers to drop something that can wait instead.

const canWaitSetup = (s) => s.setup.filter((x) => !x.flowbiz && !x.done && itemLeft(x) > 0 && needOf(x.name) === 3);
const canWaitExp = (s) => s.expenses.filter((x) => !x.flowbiz && x.category !== 'marketing' && x.category !== 'gov' && needOf(x.name) === 3);
const plainOf = ({ note, stages, extra, fb, shown, pitch, market, need, ...x }) => x;

// Stage 1: does the new item fit the budget? If not, the item that can wait that covers the gap
// best (the smallest that covers it all, or else the biggest), and what the budget still lacks.
function setupFit(s, x) {
  const b = setupSummary(s);
  const amt = x.planned || 0;
  const free = b.withBudget && s.setupBudget != null ? s.setupBudget - b.final : Infinity;
  if (amt <= free) return { ok: true, free: free - amt };
  const over = amt - Math.max(0, free);
  const pool = canWaitSetup(s).map((y) => ({ y, save: itemLeft(y) }));
  const cover = pool.filter((o) => o.save >= over).sort((a, b2) => a.save - b2.save)[0] || pool.sort((a, b2) => b2.save - a.save)[0];
  return { ok: false, over, drop: cover || null, raise: Math.max(0, over - (cover ? cover.save : 0)) };
}
// Fixed expenses: if with the new one the money lasts under 3 months, what can wait instead:
// the smallest expense that covers the new one, or else the biggest, and only if it changes
// the picture (at least a week more).
function expFit(s, x) {
  const add = (d) => ({ ...d, expenses: [...d.expenses, { id: 'tmp', start: 'now', ...plainOf(x) }] });
  const before = runway(s);
  const after = runway(add(s));
  if (!after || after.months >= 3 || fixedMonthly(s) <= 0) return { ok: true, after };
  const cost = monthlyCost(plainOf(x));
  const pool = canWaitExp(s).map((y) => ({ y, save: monthlyCost(y), rw: runway(add({ ...s, expenses: s.expenses.filter((e) => e.id !== y.id) })) }));
  const best = pool.filter((o) => o.save >= cost).sort((a, b) => a.save - b.save)[0] || pool.sort((a, b) => b.save - a.save)[0];
  return { ok: false, before, after, drop: best && best.rw.months - after.months >= 0.25 ? best : null };
}

// Shown only once the user has finished filling the section (pressed "המשך" once): the
// first press with a must-have missing keeps the section open and brings up this box.
const mustReady = (s, id) => (s.seen || []).includes(id);
function MustHave({ id, items, children }) {
  if (!items.length) return null;
  return html`<div id=${id} class="rise mt-4 scroll-mt-24 rounded-xl border-[1.5px] border-warn/40 bg-warn-50 p-3">
    <p class="mb-2 flex items-center gap-2 text-[14px] font-bold"><img src="assets/shark/shark-alert-sm.svg" alt="" class="h-6 w-6 rounded-full bg-white" />הכריש: לפני שממשיכים, חסר משהו שהעסק חייב</p>
    <ul class="flex flex-col gap-2">${children}</ul>
    <p class="mt-2 text-[12px] text-muted">אפשר גם להמשיך בלי זה, ולחזור לכאן אחר כך.</p>
  </div>`;
}
const mustBtn = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold cursor-pointer';
function MustRow({ x, amount, why, actions }) {
  return html`<li class="rounded-lg bg-white p-2.5 ring-1 ring-line">
    <p class="flex items-baseline justify-between gap-2"><b class="text-[15px]">${x.name}</b><b class="shrink-0 tabular-nums">${amount}</b></p>
    <p class="text-[13px] text-muted">${x.note}</p>
    <p class="mt-1 text-[13px]">${why}</p>
    <div class="mt-2 flex flex-wrap gap-2">
      ${actions.map(([label, icon, onClick, main], i) => html`<button key=${i} type="button" class=${cx(mustBtn, main ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border-[1.5px] border-brand-300 bg-white text-brand-600 hover:bg-brand-50')} onClick=${onClick}><${Icon} name=${icon} size=${14} />${label}</button>`)}
    </div>
  </li>`;
}

function SetupMust({ s, up }) {
  const list = mustReady(s, s.stage === 'setup' ? 'setup' : 'setupDone') ? mustSetupFor(s) : [];
  const addIt = (d, x) => d.setup.push({ id: nextId('s'), name: x.name, icon: x.icon, planned: x.planned, spent: 0, done: false });
  return html`<${MustHave} id="must-setup" items=${list}>
    ${list.map((x) => {
      const fit = setupFit(s, x);
      if (fit.ok)
        return html`<${MustRow} key=${x.name} x=${x} amount=${fmt(x.planned)}
          why=${fit.free !== Infinity ? `נכנס בתקציב: אחרי זה נשארים ${fmt(fit.free)} פנויים.` : 'בלי זה קשה להתקדם, אז כדאי שיהיה ברשימה.'}
          actions=${[['להוסיף', 'plus', () => up((d) => addIt(d, x), `${x.name} נוסף`), true]]} />`;
      const acts = [];
      if (fit.drop)
        acts.push([`להוסיף, ולוותר על ${fit.drop.y.name}${fit.raise > 0 ? ` ולהגדיל ב-${fmt(fit.raise)}` : ''}`, 'arrow-left-right', () => up((d) => {
          d.setup = d.setup.filter((y) => y.id !== fit.drop.y.id);
          addIt(d, x);
          if (fit.raise > 0) { d.setupBudget = (d.setupBudget || 0) + fit.raise; d.budgetSet = true; }
        }, `${x.name} נוסף, ${fit.drop.y.name} ירד`), true]);
      acts.push([`להוסיף ולהגדיל את התקציב ב-${fmt(fit.over)}`, 'plus', () => up((d) => { addIt(d, x); d.setupBudget = (d.setupBudget || 0) + fit.over; d.budgetSet = true; }, `${x.name} נוסף, התקציב גדל`), !fit.drop]);
      return html`<${MustRow} key=${x.name} x=${x} amount=${fmt(x.planned)}
        why=${html`חסרים לזה <b>${fmt(fit.over)}</b> בתקציב.${fit.drop ? html` <b>${fit.drop.y.name}</b> (${fmt(fit.drop.save)}) פחות דחוף ויכול לחכות.` : ' אין פריט שאפשר לוותר עליו בינתיים.'}`}
        actions=${acts} />`;
    })}
  <//>`;
}

function ExpensesMust({ s, up }) {
  const list = mustReady(s, 'expenses') ? mustExpensesFor(s) : [];
  const addIt = (d, x) => d.expenses.push({ id: nextId('x'), start: 'now', ...plainOf(x) });
  return html`<${MustHave} id="must-expenses" items=${list}>
    ${list.map((x) => {
      const fit = expFit(s, x);
      const amount = `${fmt(x.amount)} ${per(x.freq)}`;
      if (fit.ok)
        return html`<${MustRow} key=${x.name} x=${x} amount=${amount}
          why=${fit.after && fixedMonthly(s) > 0 ? `גם עם זה, בלי הכנסה הכסף מחזיק ${spanOf(fit.after)}.` : 'בלי זה קשה להתקדם, אז כדאי שיהיה ברשימה.'}
          actions=${[['להוסיף', 'plus', () => up((d) => addIt(d, x), `${x.name} נוסף`), true]]} />`;
      const acts = [];
      if (fit.drop)
        acts.push([`להוסיף, ולוותר על ${fit.drop.y.name}`, 'arrow-left-right', () => up((d) => { d.expenses = d.expenses.filter((y) => y.id !== fit.drop.y.id); addIt(d, x); }, `${x.name} נוסף, ${fit.drop.y.name} ירד`), true]);
      acts.push(['רק להוסיף', 'plus', () => up((d) => addIt(d, x), `${x.name} נוסף`), !fit.drop]);
      return html`<${MustRow} key=${x.name} x=${x} amount=${amount}
        why=${html`בלי הכנסה הכסף מחזיק היום ${spanOf(fit.before)}, ועם זה רק <b>${spanOf(fit.after)}</b>.${fit.drop ? html` במקום זה אפשר לוותר בינתיים על <b>${fit.drop.y.name}</b> (${fmt(fit.drop.save)} בחודש), ואז ${spanOf(fit.drop.rw)}.` : ' אין הוצאה שיכולה לחכות ושמשנה את התמונה, אז זה נשאר בחוסר. כדאי לבדוק איך מכניסים עוד כסף לעסק.'}`}
        actions=${acts} />`;
    })}
  <//>`;
}

// ---------- the fixed expenses ----------

const EXP_COLS = 'md:grid-cols-[minmax(0,1fr)_112px_112px_128px_36px]';
const selCls = 'h-9 w-full rounded-lg border-[1.5px] border-line bg-white px-2 text-[14px] cursor-pointer outline-none focus:border-brand-600';
const per = (f) => (f === 'weekly' ? 'בשבוע' : f === 'yearly' ? 'בשנה' : 'בחודש');

function ExpenseRow({ x, set, remove, sw, onSwitch }) {
  return html`<li class=${cx('grid grid-cols-2 items-end gap-x-2 gap-y-2 border-t border-line py-3 md:items-center md:gap-x-3', EXP_COLS)}>
    <div class="col-span-2 flex min-w-0 items-center gap-2.5 md:col-span-1">
      <span class="min-w-0">
        <${InlineEdit} value=${x.name} placeholder="שם ההוצאה" onSave=${(v) => set({ name: v })} class="min-w-0 text-[15px] font-bold leading-tight" />
        ${x.sub && html`<small class="block text-[12px] leading-snug text-muted">${x.sub}</small>`}
        <${FbSwitch} sw=${sw} onSwitch=${onSwitch} />
      </span>
      <span class="flex-1"></span>
      <span class="md:hidden"><${Trash} name=${x.name} onClick=${remove} /></span>
    </div>
    ${cell('סכום', html`<${NumEdit} value=${x.amount} label=${`סכום ${x.name || 'ההוצאה'}`} onSave=${(v) => set({ amount: v })} quiet class="text-[16px]" />${x.amount != null && x.freq !== 'monthly' && html`<small class="block text-[12px] text-muted">= ${fmt(monthlyCost(x))} בחודש</small>`}`)}
    ${cell(
      'כל כמה זמן',
      html`<select class=${selCls} aria-label="כל כמה זמן" value=${x.freq} onChange=${(e) => set({ freq: e.target.value })}>${FREQS.map((f) => html`<option value=${f.id}>${f.label}</option>`)}</select>`,
    )}
    ${cell(
      'מתי מתחיל',
      html`<select class=${selCls} aria-label="מתי מתחיל" value=${x.start || 'now'} onChange=${(e) => set({ start: e.target.value })}>
        <option value="now">${g('כבר משלם', 'כבר משלמת')}</option>
        ${FORECAST_MONTHS.map((k) => html`<option value=${k}>מ${monthYear(k)}</option>`)}
      </select>`,
    )}
    <span class="max-md:hidden"><${Trash} name=${x.name} onClick=${remove} /></span>
  </li>`;
}

function ExpensesTable({ s, up }) {
  const have = new Set(s.expenses.map((x) => x.name));
  const hasFb = s.expenses.some((x) => x.flowbiz);
  const hasBundle = s.expenses.some((x) => x.flowbiz === 'bundle');
  // A FlowBiz row replaces the FlowBiz row already there (the bundle includes the system).
  const addSuggestion = ({ note, stages, extra, fb, shown, pitch, market, need, ...x }) =>
    up((d) => {
      if (x.flowbiz) d.expenses = d.expenses.filter((y) => !y.flowbiz);
      d.expenses.push({ id: nextId('x'), start: 'now', ...x, sub: x.flowbiz ? note : undefined });
    }, `${x.name} נוסף`);
  const set = (id) => (patch) => up((d) => Object.assign(d.expenses.find((y) => y.id === id), patch));
  // Switch a row to its FlowBiz way or back: the bundle also replaces the FlowBiz row.
  const switchRow = (x, { note, stages, extra, fb, shown, pitch, market, need, ...y }) =>
    up((d) => {
      const i = d.expenses.findIndex((e) => e.id === x.id);
      const row = { id: x.id, start: x.start || 'now', ...y, sub: y.flowbiz ? note : undefined };
      if (!y.flowbiz) delete row.flowbiz;
      d.expenses[i] = row;
      if (y.flowbiz) d.expenses = d.expenses.filter((e) => e.id === x.id || !e.flowbiz);
    }, `${y.name} במקום ${x.name}`);
  const add = (x) => up((d) => d.expenses.push({ id: nextId('x'), name: '', amount: null, category: 'other', freq: 'monthly', day: 1, start: 'now', ...x }), x?.name ? `${x.name} נוסף` : undefined);
  return html`<div>
    <div class=${cx('hidden pb-2 text-[12px] font-bold text-muted md:grid md:gap-x-3', EXP_COLS)}>
      <span>הוצאה</span><span>סכום</span><span>כל כמה זמן</span><span>מתי מתחיל</span><span></span>
    </div>
    <ul>
      ${s.expenses.map((x) => html`<${ExpenseRow} key=${x.id} x=${x} set=${set(x.id)} sw=${!(hasBundle && !x.flowbiz) ? fbSwitchOf(x.name, s, 'expenses') : null} onSwitch=${(y) => switchRow(x, y)} remove=${() => up((d) => (d.expenses = d.expenses.filter((y) => y.id !== x.id)), `${x.name || 'ההוצאה'} נמחקה`)} />`)}
    </ul>
    ${!s.expenses.length && html`<p class="border-t border-line py-4 text-center text-[14px] text-muted">עוד אין הוצאות. אפשר להוסיף הוצאה, או להתחיל מההצעות של הכריש.</p>`}
    <div class="flex items-center justify-between gap-3 border-t-2 border-ink/70 pt-3">
      <b class="text-[15px]">סך הכול בחודש</b><${Num} n=${fixedMonthly(s)} class="text-[17px]" />
    </div>
    <button type="button" onClick=${() => add()} class="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-brand-300 text-[14px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer"><${Icon} name="plus" size=${16} />הוצאה קבועה</button>
    <${ExpensesMust} s=${s} up=${up} />
    <${SharkChips}
      title=${`הכריש: ${g('יועצי', 'יועצות')} שיווק בדרך כלל משלמים גם על`}
      items=${sharkExpensesFor(s).filter((x) => !have.has(x.name) && !(mustReady(s, 'expenses') && mustExpensesFor(s).some((y) => y.name === x.name)) && !(x.flowbiz && hasBundle) && !(x.flowbiz === 'system' && hasFb)).map((x) => (hasBundle && x.fb ? { ...x, fb: null } : x))}
      label=${(x) => x.shown || `${fmt(x.amount)} ${per(x.freq)}`}
      onAdd=${addSuggestion}
    />

  </div>`;
}

// ---------- the other sections ----------

function MoneyNow({ s, up }) {
  const has = s.bank.has;
  return html`<div class="grid gap-4 md:grid-cols-2">
    <div>
      <p class="mb-1 text-[14px] font-bold">יש לעסק חשבון בנק נפרד?</p>
      <${YesNo} value=${has} onChange=${(v) => up((d) => (d.bank.has = v))} />
    </div>
    ${has != null &&
    html`<${Field} class="!mb-0 rise" label=${has ? 'כמה יש היום בחשבון הבנק של העסק?' : 'כמה כסף יש היום לעסק?'} hint=${has ? 'היתרה כמו שהיא בבנק היום' : 'כל הכסף ששמת בצד לעסק, גם אם הוא בחשבון הפרטי'}>
      <${Money} label="סכום" value=${s.bank.amount} onChange=${(v) => up((d) => {
        d.bank.amount = v;
        if (d.stage === 'setup' && !d.budgetSet) d.setupBudget = v; // the budget starts as all the money
      })} />
    <//>`}
  </div>`;
}

function ImportSheet({ onClose, onApply }) {
  const [step, setStep] = useState('pick');
  const r = DEMO_REPORT.history;
  const rows = [
    ['מאיזה חודש', monthYear(r.from)],
    ['נכנס לעסק', fmt(r.income)],
    ['יצא מהעסק', fmt(r.out)],
    ['לקוחות ששילמו', num(r.clients)],
  ];
  return html`<${Sheet} title="דוח רווח והפסד" wide onClose=${onClose} footer=${step === 'review' && html`<${Button} variant="secondary" onClick=${onClose}>ביטול<//><${Button} onClick=${onApply}>אישור והכנסה לשלב<${Icon} name="check" size=${18} /><//>`}>
    ${step === 'pick'
      ? html`<button type="button" class="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-white p-8 text-center hover:bg-brand-50 cursor-pointer" onClick=${() => setStep('review')}>
          <span class="text-brand-600"><${Icon} name="file-spreadsheet" size=${36} /></span>
          <b class="text-[17px]">לבחור קובץ אקסל</b>
          <small class="text-[14px] text-muted">דוח רווח והפסד מרואה החשבון או מתוכנת הנהלת החשבונות. הכריש מסכם ממנו כמה נכנס וכמה יצא.</small>
        </button>`
      : html`<div class="rise">
          <p class="mb-3 flex items-center gap-2 text-[14px]"><${Icon} name="file-check-2" size=${18} class="text-brand-600" /><b>${DEMO_REPORT.file}</b> · כדאי לעבור על המספרים לפני שמכניסים.</p>
          <dl class="mb-4 text-[15px]">
            ${rows.map(([k, v]) => html`<div key=${k} class="flex justify-between gap-3 border-t border-line py-2"><dt>${k}</dt><dd class="font-bold tabular-nums">${v}</dd></div>`)}
          </dl>
        </div>`}
  <//>`;
}

// Start months: from last month back four years, newest first.
const LAST_MONTH = addMonth(TODAY.slice(0, 7), -1);
const START_MONTHS = Array.from({ length: 48 }, (_, i) => addMonth(LAST_MONTH, -i));

function History({ s, up }) {
  const [sheet, setSheet] = useState(false);
  const h = s.history;
  const avg = todayAvg(s);
  const set = (k) => (v) => up((d) => (d.history[k] = v));
  return html`<div>
    ${!h.mode &&
    html`<div class="grid gap-3 md:grid-cols-2">
      <button type="button" class="lp-option !p-4" onClick=${() => setSheet(true)}>
        <span class="text-brand-600"><${Icon} name="file-spreadsheet" size=${26} /></span>
        <span><b class="block text-[16px]">להעלות דוח רווח והפסד</b><small class="text-[13px] text-muted">קובץ אקסל, הכריש מסכם ממנו</small></span>
      </button>
      <button type="button" class="lp-option !p-4" onClick=${() => up((d) => (d.history.mode = 'manual'))}>
        <span class="text-brand-600"><${Icon} name="pencil" size=${26} /></span>
        <span><b class="block text-[16px]">למלא ${g('בעצמי', 'בעצמי')}</b><small class="text-[13px] text-muted">מתי התחלת, וכמה נכנס ויצא עד היום</small></span>
      </button>
    </div>`}
    ${h.mode &&
    html`<div class="rise">
      ${h.mode === 'file' && html`<p class="mb-3 flex items-center gap-2 text-[14px]"><${Tag} tone="blue"><${Icon} name="file-check-2" size=${13} />מהדוח<//>אפשר לתקן כל מספר.</p>`}
      <${Field} label="מאיזה חודש העסק התחיל?" hint="עסק שפעיל כמה שנים? אפשר לספור מינואר שעבר, כדי שהממוצע ישקף את היום.">
        <select class=${cx(selCls, '!h-12 max-w-[280px] !text-[15px]')} aria-label="מאיזה חודש העסק התחיל" value=${h.from || ''} onChange=${(e) => set('from')(e.target.value || null)}>
          <option value="">לבחור חודש</option>
          ${START_MONTHS.map((k) => html`<option key=${k} value=${k}>${monthYear(k)}</option>`)}
        </select>
      <//>
      <div class="grid gap-x-4 md:grid-cols-3">
        <${Field} label="כמה נכנס לעסק עד היום?" hint=${`כל ההכנסות, עד סוף ${monthYear(LAST_MONTH)}`}>
          <${Money} label="כמה נכנס עד היום" value=${h.income} onChange=${set('income')} />
        <//>
        <${Field} label="כמה יצא מהעסק עד היום?" hint="כל ההוצאות, כולל ההקמה">
          <${Money} label="כמה יצא עד היום" value=${h.out} onChange=${set('out')} />
        <//>
        <${Field} label="כמה לקוחות שילמו עד היום?" hint="כל לקוח נספר פעם אחת">
          <${Money} suffix="" label="כמה לקוחות שילמו עד היום" value=${h.clients} onChange=${set('clients')} />
        <//>
      </div>
      ${avg &&
      html`<div class="mt-1 rounded-xl bg-canvas p-3 text-[14px]">
        <p class="mb-1 text-[13px] font-bold text-muted">${avg.n === 1 ? 'חודש אחד' : `${avg.n} חודשים`}, מ${monthYear(h.from)} עד ${monthYear(LAST_MONTH)}. בממוצע בחודש:</p>
        <p class="flex flex-wrap gap-x-5 gap-y-1">
          <span>נכנס <b class="tabular-nums">${fmt(avg.gross)}</b></span>
          ${avg.pastOut != null && html`<span>יצא <b class="tabular-nums">${fmt(avg.pastOut)}</b></span>`}
          ${h.clients != null && html`<span><b>${Math.abs(avg.clients - 1) < 0.05 ? 'לקוח חדש אחד' : `${num(avg.clients, 1)} לקוחות חדשים`}</b></span>`}
        </p>
      </div>`}
      ${h.mode === 'manual' && html`<button type="button" class="mt-2 text-[14px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => setSheet(true)}>יש לך דוח רווח והפסד? להעלות במקום</button>`}
    </div>`}
    ${sheet &&
    html`<${ImportSheet}
      onClose=${() => setSheet(false)}
      onApply=${() => {
        setSheet(false);
        up((d) => (d.history = { ...DEMO_REPORT.history }), 'הדוח נכנס');
      }}
    />`}
  </div>`;
}

function ToCome({ s, up }) {
  const boxes = [
    ['now', 'החודש', `עד סוף ${monthName(TODAY.slice(0, 7))}`],
    ['next', 'בחודש הבא', monthName(FORECAST_MONTHS[0])],
    ['later', 'אחר כך', 'מ' + monthName(FORECAST_MONTHS[1]) + ' והלאה'],
  ];
  return html`<div class="grid gap-3 sm:grid-cols-3">
    ${boxes.map(([k, label, hint]) => html`<${Field} key=${k} class="!mb-0" label=${label} hint=${hint}><${Money} label=${label} placeholder="0" value=${s.toCome[k]} onChange=${(v) => up((d) => (d.toCome[k] = v))} /><//>`)}
  </div>`;
}

function Regular({ s, up }) {
  return html`<div class="grid gap-4 sm:grid-cols-2">
    <${Field} class="!mb-0" label="כמה נכנס כל חודש?" hint="הסכום של כל הלקוחות הקבועים יחד"><${Money} label="הכנסה קבועה" value=${s.regular.amount} onChange=${(v) => up((d) => (d.regular.amount = v))} /><//>
    <${Field} class="!mb-0" label="באיזה יום בחודש?">
      <select class="h-11 w-full rounded-xl border-[1.5px] border-line bg-white px-3 text-[16px] cursor-pointer" value=${s.regular.day} onChange=${(e) => up((d) => (d.regular.day = Number(e.target.value)))}>
        ${[1, 5, 10, 15, 20, 25, 28].map((d) => html`<option value=${d}>ב-${d} לחודש</option>`)}
      </select>
    <//>
  </div>`;
}

function SetupDone({ s, up }) {
  return html`<div>
    <${YesNo} value=${s.setupDone} onChange=${(v) => up((d) => (d.setupDone = v))} />
    ${s.setupDone === false &&
    html`<div class="rise mt-4">
      <p class="mb-2 text-[14px] text-muted">מה עוד נשאר לשלם? מה שנשאר יוצא מהכסף של העסק בתחזית.</p>
      <${SetupTable} s=${s} up=${up} />
    </div>`}
  </div>`;
}

function Cushion({ s, up }) {
  const target = cushionTarget(s);
  const have = s.bank.amount || 0;
  return html`<div class="grid items-end gap-4 sm:grid-cols-[220px_1fr]">
    <${Field} class="!mb-0" label="כמה צריך להיות בכרית?" hint=${s.cushion == null ? `חודשיים של הוצאות: ${fmt(target)}` : 'קבעת בעצמך'}>
      <${Money} label="כרית ביטחון" value=${target} onChange=${(v) => up((d) => (d.cushion = v))} />
    <//>
    <div class="pb-6">
      <div class="mb-1 flex justify-between text-[13px] font-bold"><span>בעסק היום ${fmt(have)}</span><span class="text-muted">מתוך ${fmt(target)}</span></div>
      <div class="h-3 overflow-hidden rounded-full bg-[#e3ddd0]"><div class="h-full rounded-full bg-warn" style=${{ width: `${Math.min(100, (have / (target || 1)) * 100)}%` }}></div></div>
      <p class="mt-1 text-[13px] text-muted">${have >= target ? 'הכרית מלאה.' : `חסרים ${fmt(target - have)}. ממלאים אותה בהדרגה, תוך חצי שנה.`}</p>
    </div>
  </div>`;
}

// ---------- the guided list ----------

// What part 1 still needs about the income and expenses so far (null = nothing).
export function historyMissing(s) {
  const h = s.history;
  if (!h.from) return 'צריך את החודש שבו העסק התחיל';
  if (h.income == null) return 'צריך כמה נכנס עד היום';
  if (h.out == null) return 'צריך כמה יצא עד היום';
  if (h.clients == null) return 'צריך כמה לקוחות שילמו עד היום';
  return null;
}

const toComeOf = (s) => (s.toCome.now || 0) + (s.toCome.next || 0) + (s.toCome.later || 0);

export function sectionsOf(s) {
  const b = setupSummary(s);
  const avg = todayAvg(s);
  const all = {
    bank: {
      title: 'הכסף של העסק היום',
      sub: 'כמה כסף יש לעסק עכשיו, ואיפה הוא.',
      ok: s.bank.has != null && s.bank.amount != null,
      need: s.bank.has == null ? 'צריך לענות אם יש חשבון נפרד' : 'צריך לכתוב כמה כסף יש',
      sum: s.bank.amount != null ? `${fmt(s.bank.amount)}${s.bank.has ? ' בחשבון העסק' : ''}` : '',
      Body: MoneyNow,
    },
    setup: {
      title: 'תקציב ההקמה',
      sub: 'הוצאות חד-פעמיות כדי להתחיל: מה תכננת, מה כבר שילמת, ומה נשאר.',
      ok: true,
      sum: s.setupBudget != null || s.setup.length ? `תקציב ${fmt(b.budget || b.final)} · נשאר לשלם ${fmt(b.remaining)}` : '',
      Body: SetupTable,
      onNext: (d) => d.setupBudget == null && (d.setupBudget = setupSummary(d).final),
    },
    history: {
      title: 'הכנסות והוצאות עד היום',
      sub: 'כמה נכנס לעסק וכמה יצא ממנו מאז שהתחיל. מזה נחשב איך נראה חודש ממוצע היום.',
      ok: historyMissing(s) == null,
      need: historyMissing(s),
      sum: avg ? `נכנסו ${fmt(s.history.income)}${s.history.out != null ? `, יצאו ${fmt(s.history.out)}` : ''} · ${avg.n === 1 ? 'חודש אחד' : `${avg.n} חודשים`}` : '',
      Body: History,
    },
    regular: {
      title: 'הכנסה קבועה מלקוחות קבועים',
      sub: 'ריטיינרים ומנויים שנכנסים כל חודש.',
      ok: s.regular.amount != null,
      need: 'צריך את הסכום שנכנס כל חודש',
      sum: s.regular.amount != null ? `${fmt(s.regular.amount)} בחודש` : '',
      Body: Regular,
    },
    toCome: {
      title: 'כסף שעוד מגיע מלקוחות',
      sub: `תשלומים שלקוחות כבר התחייבו אליהם ועוד לא נכנסו${s.stage === 'active' ? ', בלי ההכנסה הקבועה' : ''}. אין? אפשר להמשיך.`,
      ok: true,
      sum: `${fmt(toComeOf(s))}`,
      Body: ToCome,
    },
    expenses: {
      title: 'הוצאות קבועות',
      sub: 'מה יוצא כל חודש, כל שבוע או פעם בשנה. אפשר לסמן הוצאה שתתחיל רק בעוד כמה חודשים.',
      ok: true,
      sum: `${s.expenses.length ? `${s.expenses.length} הוצאות · ` : ''}${fmt(fixedMonthly(s))} בחודש`,
      Body: ExpensesTable,
    },
    setupDone: {
      title: 'ההקמה מאחוריך?',
      sub: 'ציוד, אתר, קמפיין השקה: אם עוד יש הוצאה חד-פעמית שמחכה, נכניס אותה לתחזית.',
      ok: s.setupDone != null,
      need: 'צריך לענות אם ההקמה הסתיימה',
      sum: s.setupDone ? 'כן, ההקמה מאחוריי' : s.setupDone === false ? `נשאר לשלם ${fmt(b.remaining)}` : '',
      Body: SetupDone,
    },
    cushion: {
      title: 'כרית ביטחון',
      sub: 'כסף שנשאר בעסק לחודש חלש. ברירת המחדל: הוצאות של חודשיים.',
      ok: true,
      sum: fmt(cushionTarget(s)),
      Body: Cushion,
    },
  };
  const ids = {
    setup: ['bank', 'setup', 'expenses'],
    first: ['bank', 'history', 'toCome', 'expenses', 'setupDone'],
    active: ['bank', 'history', 'regular', 'toCome', 'expenses', 'setupDone', 'cushion'],
  }[s.stage];
  return ids.map((id) => ({ id, ...all[id] }));
}

function GuideSection({ sec, i, open, seen, onToggle, onNext, nextTitle, children }) {
  const done = seen && sec.ok;
  return html`<section id=${`sec-${sec.id}`} class=${cx('fb-panel scroll-mt-4 transition-shadow', open ? '!p-4 md:!p-6' : '!px-4 !py-3 md:!px-6')}>
    <button type="button" class="flex w-full items-center gap-3 text-start cursor-pointer" aria-expanded=${open} onClick=${onToggle}>
      <span class=${cx('grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[15px] font-black', done ? 'bg-brand-100 text-brand-600' : open ? 'bg-brand-600 text-white' : 'bg-canvas text-muted ring-1 ring-line')}>${done ? html`<${PencilCheck} size=${17} color="#0038b8" weight=${3} />` : i + 1}</span>
      <span class="min-w-0 flex-1">
        <span class=${cx('block font-display font-extrabold leading-tight', open ? 'text-[20px]' : 'text-[17px]')}>${sec.title}</span>
        ${open ? html`<span class="mt-0.5 block text-[14px] text-muted">${sec.sub}</span>` : seen && sec.sum && html`<span class="block text-[14px] leading-snug text-muted">${sec.sum}</span>`}
      </span>
      ${!open && html`<span class="shrink-0 text-[13px] font-bold text-brand-600">${seen ? 'לשינוי' : 'לפתוח'}</span>`}
      <${Icon} name="chevron-down" size=${18} class=${cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
    </button>
    ${open &&
    html`<div class="rise mt-4">
      ${children}
      <div class="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        ${!sec.ok && html`<span class="text-[14px] font-semibold text-muted">${sec.need}</span>`}
        <${Button} disabled=${!sec.ok} onClick=${onNext}>${nextTitle ? `המשך: ${nextTitle}` : 'סיימתי את המצב היום'}<${Icon} name=${nextTitle ? 'arrow-left' : 'check'} size=${18} /><//>
      </div>
    </div>`}
  </section>`;
}

// The live summary on the side: what the numbers so far say.
// When the money lasts less than 3 months: what the shark would drop first. Only what can
// wait ("אפשר לחכות"): a setup item not paid yet, or a fixed expense. The one that adds the most time.
function cutTip(s, rw) {
  if (!rw || rw.months >= 3 || fixedMonthly(s) <= 0) return null;
  const setupOn = s.stage === 'setup' || s.setupDone === false;
  const opts = [
    ...(setupOn ? s.setup.filter((x) => !x.flowbiz && !x.done && itemLeft(x) > 0 && needOf(x.name) === 3).map((x) => ({ kind: 'setup', x, save: itemLeft(x), next: { ...s, setup: s.setup.filter((y) => y.id !== x.id), setupBudget: s.setupBudget == null ? null : Math.max(0, s.setupBudget - itemLeft(x)) } })) : []),
    ...s.expenses.filter((x) => !x.flowbiz && x.category !== 'marketing' && x.category !== 'gov' && needOf(x.name) === 3).map((x) => ({ kind: 'exp', x, save: monthlyCost(x), next: { ...s, expenses: s.expenses.filter((y) => y.id !== x.id) } })),
  ].map((o) => ({ ...o, rw: runway(o.next) }));
  return opts.sort((a, b) => b.rw.months - a.rw.months)[0] || null;
}
const spanOf = (rw) => {
  if (rw.months === Infinity) return 'יותר משנתיים';
  if (rw.months < 1) {
    const w = Math.max(1, Math.round(rw.months * 4.3));
    return w === 1 ? 'שבוע אחד' : w === 2 ? 'שבועיים' : `${w} שבועות`;
  }
  const m = num(rw.months, rw.months < 10 ? 1 : 0);
  return m === '1' ? 'חודש אחד' : m === '2' ? 'חודשיים' : `${m} חודשים`;
};

function Summary({ s, up }) {
  const rw = runway(s);
  const avg = s.stage === 'setup' ? null : todayAvg(s);
  const b = setupSummary(s);
  const left = s.stage === 'setup' || s.setupDone === false ? b.remaining : 0;
  const rows = [
    ['כסף בעסק היום', s.bank.amount],
    s.stage !== 'setup' && ['הכנסה ממוצעת בחודש', avg ? avg.income : null, s.entity === 'licensed' ? 'בלי מע"מ' : ''],
    s.stage === 'active' && ['מזה הכנסה קבועה', s.regular.amount],
    s.stage !== 'setup' && ['כסף שעוד מגיע', toComeOf(s)],
    (s.stage === 'setup' || s.setupDone === false) && ['נשאר לשלם על ההקמה', left],
    ['הוצאות קבועות בחודש', fixedMonthly(s)],
  ].filter(Boolean);
  const until = rw && (rw.free <= 0 ? 'אין כסף פנוי' : rw.until ? `עד ${monthYear(rw.until)}` : 'יותר משנתיים');
  const span = rw && rw.free > 0 && rw.until ? spanOf(rw) : '';
  const setupLeft = s.stage === 'setup' || s.setupDone === false ? b.remaining : 0;
  // Only once the fixed expenses are in: before that there is nothing to divide by.
  const showRw = rw && (fixedMonthly(s) > 0 || (s.seen || []).includes('expenses'));
  const tip = showRw && cutTip(s, rw);
  const drop = (o) =>
    up((d) => {
      if (o.kind === 'setup') {
        d.setup = d.setup.filter((y) => y.id !== o.x.id);
        if (d.setupBudget != null) d.setupBudget = Math.max(0, d.setupBudget - o.save); // the money is free again
      }
      else d.expenses = d.expenses.filter((y) => y.id !== o.x.id);
    }, `${o.x.name} ירד מהרשימה`);
  return html`<div class="fb-panel !p-4 md:!p-5">
    <h2 class="fb-h3 mb-2">התמונה עד עכשיו</h2>
    <dl class="text-[14px]">
      ${rows.map(([k, v, note]) => html`<div key=${k} class="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5"><dt>${k}${note && html` <small class="text-[12px] text-muted">(${note})</small>`}</dt><dd class=${cx('font-display text-[16px] font-extrabold tabular-nums', v == null && 'text-faint')}>${v == null ? '—' : fmt(v)}</dd></div>`)}
    </dl>
    ${avg &&
    html`<div class=${cx('mt-3 rounded-xl p-3', avg.left < 0 ? 'bg-warn-50' : 'bg-brand-50')}>
      <p class="text-[13px] font-bold text-muted">בחודש ממוצע היום נשארים</p>
      <p class=${cx('font-display text-[26px] font-black leading-tight tabular-nums', avg.left < 0 ? 'text-warn' : 'text-brand-600')}>${fmt(avg.left)}</p>
      <${How}><${CalcLines} lines=${[['נכנס בחודש ממוצע', fmt(avg.income)], ['פחות מה שיצא בחודש ממוצע', fmt(-avg.out)], ['נשאר', fmt(avg.left), true]]} note="ממוצע = הסכומים עד היום ÷ מספר החודשים המלאים מאז שהעסק התחיל." /><//>
    </div>`}
    ${showRw &&
    html`<div class=${cx('mt-3 rounded-xl p-3', rw.months < 3 ? 'bg-warn-50' : 'bg-canvas')}>
      <p class="text-[13px] font-bold text-muted">${s.stage === 'setup' ? 'בלי הכנסה בכלל, הכסף מחזיק' : 'בלי מכירות חדשות, הכסף מחזיק'}</p>
      <p class=${cx('font-display text-[24px] font-black leading-tight', rw.months < 3 ? 'text-warn' : 'text-ink')}>${until}${span && html`<span class="ms-1.5 text-[15px] font-bold">· ${span}</span>`}</p>
      <${How}><${CalcLines}
        lines=${[
          ['כסף בעסק היום', fmt(s.bank.amount)],
          s.stage !== 'setup' && toComeOf(s) > 0 && ['ועוד כסף שעוד מגיע', fmt(toComeOf(s))],
          setupLeft > 0 && ['פחות מה שנשאר לשלם על ההקמה', fmt(-setupLeft)],
          ['פנוי', fmt(rw.free), true],
          fixedMonthly(s) > 0 && ['÷ הוצאות קבועות בחודש', fmt(fixedMonthly(s))],
          fixedMonthly(s) > 0 && rw.free > 0 && ['= מחזיק', spanOf(rw), true],
        ]}
        note=${setupLeft > 0 ? 'מה שנשאר לשלם על ההקמה נחשב כאילו כבר שולם.' : ''}
      /><//>
    </div>`}
    ${tip &&
    html`<div class="mt-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3 text-[14px]">
      <p class="flex items-start gap-2"><img src="assets/shark/shark-thinking-sm.svg" alt="" class="h-6 w-6 shrink-0 rounded-full bg-white" /><span><b>הכריש:</b> ${tip.x.name} ${tip.kind === 'setup' ? `(${fmt(tip.save)})` : `(${fmt(tip.save)} בחודש)`} יכול לחכות. בלי זה הכסף מחזיק ${spanOf(tip.rw)}.</span></p>
      <button type="button" class="mt-1.5 inline-flex h-8 items-center gap-1 rounded-lg border-[1.5px] border-brand-300 bg-white px-2.5 text-[13px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${() => drop(tip)}><${Icon} name="scissors" size=${13} />לוותר בינתיים</button>
    </div>`}
  </div>`;
}

export function TodayScreen({ s, up, onStage }) {
  const st = stageOf(s.stage);
  const secs = sectionsOf(s);
  const seen = new Set(s.seen || []);
  const [open, setOpen] = useState(() => secs.find((x) => !seen.has(x.id))?.id ?? null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (open) setTimeout(() => document.getElementById(`sec-${open}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }, [open]);
  const next = (sec, i) => {
    // The first "המשך" with a must-have missing: stay here and show the shark's box.
    const must = sec.id === 'setup' || (sec.id === 'setupDone' && s.setupDone === false) ? mustSetupFor(s) : sec.id === 'expenses' ? mustExpensesFor(s) : [];
    const stay = must.length > 0 && !seen.has(sec.id);
    up((d) => {
      if (!d.seen.includes(sec.id)) d.seen.push(sec.id);
      sec.onNext?.(d);
    });
    if (stay) {
      setTimeout(() => document.getElementById(sec.id === 'expenses' ? 'must-expenses' : 'must-setup')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      return;
    }
    const after = secs.slice(i + 1).find((x) => !seen.has(x.id)) || secs[i + 1];
    setOpen(after ? after.id : null);
    if (!after) setTimeout(() => document.getElementById('today-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  return html`<div class="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 1 מתוך ${PARTS.length} · ${PARTS[0]} · ${st.board}`} title=${s.stage === 'setup' ? ['כמה כסף יש ', 'להקמה', '?'] : ['איך נראה ', 'חודש', ' היום?']} sub=${s.stage === 'setup' ? `${secs.length} שאלות קצרות. עוד אין הכנסה, אז נבדוק כמה זמן הכסף מחזיק.` : `${secs.length} שאלות קצרות. ממה שכבר קרה נבנה את נקודת ההתחלה של התחזית.`}>
      <button type="button" class="mt-1 inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${onStage} title="לשנות את מצב העסק"><${Icon} name=${st.icon} size=${15} />${st.label}</button>
    <//>
    <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px]">
      <div class="flex min-w-0 flex-col gap-3">
        ${secs.map(
          (sec, i) => html`<${GuideSection}
            key=${sec.id}
            sec=${sec}
            i=${i}
            open=${open === sec.id}
            seen=${seen.has(sec.id)}
            nextTitle=${secs[i + 1]?.title}
            onToggle=${() => setOpen(open === sec.id ? null : sec.id)}
            onNext=${() => next(sec, i)}
          ><${sec.Body} s=${s} up=${up} /><//>`,
        )}
      </div>
      <aside id="today-summary" class="scroll-mt-4 lg:sticky lg:top-4"><${Summary} s=${s} up=${up} /></aside>
    </div>
  </div>`;
}

export const ALL_SECTIONS = ['bank', 'setup', 'history', 'regular', 'toCome', 'expenses', 'setupDone', 'cushion'];
