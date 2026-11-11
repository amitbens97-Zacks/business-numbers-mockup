// Step 5, parts 3-4: how much to sell, and the annual forecast with the checks and the
// fixes. Amit, 11.11: the goal part is gone (the goal is a field here), the numbers are
// before tax (the accountant chapter does the tax), and both parts are calmer: one place
// to look, less text, the rest behind a click.
import { html, useState, Icon, cx } from './lib.js';
import { Button, StepHeading, SharkAvatar, How, CalcLines } from './components.js';
import { Chips, inputCls, Tag, Sheet } from './ui.js';
import { PARTS, FROM_STEP2, g } from './data.js';
import { Money, Stepper, Section } from './parts.js';
import { ForecastChart, ForecastLegend, ForecastTable } from './chart.js';
import {
  fmt, num, monthName, monthYear, weekOf, monthOfWeek, FIX_EDIT, fixTitle, applyFix, overCeiling, netPrice,
  paidProducts, isSharkMix, fixes, withPicks, clientsText, model, SCEN_NAME, SCENARIO_KEYS, PACE_DEFAULT, paceOf, paceEdited, growAt, weakIn,
} from './calc.js';

// ---------- part 3: how much to sell ----------

// One color per product, in the mix bar and next to its row.
const MIX_COLORS = ['#0038b8', '#4f86e8', '#f0a830', '#2f9e6b', '#a5c0f2', '#c2410c'];

// The numbers are before tax. The tax is done with the accountant, in the accountant chapter.
function TaxNote({ s, notify }) {
  return html`<div class="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-brand-300 bg-white px-4 py-3">
    <span class="fb-chip-ic h-10 w-10 shrink-0"><${Icon} name="landmark" size=${19} /></span>
    <p class="min-w-[200px] flex-1 text-[15px]"><b>החישובים כאן לא כוללים מס.</b> <span class="text-muted">${overCeiling(s) ? 'ובהכנסה שהיעד דורש, גם עוברים את תקרת עוסק פטור. ' : ''}את המס מחשבים עם רואה החשבון שלנו, בפרק ראיית חשבון.</span></p>
    <${Button} variant="mini" onClick=${() => notify('במערכת: עוברים לעמוד ראיית חשבון. עושים מנוי, עוברים את השלבים, ובסוף שולחים את הפרטים לרואה החשבון, והוא יוצר קשר.', 'landmark')}>לחישוב המס עם רואה החשבון<${Icon} name="arrow-left" size=${15} /><//>
  </div>`;
}

// What the full month asks for: leads, calls, new clients and the hours (the hours that the
// user has can change right here).
function Needs({ s, up, st }) {
  const a = s.assumptions;
  const wk = weekOf(a);
  const per = (n) => num(Math.ceil(((n * 12) / 52) * 2) / 2, 1);
  const hoursWk = (st.hours * 12) / 52;
  const over = wk != null && hoursWk > wk;
  const tiles = [
    ['users', 'פניות בחודש', st.leads, `${per(st.leads)} בשבוע`],
    ['phone', 'שיחות מכירה בחודש', st.calls, `${per(st.calls)} בשבוע`],
    ['handshake', 'לקוחות חדשים בחודש', st.newClients, `${per(st.newClients)} בשבוע`],
  ];
  return html`<${Section} title="מה זה אומר בפועל" sub="כדי למכור את התמהיל: פניות, שיחות ולקוחות בכל חודש, ושעות עבודה בכל שבוע.">
    <div class="grid grid-cols-3 gap-2 sm:gap-3">
      ${tiles.map(([icon, label, n, sub]) => html`<div key=${label} class="flex flex-col items-center gap-0.5 rounded-xl bg-brand-50 px-2 py-3 text-center">
        <span class="text-brand-600"><${Icon} name=${icon} size=${20} /></span>
        <b class="font-display text-[26px] leading-none tabular-nums">${num(n, n < 10 ? 1 : 0)}</b>
        <span class="text-[13px] font-bold leading-tight">${label}</span>
        <small class="text-[12px] text-muted">${sub}</small>
      </div>`)}
    </div>
    <div class=${cx('mt-3 rounded-xl p-3', over ? 'bg-error-50' : 'bg-canvas')}>
      <p class="mb-1.5 flex items-center gap-1.5 text-[15px] font-bold"><${Icon} name="clock" size=${18} class=${over ? 'text-error' : 'text-brand-600'} />שעות עבודה בשבוע</p>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[15px]">
        <span>עם לקוחות ובשיחות: <b class="tabular-nums">${num(hoursWk, 1)}</b> שעות בשבוע, מתוך</span>
        <span class="w-[110px]"><${Money} suffix="שעות" label="שעות בשבוע שיש לך" invalid=${wk == null} value=${wk} onChange=${(v) => up((d) => { d.assumptions.hoursWeek = v; d.assumptions.hoursMonth = monthOfWeek(v); d.assumptions.hoursEdited = true; })} /></span>
        <span>בשבוע שיש לך</span>
      </div>
      ${wk != null && html`<div class="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e3ddd0]"><div class=${cx('h-full rounded-full transition-all', over ? 'bg-error' : 'bg-brand-600')} style=${{ width: `${Math.min(100, (hoursWk / (wk || 1)) * 100)}%` }}></div></div>`}
      ${over && html`<p class="mt-1.5 text-[14px] font-bold text-error">זה יותר שעות ממה שיש לך. בתחזית נראה מה אפשר לשנות.</p>`}
    </div>
  <//>`;
}

// The rates behind the numbers: closed, one line each.
function Assumptions({ s, up }) {
  const a = s.assumptions;
  const monthly = paidProducts(s).find((p) => p.kind === 'monthly');
  const rows = [
    ['leadToCall', '%', 'מהפניות קובעות שיחת מכירה'],
    ['closeRate', '%', 'מהשיחות נגמרות בקנייה'],
    monthly && ['stayMonths', 'חודשים', `לקוח ב${monthly.short || monthly.name} נשאר בממוצע`],
  ].filter(Boolean);
  const empty = rows.some(([k]) => a[k] == null);
  return html`<details class="fb-panel mb-5 !p-4" open=${empty}>
    <summary class="cursor-pointer text-[15px] font-bold text-brand-600">על מה זה מבוסס? <span class="font-semibold text-muted">ממוצעים בתחום, אפשר לשנות</span></summary>
    <ul class="mt-3 flex flex-col gap-2">
      ${rows.map(([key, suffix, text]) => html`<li key=${key} class="flex flex-wrap items-center gap-2 text-[15px]">
        <span class="w-[120px]"><${Money} suffix=${suffix} label=${text} invalid=${a[key] == null} value=${a[key]} onChange=${(v) => up((d) => (d.assumptions[key] = v))} /></span>
        <span>${text}</span>
      </li>`)}
    </ul>
  </details>`;
}

export function SellScreen({ s, up, m, notify, undoTo }) {
  const st = m.st;
  const mix = m.mix;
  const ps = paidProducts(s);
  const setN = (id, n) => up((d) => (d.mix = { ...mix, [id]: n }));
  const shark = isSharkMix(s);
  const goal = s.goal || 0;
  const left = st.profit - st.setAside;
  const ok = goal > 0 && left >= goal;
  const out = st.cogs + st.fixed + st.setAside;
  const color = (i) => MIX_COLORS[i % MIX_COLORS.length];
  const income = (p) => (mix[p.id] || 0) * netPrice(s, p);
  return html`<div class="mx-auto max-w-[1000px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 3 מתוך ${PARTS.length} · ${PARTS[2]}`} title=${['כמה צריך ', 'למכור', '?']} sub="מה מוכרים בחודש אחד, כדי שיישאר לך היעד." />

    <div class="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-brand-50 px-4 py-3">
      <${Icon} name="target" size=${22} class="text-brand-600" />
      <b class="text-[16px]">היעד שלך: יישארו לך בכל חודש</b>
      <span class="w-[150px]"><${Money} label="היעד החודשי" invalid=${!s.goal} value=${s.goal} onChange=${(v) => up((d) => ((d.goal = v), (d.goalConfirmed = true)))} /></span>
      ${s.goal === FROM_STEP2.goal && html`<${Tag}>מ"אני והעסק"<//>`}
    </div>

    <${Section}
      title="התמהיל: מה מוכרים בחודש מלא"
      sub="חודש מלא = חודש שבו מוכרים את כל מה שכאן. בתחזית נראה מתי מגיעים אליו."
      aside=${shark ? html`<${Tag} tone="blue"><img src="assets/shark/shark-happy-sm.svg" alt="" class="h-4 w-4 rounded-full bg-white" />ההצעה של הכריש<//>` : html`<button type="button" class="shrink-0 text-[14px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => { const back = s; up((d) => (d.mix = null)); notify('חזרת להצעה של הכריש', 'rotate-ccw', () => undoTo(back)); }}>להחזיר להצעה של הכריש</button>`}
    >
      ${st.income > 0 && html`<div class="mb-1 flex h-4 overflow-hidden rounded-full bg-[#e3ddd0]" aria-hidden="true">
        ${ps.map((p, i) => income(p) > 0 && html`<span key=${p.id} class="h-full transition-all" style=${{ width: `${(income(p) / st.income) * 100}%`, background: color(i) }}></span>`)}
      </div>`}
      <ul class="flex flex-col divide-y divide-line">
        ${ps.map((p, i) => {
          const n = mix[p.id] || 0;
          return html`<li key=${p.id} class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span class="h-3.5 w-3.5 shrink-0 rounded-full" style=${{ background: color(i) }}></span>
            <div class="min-w-[150px] flex-1">
              <b class="block text-[16px] leading-snug">${p.short || p.name}</b>
              <small class="text-[13px] text-muted">${fmt(netPrice(s, p))} ${p.kind === 'monthly' ? 'לחודש · לקוחות פעילים' : 'למכירה'}</small>
            </div>
            <span class="ms-auto flex items-center gap-3">
              <${Stepper} label=${p.name} value=${n} onChange=${(v) => setN(p.id, v)} />
              <b class="w-[84px] text-end font-display text-[17px] tabular-nums">${fmt(income(p))}</b>
            </span>
          </li>`;
        })}
      </ul>

      <div class="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1.15fr] items-stretch gap-1 sm:gap-2" role="status" aria-live="polite">
        <div class="rounded-xl bg-canvas px-1.5 py-2.5 text-center sm:px-3"><small class="block text-[12px] font-bold text-muted">נכנס</small><b class="whitespace-nowrap font-display text-[15px] tabular-nums sm:text-[20px]">${fmt(st.income)}</b></div>
        <span class="self-center font-display text-[20px] font-black text-muted">−</span>
        <div class="rounded-xl bg-canvas px-1.5 py-2.5 text-center sm:px-3"><small class="block text-[12px] font-bold text-muted">יוצא</small><b class="whitespace-nowrap font-display text-[15px] tabular-nums sm:text-[20px]">${fmt(out)}</b></div>
        <span class="self-center font-display text-[20px] font-black text-muted">=</span>
        <div class=${cx('rounded-xl px-1.5 py-2.5 text-center ring-2 sm:px-3', ok ? 'bg-money-50 ring-money/40' : 'bg-error-50 ring-error/40')}><small class="block text-[12px] font-bold text-muted">נשאר לך</small><b class=${cx('whitespace-nowrap font-display text-[17px] font-black tabular-nums sm:text-[24px]', ok ? 'text-money' : 'text-error')}>${fmt(left)}</b></div>
      </div>
      <p class=${cx('mt-2 flex items-center gap-1.5 text-[15px] font-bold', ok ? 'text-money' : 'text-error')}>
        <${Icon} name=${ok ? 'circle-check' : 'circle-alert'} size=${18} />
        ${!goal ? 'צריך יעד, למעלה' : ok ? (left - goal >= 50 ? `מגיעים ליעד, ועוד ${fmt(left - goal)}` : 'מגיעים ליעד') : `חסרים ${fmt(goal - left)} ליעד. אפשר להוסיף מכירות`}
      </p>
      <${How} class="mt-1"><${CalcLines}
        lines=${[
          ['נכנס מהמכירות', fmt(st.income)],
          ['פחות עלויות המוצרים', fmt(-st.cogs)],
          ['פחות הוצאות קבועות', fmt(-st.fixedBase)],
          st.fixedGrow > 0 && ['פחות העלייה בפרסום ובכלים כשהעסק גדל', fmt(-st.fixedGrow)],
          st.setAside > 0 && ['פחות לכרית הביטחון', fmt(-st.setAside)],
          ['נשאר לך, לפני מס', fmt(left), true],
        ].filter(Boolean)}
        note=${st.vat > 1 ? `בלי המע"מ (${fmt(st.vat)}): הוא עובר למדינה.` : ''}
      /><//>
    <//>

    <${TaxNote} s=${s} notify=${notify} />
    <${Needs} s=${s} up=${up} st=${st} />
    <${Assumptions} s=${s} up=${up} />
  </div>`;
}

// ---------- part 4: the forecast, the checks, the fixes ----------

const TONE = {
  ok: { ring: 'border-money/30 bg-money-50', text: 'text-money', icon: 'circle-check' },
  warn: { ring: 'border-warn/30 bg-warn-50', text: 'text-warn', icon: 'circle-alert' },
  bad: { ring: 'border-error/30 bg-error-50', text: 'text-error', icon: 'circle-x' },
  info: { ring: 'border-line bg-white', text: 'text-muted', icon: 'info' },
};
const Dot = ({ tone }) => html`<span class=${cx('inline-block h-2.5 w-2.5 rounded-full', { ok: 'bg-money', warn: 'bg-warn', bad: 'bg-error', info: 'bg-faint' }[tone])}></span>`;

function Checks({ list, how = true, brief }) {
  return html`<div class="grid gap-3 sm:grid-cols-2">
    ${list.map((c) => {
      const t = TONE[c.tone];
      return html`<div key=${c.id} class=${cx('flex items-start gap-3 rounded-xl border-[1.5px] p-3', t.ring)}>
        <span class=${cx('mt-0.5', t.text)}><${Icon} name=${t.icon} size=${22} /></span>
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-bold text-muted">${c.q}</p>
          <p class="font-display text-[17px] font-extrabold">${c.a}</p>
          ${!brief && html`<p class="text-[13px]">${c.sub}</p>`}
          ${how &&
          c.how &&
          html`<details class="mt-1.5">
            <summary class="cursor-pointer text-[12px] font-bold text-brand-600">איך זה חושב</summary>
            <div class="mt-1 rounded-lg bg-white/80 px-2.5 py-1.5">
            <dl class="text-[13px]">
              ${c.how.map(([k, v, main]) => html`<div key=${k} class=${cx('flex items-baseline justify-between gap-3 py-0.5', main && 'mt-0.5 border-t border-line pt-1 font-bold')}><dt class="min-w-0">${k}</dt><dd class="shrink-0 tabular-nums">${v}</dd></div>`)}
            </dl>
            <p class="mt-1 text-[12px] text-muted">${c.rule}</p>
          </div></details>`}
        </div>
      </div>`;
    })}
  </div>`;
}

function Verdict({ v, scen }) {
  const t = TONE[v.tone];
  return html`<div class=${cx('rise mb-4 flex items-center gap-4 rounded-2xl border-[1.5px] p-4 md:p-5', t.ring)} role="status">
    <${SharkAvatar} size=${56} mood=${v.tone === 'ok' ? 'happy' : v.tone === 'warn' ? 'thinking' : 'alert'} />
    <div>
      <p class=${cx('font-display text-[26px] font-black leading-tight md:text-[30px]', t.text)}>${v.title}</p>
      <p class="text-[16px]">${v.cause}</p>
      ${scen && html`<p class="mt-0.5 text-[13px] font-bold text-muted">לפי התסריט ${SCEN_NAME[scen]}</p>`}
    </div>
  </div>`;
}

// A fix the shark offers. The number in it (price, clients, hours, goal, sum) can change:
// before adding, the card shows what the changed one does; once in the plan, the plan follows.
function FixCard({ fx, pick, base, scen, onApply, onEdit }) {
  const [draft, setDraft] = useState(null);
  const [open, setOpen] = useState(false);
  const ed = FIX_EDIT[fx.id];
  const d0 = pick || draft || fx.d;
  const d = { ...d0, title: fixTitle(base, d0) };
  const changed = d[ed?.key] !== fx.d[ed?.key];
  const after = changed ? model(applyFix(base, d), scen) : fx.after;
  const set = (v) => {
    if (v == null || v <= 0) return;
    const nd = { ...d, [ed.key]: v };
    nd.title = fixTitle(base, nd);
    if (pick) onEdit(nd);
    else setDraft(nd);
  };
  return html`<li class=${cx('fb-panel flex flex-col gap-2 !p-4 transition', pick && '!border-brand-600 ring-2 ring-brand-300')}>
    <div class="flex items-start gap-3">
      <span class="fb-chip-ic h-10 w-10 shrink-0"><${Icon} name=${fx.icon} size=${20} /></span>
      <div class="min-w-0 flex-1">
        <b class="block text-[16px]">${d.title}</b>
        <small class="text-[13px] text-muted">${changed ? `הכריש הציע: ${fx.title}` : fx.sub}</small>
      </div>
    </div>
    ${ed && (open
      ? html`<div class="flex flex-col gap-1.5 rounded-lg border-[1.5px] border-brand-300 bg-white p-2.5">
          <span class="text-[13px] font-bold">${ed.label}</span>
          <div class="flex items-center gap-2">
            <button type="button" aria-label="פחות" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[1.5px] border-line text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${() => set(Math.max(ed.step, d[ed.key] - ed.step))}><${Icon} name="minus" size=${16} /></button>
            <div class="min-w-0 flex-1"><${Money} suffix=${ed.suffix} label=${ed.label} value=${d[ed.key]} onChange=${set} /></div>
            <button type="button" aria-label="יותר" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[1.5px] border-line text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${() => set(d[ed.key] + ed.step)}><${Icon} name="plus" size=${16} /></button>
          </div>
          <span class="flex items-center justify-between gap-2 text-[12px] text-muted">${pick ? 'התוכנית מתעדכנת עם כל שינוי.' : 'רואים למטה מה זה עושה, לפני שמוסיפים.'}<button type="button" class="font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => setOpen(false)}>סגירה</button></span>
        </div>`
      : html`<button type="button" class="inline-flex items-center gap-1 self-start text-[13px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => setOpen(true)}><${Icon} name="pencil" size=${13} />לשנות את המספר</button>`)}
    <p class="text-[13px]">השינוי הזה לבד: <b class=${TONE[after.verdict.tone].text}>${after.verdict.title}</b> · נשאר בחודש מלא ${fmt(after.st.profit - after.st.setAside)}</p>
    ${pick
      ? html`<button type="button" aria-pressed="true" class="inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-brand-700 cursor-pointer" onClick=${() => { setDraft(null); onApply(d); }}><${Icon} name="check" size=${14} />נבחר · לבטל</button>`
      : html`<${Button} variant="mini" class="self-start" aria-pressed="false" onClick=${() => onApply(d)}><${Icon} name="plus" size=${14} />להוסיף לתוכנית<//>`}
  </li>`;
}

function SharkChat({ m, onClose }) {
  const [msgs, setMsgs] = useState([{ who: 'shark', text: `${m.verdict.title}. ${m.verdict.cause} על מה ${g('תרצה', 'תרצי')} לדבר?` }]);
  const [draft, setDraft] = useState('');
  const send = (q) => {
    if (!q.trim()) return;
    setMsgs((x) => [...x, { who: 'me', text: q }, { who: 'shark', text: 'במוק-אפ אין שיחה אמיתית. במערכת הכריש עונה כאן, עם כל המספרים של השלב: התמהיל, האחוזים, התחזית והבדיקות. הוא לא מחשב מספרים בעצמו: כל הצעה שלו עוברת דרך אותו חישוב, ומוצגת לפני ואחרי.' }]);
    setDraft('');
  };
  return html`<${Sheet} title="לדבר על זה עם הכריש" onClose=${onClose}>
    <div class="flex flex-col gap-2">
      ${msgs.map((x, i) => html`<p key=${i} class=${cx('max-w-[88%] rounded-2xl px-3 py-2 text-[15px]', x.who === 'me' ? 'self-end bg-brand-600 text-white' : 'self-start bg-white shadow-sm')}>${x.text}</p>`)}
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      ${['למה דווקא התמהיל הזה?', 'מה אם אעלה מחירים?', 'איך מגיעים ליותר לידים?'].map((q) => html`<button key=${q} type="button" class="rounded-xl border-[1.5px] border-brand-300 bg-white px-3 py-1.5 text-[14px] font-bold text-brand-600 cursor-pointer" onClick=${() => send(q)}>${q}</button>`)}
    </div>
    <form class="mt-3 flex gap-2" onSubmit=${(e) => (e.preventDefault(), send(draft))}>
      <input class=${inputCls} placeholder="לכתוב לכריש" value=${draft} onInput=${(e) => setDraft(e.target.value)} />
      <${Button} variant="mini" type="submit">שליחה<//>
    </form>
  <//>`;
}

// The three scenarios: same start point, same equation (calc.rampPlan), different numbers.
const SCEN = {
  real: { label: 'ריאלי', icon: 'target', on: 'border-brand-600 bg-brand-50', text: 'text-brand-600',
    line: 'הבסיס של התוכנית: הצמיחה של עסק שמנוהל טוב, עם האטה וחודשים חלשים.' },
  low: { label: 'פסימי', icon: 'trending-down', on: 'border-warn bg-warn-50', text: 'text-warn',
    line: 'אם הולך לאט יותר ממה שחשבנו: התחלה מאוחרת, צמיחה איטית וחודשים חלשים יותר.' },
  high: { label: 'אופטימי', icon: 'trending-up', on: 'border-money bg-money-50', text: 'text-money',
    line: 'אם הולך מעל הציפיות: צמיחה מהירה, וחודשים חלשים פחות.' },
};
const inMonths = (n) => (n === 1 ? 'חודש אחד' : n === 2 ? 'חודשיים' : `${n} חודשים`);
const inYear = (fc) => fc.ramp != null && fc.ramp <= 12;

function ScenarioTabs({ s, all, value, onChange }) {
  return html`<div role="tablist" aria-label="תסריט" class="mb-3 grid grid-cols-3 gap-2">
    ${SCENARIO_KEYS.map((k) => {
      const x = SCEN[k];
      const fc = all[k];
      const sel = value === k;
      return html`<button key=${k} type="button" role="tab" aria-selected=${sel} class=${cx('flex flex-col items-start rounded-xl border-[1.5px] p-2.5 text-start transition cursor-pointer', sel ? x.on : 'border-line bg-white hover:border-brand-300')} onClick=${() => onChange(k)}>
        <span class=${cx('flex items-center gap-1 text-[14px] font-bold', sel ? x.text : 'text-ink')}><${Icon} name=${x.icon} size=${15} />${x.label}${paceEdited(s, k) ? html`<span class="text-[11px] font-semibold text-muted">· נערך</span>` : ''}</span>
        <span class="whitespace-nowrap font-display text-[16px] font-black leading-tight tabular-nums sm:text-[19px]">${inYear(fc) ? inMonths(fc.ramp) : 'יותר משנה'}</span>
        <span class="text-[12px] text-muted">עד חודש מלא</span>
      </button>`;
    })}
  </div>`;
}

// The equation of the selected scenario: closed behind a clear button. Open, it reads as
// five short points (Amit: points, not a graph); "לערוך" turns the numbers into fields.
function Equation({ s, up, fc, notify }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const key = fc.key;
  const P = paceOf(s, key);
  const p = fc.plan;
  const pct = (x) => `${num(x * 100, 1)}%`;
  const weak = weakIn(fc.rows).map(([k, why]) => `${monthName(k)} (${why})`).join(', ');
  const set = (f, v) => up((d) => (d.pace = { ...(d.pace || {}), [key]: { ...paceOf(d, key), [f]: v ?? 0 } }));
  const reset = () => { up((d) => { const x = { ...(d.pace || {}) }; delete x[key]; d.pace = x; }); notify(`חזרת למשוואה המקורית של התסריט ה${SCEN[key].label}`, 'rotate-ccw'); };
  const edited = paceEdited(s, key);
  const steps = [
    ['flag', p.fresh
      ? `${P.delay > 0 ? `${inMonths(P.delay)} של התארגנות, ואז ` : ''}לקוח ראשון${P.delay > 0 ? '' : ' כבר בחודש הראשון'}.`
      : `מתחילים מהיום: ${clientsText(p.from)} חדשים בחודש${P.delay > 0 ? `, בלי שינוי ב${inMonths(P.delay)} הראשונים` : ''}.`],
    ['trending-up', `כל חודש יותר לקוחות מהחודש שלפניו. הקצב מתחיל ב-${P.start}% ויורד בכל חודש ב-${P.slow}% מעצמו: אחרי חצי שנה ${pct(growAt(P, 7))}, אחרי שנה ${pct(growAt(P, 13))}.`],
    ['calendar-x', `בחודשים חלשים המכירות יורדות ב-${P.dip}% וחוזרות בחודש שאחרי${weak ? `: ${weak}` : ''}.`],
    ['receipt', fc.st.fixedGrow > 0 ? `גם ההוצאות גדלות: פרסום וכלים עולים יחד עם העסק, ובחודש מלא הם גבוהים ב-${P.cost}% (עוד ${fmt(fc.st.fixedGrow)} בחודש).` : `גם ההוצאות גדלות: פרסום וכלים עולים יחד עם העסק, ב-${P.cost}% בחודש מלא. כרגע אין לך הוצאות כאלה.`],
    ['clock', p.cap > 1.01 ? `התקרה: השעות שלך (${num(s.assumptions.hoursMonth)} בחודש). כשהן מלאות, המכירות נעצרות.` : 'התקרה: השעות שלך כבר כמעט מלאות בחודש מלא, אז מעליו כמעט אין לאן לגדול.'],
  ];
  const fields = [
    ['delay', 'חודשים עד שהצמיחה מתחילה', 'חודשים', 6],
    ['start', 'קצב הצמיחה בהתחלה', '%', 100],
    ['slow', 'בכל חודש הקצב יורד ב-', '%', 100],
    ['dip', 'בחודש חלש המכירות יורדות ב-', '%', 100],
    ['cost', 'פרסום וכלים עולים בחודש מלא ב-', '%', 200],
  ];
  return html`<div class="mb-3">
    <button type="button" aria-expanded=${open} class=${cx('flex w-full items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 text-start transition cursor-pointer', open ? 'border-brand-600 bg-brand-50' : 'border-brand-300 bg-white hover:border-brand-600')} onClick=${() => setOpen(!open)}>
      <span class="fb-chip-ic h-9 w-9 shrink-0"><${Icon} name="sigma" size=${18} /></span>
      <span class="min-w-0 flex-1"><b class="block text-[15px] text-brand-600">איך נבנתה התחזית</b><small class="text-[13px] text-muted">${edited ? 'ערכת אותה · ' : ''}המשוואה של התסריט ה${SCEN[key].label}. אפשר לשנות כל מספר</small></span>
      <${Icon} name=${open ? 'chevron-up' : 'chevron-down'} size=${20} class="shrink-0 text-brand-600" />
    </button>
    ${open && html`<div class="rise mt-2 rounded-xl border border-line bg-canvas p-3">
      <ol class="flex flex-col gap-2 text-[14px]">
        ${steps.map(([icon, text]) => html`<li key=${icon} class="flex items-start gap-2.5"><span class="fb-chip-ic h-7 w-7 shrink-0"><${Icon} name=${icon} size=${15} /></span><span class="pt-0.5">${text}</span></li>`)}
      </ol>
      <div class="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <${Button} variant="mini" onClick=${() => setEdit(!edit)}><${Icon} name=${edit ? 'check' : 'pencil'} size=${14} />${edit ? 'סיום עריכה' : 'לערוך את המספרים'}<//>
        ${edited && html`<button type="button" class="text-[13px] font-bold text-muted underline underline-offset-2 cursor-pointer" onClick=${reset}>להחזיר למקור</button>`}
      </div>
      ${edit && html`<div class="rise mt-3 grid gap-2 sm:grid-cols-2">
        ${fields.map(([f, label, unit, max]) => html`<label key=${f} class="flex flex-col gap-1 rounded-lg bg-white p-2.5 ring-1 ring-line">
          <span class="flex items-baseline justify-between gap-2 text-[13px] font-bold">${label}<small class="font-semibold text-muted">במקור ${PACE_DEFAULT[key][f]}</small></span>
          <${Money} suffix=${unit} label=${label} value=${P[f]} onChange=${(v) => set(f, Math.min(max, v ?? 0))} />
        </label>`)}
        <p class="text-[12px] text-muted sm:col-span-2">כל שינוי עובר מיד לגרף, לבדיקות ולשורה התחתונה של התסריט הזה.${key === 'real' ? ' התסריט הריאלי הוא גם הבסיס של הסיכום ושל "כמה צריך למכור".' : ''}</p>
      </div>`}
    </div>`}
  </div>`;
}

export function ForecastScreen({ s, up, m, notify, undoTo, onApply, onEditPick, onClearPicks }) {
  const [table, setTable] = useState(false);
  const [chat, setChat] = useState(false);
  const [scen, setScen] = useState('real');
  // Everything in part 4 follows the chosen scenario: the verdict, the checks and the fixes.
  const ms = { real: m, low: model(s, 'low'), high: model(s, 'high') };
  const all = { real: m.fc, low: ms.low.fc, high: ms.high.fc };
  const fc = all[scen];
  const mk = ms[scen];
  // The fixes come from the state before any pick, so the list stays and each pick can be taken back.
  const picks = s.picks || [];
  const base = s.fixBase ? withPicks(s, s.fixBase, []) : s;
  const list = fixes(base, scen);
  const baseVerdict = picks.length ? model(base, scen).verdict : null;
  const yearOk = fc.yearProfit >= fc.annualGoal;
  const reach = fc.reachIdx >= 0 ? fc.rows[fc.reachIdx] : null;
  const low = fc.minRow;
  const cashOk = low.cash >= 0;
  return html`<div class="mx-auto max-w-[1000px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 4 מתוך ${PARTS.length} · ${PARTS[3]}`} title=${['השנה ', 'הקרובה', ' במספרים']} sub="מתי מגיעים לחודש מלא, והאם המודל מחזיק." />

    <${Verdict} v=${mk.verdict} scen=${scen} />

    <${Section}
      title="מתי מגיעים לחודש מלא?"
      aside=${html`<div role="tablist" aria-label="תצוגה" class="flex shrink-0 rounded-xl border border-line bg-canvas p-0.5">
        ${[
          [false, 'גרף', 'chart-column'],
          [true, 'טבלה', 'table'],
        ].map(([v, label, icon]) => html`<button key=${label} type="button" role="tab" aria-selected=${table === v} class=${cx('flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-bold cursor-pointer', table === v ? 'bg-brand-600 text-white' : 'text-muted')} onClick=${() => setTable(v)}><${Icon} name=${icon} size=${15} />${label}</button>`)}
      </div>`}
    >
      <${ScenarioTabs} s=${s} all=${all} value=${scen} onChange=${setScen} />
      <p class="mb-3 font-display text-[24px] font-black leading-tight">${reach ? html`תוך ${inMonths(fc.ramp)}<span class="text-[17px] font-bold text-muted"> · ב${monthYear(reach.key)}</span>` : html`לא בשנה הקרובה<span class="text-[17px] font-bold text-muted"> · ${fc.ramp ? `בערך ${inMonths(fc.ramp)}` : 'בקצב הזה לא מגיעים'}</span>`}</p>
      ${table ? html`<${ForecastTable} fc=${fc} goal=${s.goal} />` : html`<${ForecastChart} fc=${fc} goal=${s.goal} /><div class="mt-2"><${ForecastLegend} cushion=${fc.cushion} /></div>`}
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <div class=${cx('rounded-xl p-3', yearOk ? 'bg-money-50' : 'bg-warn-50')}>
          <small class="block text-[13px] font-bold text-muted">יישאר לך בשנה הקרובה</small>
          <b class="font-display text-[22px] tabular-nums">${fmt(fc.yearProfit)}</b>
          <span class=${cx('ms-1 text-[14px] font-bold', yearOk ? 'text-money' : 'text-warn')}>${yearOk ? 'מעל היעד' : `חסרים ${fmt(fc.annualGoal - fc.yearProfit)} ליעד`}</span>
        </div>
        <div class=${cx('rounded-xl p-3', cashOk ? 'bg-money-50' : 'bg-error-50')}>
          <small class="block text-[13px] font-bold text-muted">הכסף בעסק, בנקודה הכי נמוכה</small>
          <b class=${cx('font-display text-[22px] tabular-nums', !cashOk && 'text-error')}>${fmt(low.cash)}</b>
          <span class="ms-1 text-[14px]">ב${monthYear(low.key)}</span>
        </div>
      </div>
      <p class="mt-2 text-[13px] text-muted">לפני מס. ${SCEN[scen].line}</p>
      <div class="mt-3"><${Equation} s=${s} up=${up} fc=${fc} notify=${notify} /></div>
    <//>

    <${Section} title="הבדיקות"><${Checks} list=${mk.checks} brief /><//>

    ${list.length > 0 &&
    html`<${Section} title="מה אפשר לשנות" sub=${`הכריש מציע, ${g('אתה בוחר', 'את בוחרת')}. אפשר לבחור כמה, ולבטל.`}>
      ${picks.length > 0 &&
      html`<div class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-3 text-[14px]">
        <p>לפני: <b class=${TONE[baseVerdict.tone].text}>${baseVerdict.title}</b> · עכשיו: <b class=${TONE[mk.verdict.tone].text}>${mk.verdict.title}</b></p>
        <button type="button" class="text-[13px] font-bold text-muted underline underline-offset-2 cursor-pointer" onClick=${onClearPicks}>לבטל הכל</button>
      </div>`}
      <ul class="grid gap-3 md:grid-cols-2">${list.map((fx) => html`<${FixCard} key=${fx.id + scen} fx=${fx} pick=${picks.find((p) => p.id === fx.d.id)} base=${base} scen=${scen} onApply=${(d) => onApply(fx, d)} onEdit=${onEditPick} />`)}</ul>
    <//>`}
    <div class="flex flex-wrap items-center gap-3">
      <${Button} variant="secondary" onClick=${() => setChat(true)}><${SharkAvatar} size=${26} />לדבר על זה עם הכריש<//>
      ${mk.verdict.tone !== 'ok' && html`<p class="text-[14px] text-muted">אפשר לסיים את השלב גם ככה.</p>`}
    </div>
    ${chat && html`<${SharkChat} m=${m} onClose=${() => setChat(false)} />`}
  </div>`;
}

export { Checks, Verdict, Dot, TONE };
