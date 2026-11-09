// Step 5 "העסק במספרים": the opening, the stage question, part 1 (the situation today,
// by stage) and part 2 (the prices, written back to the basket).
import { html, useState, useRef, Icon, PencilLine, cx, parseNum } from './lib.js';
import { Button, Note, StepHeading, PartnerNote, FillButton } from './components.js';
import { Chips, Field, inputCls, Tag, Sheet } from './ui.js';
import { TODAY, USER, STAGES, PARTS, CATEGORIES, FREQS, TERMS, SHARK_EXPENSES, SETTINGS, DEMO_REPORT, nextId, g, stageOf } from './data.js';
import {
  fmt, num, monthName, monthYear, monthlyCost, FORECAST_MONTHS, setupSummary, paidOf, todayAvg, runway, fixedMonthly,
  netPrice, profitPerSale, perHour, paidProducts, missingOf, isLicensed, cushionTarget,
} from './calc.js';

// ---------- small shared inputs ----------

export function Money({ value, onChange, onBlur, onFocus, placeholder = '', label, invalid, class: cls = '', suffix = '₪' }) {
  return html`<span class=${cx('relative block', cls)}>
    <input
      type="number"
      inputmode="numeric"
      min="0"
      aria-label=${label}
      placeholder=${placeholder}
      class=${cx(inputCls, 'pe-9 tabular-nums', invalid && '!border-error ring-4 ring-error-50')}
      value=${value ?? ''}
      onInput=${(e) => onChange(parseNum(e.target.value))}
      onFocus=${onFocus}
      onBlur=${onBlur}
    />
    <span class="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-muted">${suffix}</span>
  </span>`;
}

export function Stepper({ value, onChange, min = 0, label }) {
  const btn = 'grid h-9 w-9 place-items-center rounded-lg border-[1.5px] border-line bg-white text-brand-600 hover:border-brand-300 cursor-pointer disabled:cursor-not-allowed disabled:text-faint';
  return html`<span class="inline-flex items-center gap-1.5" role="group" aria-label=${label}>
    <button type="button" class=${btn} aria-label="פחות" disabled=${value <= min} onClick=${() => onChange(Math.max(min, value - 1))}><${Icon} name="minus" size=${16} /></button>
    <b class="w-8 text-center font-display text-[20px] tabular-nums">${value}</b>
    <button type="button" class=${btn} aria-label="יותר" onClick=${() => onChange(value + 1)}><${Icon} name="plus" size=${16} /></button>
  </span>`;
}

export const YesNo = ({ value, onChange }) =>
  html`<${Chips} options=${[{ id: true, label: 'כן' }, { id: false, label: 'לא' }]} value=${value} onChange=${onChange} />`;

export function Section({ n, title, sub, children, aside, class: cls = '' }) {
  return html`<section class=${cx('fb-panel mb-5 !p-4 md:!p-6', cls)}>
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 class="fb-h3 flex items-center gap-2">${n && html`<span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[14px] font-black text-brand-600">${n}</span>`}${title}</h2>
        ${sub && html`<p class="mt-0.5 text-[14px] text-muted">${sub}</p>`}
      </div>
      ${aside}
    </div>
    ${children}
  </section>`;
}

// A result line on the page: the number that the part ends with.
export function Result({ icon = 'sparkles', title, big, children, tone = 'blue' }) {
  const ring = { blue: 'border-brand-300 bg-brand-50', ok: 'border-money/30 bg-money-50', warn: 'border-warn/30 bg-warn-50', bad: 'border-error/30 bg-error-50' }[tone];
  return html`<div class=${cx('rise mb-5 flex items-start gap-3 rounded-2xl border-[1.5px] p-4 md:p-5', ring)} role="status">
    <span class="mt-0.5 text-brand-600"><${Icon} name=${icon} size=${24} /></span>
    <div class="min-w-0">
      <p class="text-[14px] font-bold text-muted">${title}</p>
      <p class="font-display text-[24px] font-black leading-tight md:text-[28px]">${big}</p>
      ${children && html`<div class="mt-1 text-[15px]">${children}</div>`}
    </div>
  </div>`;
}

const Kv = ({ k, v, strong }) => html`<div class="flex items-baseline justify-between gap-3 py-1.5"><span class="text-[15px]">${k}</span><span class=${cx('tabular-nums', strong ? 'font-display text-[18px] font-black' : 'font-bold')}>${v}</span></div>`;

// ---------- opening (first entry only) ----------

export function Opening() {
  return html`<div class="mx-auto grid max-w-[1120px] items-center gap-8 px-4 py-6 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:px-8 md:py-8">
    <div>
      <${StepHeading} n="5" eyebrow="שלב 5 · שביל הכסף" title=${['', 'העסק', ' במספרים']} />
      <p class="mb-6 max-w-[50ch] text-[18px] text-ink">${g('נבדוק', 'נבדוק')} יחד אם העסק שבנית יכול להחזיק אותך: כמה כסף יש היום, כמה כל מוצר מכניס, כמה צריך למכור כדי להגיע ליעד, ותחזית לשנה קדימה. בסוף תדע${g('', 'י')} אם המודל עובד, ואם לא, מה בדיוק לשנות.</p>
      <div class="flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1"><${Icon} name="list" size=${17} class="text-brand-600" /><b>החלקים:</b> ${PARTS.join(' · ')}</p>
        <p class="flex items-center gap-2"><${Icon} name="clock" size=${17} class="text-brand-600" /><b>זמן:</b> כ-25 דקות</p>
        <p class="flex items-center gap-2"><${Icon} name="file-check-2" size=${17} class="text-brand-600" /><b>התוצר:</b> התוכנית העסקית שלך, עם תחזית לשנה</p>
      </div>
    </div>
    <div class="relative flex justify-center pb-8">
      <${Note} tone="white" tilt=${1.2} class="w-[300px] !p-5">
        <span class="fb-note-kicker">התוכנית העסקית שלך</span>
        <div class="mt-2 flex flex-col gap-1 text-[15px]">
          <${Kv} k="היעד בחודש" v=${fmt(12000)} />
          <${Kv} k="צריך להכניס" v=${fmt(16900)} />
          <${Kv} k="לקוחות חדשים בחודש" v="3" />
        </div>
        <svg viewBox="0 0 260 70" class="mt-3 w-full" aria-hidden="true">
          ${[8, 15, 25, 34, 42, 50, 54, 56, 56, 56, 56, 56].map((h, i) => html`<rect x=${i * 21 + 4} y=${66 - h} width="14" height=${h} rx="2" fill=${h >= 52 ? '#0038b8' : '#8fb3ef'} />`)}
          <line x1="0" x2="260" y1="14" y2="14" stroke="#2d3e66" stroke-width="1.5" stroke-dasharray="5 4" />
        </svg>
        <p class="mt-2 flex items-center gap-1.5 font-display text-[18px] font-black text-brand-600"><${Icon} name="badge-check" size=${20} />המודל עובד</p>
      <//>
      <span class="hand absolute bottom-0 left-4 rotate-[-4deg] whitespace-nowrap text-[26px]">מספרים, לא תחושות</span>
    </div>
  </div>`;
}

// ---------- where the business stands (the finance center's old first question) ----------

export function StageScreen({ s, up }) {
  return html`<div class="mx-auto max-w-[860px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 1 מתוך 5 · ${PARTS[0]}`} title=${['איפה העסק ', 'עומד', ' היום?']} sub="לפי התשובה נשאל רק מה שרלוונטי לך, והמרכז הפיננסי ייפתח על הלוח שמתאים לעסק." />
    <div class="flex flex-col gap-3" role="radiogroup" aria-label="איפה העסק עומד היום">
      ${STAGES.map(
        (st) => html`<button
          key=${st.id}
          type="button"
          role="radio"
          aria-checked=${s.stage === st.id}
          class=${cx('fb-tile w-full !p-4 text-start', s.stage === st.id && 'is-on')}
          onClick=${() => up((d) => (d.stage = st.id))}
        >
          <span class="fb-chip-ic"><${Icon} name=${st.icon} size=${24} /></span>
          <span class="min-w-0 flex-1"><b>${st.label}</b><small class="block !text-[14px]">${st.sub}</small></span>
          <span class=${cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2', s.stage === st.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-line')}>${s.stage === st.id && html`<${Icon} name="check" size=${14} strokeWidth=${3} />`}</span>
        </button>`,
      )}
    </div>
    ${s.done && html`<p class="mt-4 text-[14px] text-muted">אם העסק עבר שלב מאז הפעם הקודמת, אפשר לבחור מחדש. התחזית והתוכנית יתעדכנו, עם התאריך.</p>`}
  </div>`;
}

// ---------- part 1: the situation today ----------

function MoneyNow({ s, up }) {
  const has = s.bank.has;
  return html`<${Section} title="הכסף של העסק היום" sub="נכנס גם לרשימת ההכנה במרכז הפיננסי: חשבון בנק נפרד.">
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <p class="mb-1 text-[14px] font-bold">יש לעסק חשבון בנק נפרד?</p>
        <${YesNo} value=${has} onChange=${(v) => up((d) => (d.bank.has = v))} />
      </div>
      ${has != null &&
      html`<${Field} class="!mb-0 rise" label=${has ? 'כמה יש היום בחשבון הבנק של העסק?' : 'כמה כסף יש היום לעסק?'} hint=${has ? 'היתרה כמו שהיא בבנק היום' : 'כל הכסף ששמת בצד לעסק, גם אם הוא בחשבון הפרטי'}>
        <${Money} label="סכום" value=${s.bank.amount} onChange=${(v) => up((d) => (d.bank.amount = v))} />
      <//>`}
    </div>
  <//>`;
}

function SetupBudget({ s, up, notify }) {
  const sum = setupSummary(s);
  const set = (id, fn) => up((d) => fn(d.setup.find((x) => x.id === id)));
  const remove = (it) => {
    up((d) => (d.setup = d.setup.filter((x) => x.id !== it.id)), `${it.name} נמחק`);
  };
  return html`<${Section} n="1" title="תקציב ההקמה" sub="הוצאות חד-פעמיות כדי להתחיל: מה תכננת, ומה כבר שילמת.">
    <${Field} label="כמה כסף הקצית להקמת העסק?" class="max-w-xs">
      <${Money} label="תקציב ההקמה" value=${s.setupBudget} onChange=${(v) => up((d) => (d.setupBudget = v))} />
    <//>
    <ul class="flex flex-col divide-y divide-line border-y border-line">
      ${s.setup.map(
        (it) => html`<li key=${it.id} class="grid gap-2 py-3 md:grid-cols-[1.3fr_150px_1.6fr_auto] md:items-center">
          <input class=${cx(inputCls, 'font-bold')} aria-label="שם הפריט" value=${it.name} onInput=${(e) => set(it.id, (x) => (x.name = e.target.value))} />
          <${Money} label="מתוכנן" value=${it.planned} onChange=${(v) => set(it.id, (x) => (x.planned = v))} />
          <div class="flex flex-wrap items-center gap-2">
            <${Chips} small options=${[{ id: 'all', label: 'שולם הכל' }, { id: 'part', label: 'שולם חלק' }, { id: 'none', label: 'עוד לא' }]} value=${it.paid} onChange=${(v) => set(it.id, (x) => ((x.paid = v), v === 'part' && !x.paidAmount && (x.paidAmount = Math.round(x.planned / 2))))} />
            ${it.paid === 'part' && html`<span class="flex items-center gap-2"><span class="text-[13px] font-bold text-muted">שולמו</span><${Money} class="w-[120px]" label="כמה שולם" value=${it.paidAmount} onChange=${(v) => set(it.id, (x) => (x.paidAmount = v))} /></span>`}
          </div>
          <button type="button" class="justify-self-end rounded-lg p-2 text-muted hover:bg-error-50 hover:text-error cursor-pointer" aria-label=${`מחיקת ${it.name}`} onClick=${() => remove(it)}><${Icon} name="trash-2" size=${17} /></button>
        </li>`,
      )}
    </ul>
    <${Button} variant="mini" class="mt-3" onClick=${() => up((d) => d.setup.push({ id: nextId('s'), name: '', icon: 'circle-dot', planned: null, paid: 'none', paidAmount: 0 }))}><${Icon} name="plus" size=${15} />פריט להקמה<//>
    <div class="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-canvas p-3 md:grid-cols-4">
      ${[
        ['מתוכנן', fmt(sum.planned)],
        ['כבר שולם', fmt(sum.paid)],
        ['עוד לשלם', fmt(sum.left - sum.reserve)],
        [sum.over ? 'מעל התקציב' : 'עוד לא שובץ', fmt(sum.over || sum.reserve)],
      ].map(([k, v], i) => html`<div key=${k}><small class=${cx('block text-[12px] font-bold', i === 3 && sum.over ? 'text-error' : 'text-muted')}>${k}</small><b class="font-display text-[18px] tabular-nums">${v}</b></div>`)}
    </div>
    ${sum.reserve > 0 && html`<p class="mt-2 text-[13px] text-muted">הסכום שעוד לא שובץ נשמר בצד כרזרבה להקמה, ונספר כהוצאה שעוד תבוא.</p>`}
  <//>`;
}

function ExpenseRow({ x, set, remove }) {
  const sel = 'h-11 rounded-xl border-[1.5px] border-line bg-white px-2 text-[15px] cursor-pointer outline-none focus:border-brand-600';
  return html`<li class="grid gap-2 py-3 md:grid-cols-[1.3fr_115px_110px_135px_140px_auto] md:items-center">
    <input class=${cx(inputCls, 'font-bold')} aria-label="שם ההוצאה" placeholder="שם ההוצאה" value=${x.name} onInput=${(e) => set((y) => (y.name = e.target.value))} />
    <${Money} label="סכום" value=${x.amount} onChange=${(v) => set((y) => (y.amount = v))} />
    <select class=${sel} aria-label="כל כמה זמן" value=${x.freq} onChange=${(e) => set((y) => (y.freq = e.target.value))}>
      ${FREQS.map((f) => html`<option value=${f.id}>${f.label}</option>`)}
    </select>
    <select class=${sel} aria-label="קטגוריה" value=${x.category} onChange=${(e) => set((y) => (y.category = e.target.value))}>
      ${Object.entries(CATEGORIES).map(([id, c]) => html`<option value=${id}>${c.label}</option>`)}
    </select>
    <select class=${sel} aria-label="מתי מתחיל" value=${x.start || 'now'} onChange=${(e) => set((y) => (y.start = e.target.value))}>
      <option value="now">${g('כבר משלם', 'כבר משלמת')}</option>
      ${FORECAST_MONTHS.map((k) => html`<option value=${k}>מ${monthYear(k)}</option>`)}
    </select>
    <button type="button" class="justify-self-end rounded-lg p-2 text-muted hover:bg-error-50 hover:text-error cursor-pointer" aria-label=${`מחיקת ${x.name}`} onClick=${remove}><${Icon} name="trash-2" size=${17} /></button>
  </li>`;
}

function Expenses({ s, up, n }) {
  const have = new Set(s.expenses.map((x) => x.name));
  const sugg = SHARK_EXPENSES.filter((x) => !have.has(x.name)).slice(0, 4);
  const total = fixedMonthly(s);
  return html`<${Section}
    n=${n}
    title="הוצאות קבועות"
    sub="מה יוצא כל חודש, כל שבוע או פעם בשנה. אפשר לסמן הוצאה שתתחיל רק בעוד כמה חודשים."
    aside=${html`<span class="shrink-0 text-end"><small class="block text-[12px] font-bold text-muted">בחודש</small><b class="font-display text-[20px] tabular-nums">${fmt(total)}</b></span>`}
  >
    <div class="mb-1 hidden grid-cols-[1.3fr_115px_110px_135px_140px_auto] gap-2 text-[12px] font-bold text-muted md:grid">
      <span>הוצאה</span><span>סכום</span><span>כל כמה זמן</span><span>קטגוריה</span><span>מתי מתחיל</span><span class="w-9"></span>
    </div>
    <ul class="flex flex-col divide-y divide-line border-y border-line">
      ${s.expenses.map(
        (x) => html`<${ExpenseRow}
          key=${x.id}
          x=${x}
          set=${(fn) => up((d) => fn(d.expenses.find((y) => y.id === x.id)))}
          remove=${() => up((d) => (d.expenses = d.expenses.filter((y) => y.id !== x.id)), `${x.name || 'ההוצאה'} נמחקה`)}
        />`,
      )}
      ${!s.expenses.length && html`<li class="py-4 text-center text-[14px] text-muted">עוד אין הוצאות. אפשר להתחיל מההצעות של הכריש.</li>`}
    </ul>
    <${Button} variant="mini" class="mt-3" onClick=${() => up((d) => d.expenses.push({ id: nextId('x'), name: '', amount: null, category: 'other', freq: 'monthly', day: 1, start: 'now' }))}><${Icon} name="plus" size=${15} />הוצאה<//>
    ${sugg.length > 0 &&
    html`<div class="mt-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3">
      <p class="mb-2 flex items-center gap-2 text-[14px] font-bold"><img src="assets/shark/shark-thinking-sm.svg" alt="" class="h-6 w-6 rounded-full bg-white" />הכריש: ${g('יועצי', 'יועצות')} שיווק בדרך כלל משלמים גם על</p>
      <div class="flex flex-wrap gap-2">
        ${sugg.map(
          (x) => html`<button key=${x.name} type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl border-[1.5px] border-brand-300 bg-white px-3 text-[14px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${() => up((d) => d.expenses.push({ ...x, id: nextId('x'), start: 'now' }), `${x.name} נוסף`)}>
            <${Icon} name="plus" size=${14} />${x.name} · ${fmt(x.amount)} ${x.freq === 'weekly' ? 'בשבוע' : x.freq === 'yearly' ? 'בשנה' : 'בחודש'}
          </button>`,
        )}
      </div>
    </div>`}
  <//>`;
}

// The P&L upload (moved here from the finance center's first entry; same review screen).
function ImportSheet({ onClose, onApply }) {
  const [step, setStep] = useState('pick');
  return html`<${Sheet} title="דוח רווח והפסד" wide onClose=${onClose} footer=${step === 'review' && html`<${Button} variant="secondary" onClick=${onClose}>ביטול<//><${Button} onClick=${onApply}>אישור והכנסה לשלב<${Icon} name="check" size=${18} /><//>`}>
    ${step === 'pick'
      ? html`<button type="button" class="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-white p-8 text-center hover:bg-brand-50 cursor-pointer" onClick=${() => setStep('review')}>
          <span class="text-brand-600"><${Icon} name="file-spreadsheet" size=${36} /></span>
          <b class="text-[17px]">לבחור קובץ אקסל</b>
          <small class="text-[14px] text-muted">דוח רווח והפסד מרואה החשבון או מתוכנת הנהלת החשבונות. הכריש קורא אותו ומחלק לחודשים.</small>
          <small class="text-[12px] text-faint">במוק-אפ: נטען קובץ לדוגמה</small>
        </button>`
      : html`<div class="rise">
          <p class="mb-3 flex items-center gap-2 text-[14px]"><${Icon} name="file-check-2" size=${18} class="text-brand-600" /><b>${DEMO_REPORT.file}</b> · נמצאו 6 חודשים. כדאי לעבור על המספרים לפני שמכניסים.</p>
          <table class="mb-4 w-full text-[14px]">
            <thead><tr class="text-[12px] font-bold text-muted"><th class="pb-1 text-start">חודש</th><th class="pb-1 text-start">הכנסות</th><th class="pb-1 text-start">לקוחות</th></tr></thead>
            <tbody>${DEMO_REPORT.months.map((m) => html`<tr key=${m.key} class="border-t border-line tabular-nums"><td class="py-1.5 font-bold">${monthYear(m.key)}</td><td class="py-1.5">${fmt(m.income)}</td><td class="py-1.5">${m.clients}</td></tr>`)}</tbody>
          </table>
          <p class="mb-1 text-[14px] font-bold">הוצאות קבועות שנמצאו בדוח</p>
          <p class="text-[14px] text-muted">${DEMO_REPORT.expenseLines.map((x) => `${x.name} ${fmt(x.amount)}`).join(' · ')}. הן כבר ברשימת ההוצאות שלך, אז לא נוספות שוב.</p>
        </div>`}
  <//>`;
}

function History({ s, up, notify }) {
  const [sheet, setSheet] = useState(false);
  const mode = s.history.mode;
  const avg = todayAvg(s);
  return html`<${Section} n="1" title="ששת החודשים האחרונים" sub="כמה נכנס בכל חודש, ומכמה לקוחות. מזה נחשב איך נראה חודש ממוצע היום.">
    ${mode !== 'manual' &&
    mode !== 'file' &&
    html`<div class="grid gap-3 md:grid-cols-2">
      <button type="button" class="lp-option !p-4" onClick=${() => setSheet(true)}>
        <span class="text-brand-600"><${Icon} name="file-spreadsheet" size=${26} /></span>
        <span><b class="block text-[16px]">להעלות דוח רווח והפסד</b><small class="text-[13px] text-muted">קובץ אקסל, הכריש מחלק לחודשים</small></span>
      </button>
      <button type="button" class="lp-option !p-4" onClick=${() => up((d) => (d.history.mode = 'manual'))}>
        <span class="text-brand-600"><${Icon} name="pencil" size=${26} /></span>
        <span><b class="block text-[16px]">למלא בעצמי</b><small class="text-[13px] text-muted">שתי שורות לכל חודש</small></span>
      </button>
    </div>`}
    ${(mode === 'manual' || mode === 'file') &&
    html`<div class="rise">
      ${mode === 'file' && html`<p class="mb-2 flex items-center gap-2 text-[14px]"><${Tag} tone="blue"><${Icon} name="file-check-2" size=${13} />מהדוח<//>אפשר לתקן כל מספר.</p>`}
      <div class="thin-scroll overflow-x-auto">
        <table class="w-full min-w-[520px] text-[14px]">
          <thead><tr class="text-[12px] font-bold text-muted"><th class="pb-1 text-start">חודש</th><th class="pb-1 text-start">כמה נכנס</th><th class="pb-1 text-start">כמה לקוחות שילמו</th></tr></thead>
          <tbody>
            ${s.history.months.map(
              (m, i) => html`<tr key=${m.key} class="border-t border-line">
                <td class="py-1.5 pe-2 font-bold">${monthYear(m.key)}</td>
                <td class="py-1.5 pe-2"><${Money} label=${`הכנסות ${monthName(m.key)}`} value=${m.income} onChange=${(v) => up((d) => (d.history.months[i].income = v))} /></td>
                <td class="py-1.5"><${Money} suffix="" label=${`לקוחות ${monthName(m.key)}`} value=${m.clients} onChange=${(v) => up((d) => (d.history.months[i].clients = v))} /></td>
              </tr>`,
            )}
          </tbody>
        </table>
      </div>
      ${avg && html`<p class="mt-2 text-[14px]">בממוצע: <b class="tabular-nums">${fmt(avg.gross)}</b> בחודש, מ-<b class="tabular-nums">${num(avg.clients, 1)}</b> לקוחות.</p>`}
      ${mode === 'manual' && html`<button type="button" class="mt-1 text-[14px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => setSheet(true)}>יש לך דוח רווח והפסד? להעלות במקום</button>`}
    </div>`}
    ${sheet &&
    html`<${ImportSheet}
      onClose=${() => setSheet(false)}
      onApply=${() => {
        setSheet(false);
        up((d) => (d.history = { mode: 'file', months: DEMO_REPORT.months.map((m) => ({ ...m })) }), 'הדוח נכנס: 6 חודשים');
      }}
    />`}
  <//>`;
}

function ToCome({ s, up, n }) {
  const boxes = [
    ['now', 'החודש', `עד סוף ${monthName(TODAY.slice(0, 7))}`],
    ['next', 'בחודש הבא', monthName(FORECAST_MONTHS[0])],
    ['later', 'אחר כך', 'מ' + monthName(FORECAST_MONTHS[1]) + ' והלאה'],
  ];
  return html`<${Section} n=${n} title="כסף שעוד מגיע מלקוחות" sub=${`תשלומים שלקוחות כבר התחייבו אליהם${s.stage === 'active' ? ', בלי ההכנסה הקבועה' : ''}. רק סכומים: לקוח-לקוח מוסיפים אחר כך במרכז הפיננסי.`}>
    <div class="grid gap-3 sm:grid-cols-3">
      ${boxes.map(([k, label, hint]) => html`<${Field} key=${k} class="!mb-0" label=${label} hint=${hint}><${Money} label=${label} value=${s.toCome[k]} onChange=${(v) => up((d) => (d.toCome[k] = v))} /><//>`)}
    </div>
  <//>`;
}

function SetupDone({ s, up, n }) {
  return html`<${Section} n=${n} title="ההקמה הסתיימה?" sub="אם יש עוד הוצאה חד-פעמית שמחכה (ציוד, אתר, קמפיין השקה), היא יוצאת מהכסף של העסק.">
    <div class="flex flex-wrap items-end gap-4">
      <${YesNo} value=${s.setupDone} onChange=${(v) => up((d) => ((d.setupDone = v), v && (d.setupLeft = 0)))} />
      ${s.setupDone === false && html`<${Field} class="!mb-0 w-[220px] rise" label="כמה עוד נשאר לשלם?"><${Money} label="נשאר לשלם" value=${s.setupLeft} onChange=${(v) => up((d) => (d.setupLeft = v))} /><//>`}
    </div>
  <//>`;
}

function Regular({ s, up }) {
  return html`<${Section} n="4" title="הכנסה קבועה מלקוחות קבועים" sub="ריטיינרים ומנויים שנכנסים כל חודש. רק הסכום הכולל: לקוח-לקוח מוסיפים אחר כך במרכז הפיננסי.">
    <div class="grid gap-4 sm:grid-cols-2">
      <${Field} class="!mb-0" label="כמה נכנס כל חודש?"><${Money} label="הכנסה קבועה" value=${s.regular.amount} onChange=${(v) => up((d) => (d.regular.amount = v))} /><//>
      <${Field} class="!mb-0" label="באיזה יום בחודש?">
        <select class="h-11 w-full rounded-xl border-[1.5px] border-line bg-white px-3 text-[16px] cursor-pointer" value=${s.regular.day} onChange=${(e) => up((d) => (d.regular.day = Number(e.target.value)))}>
          ${[1, 5, 10, 15, 20, 25, 28].map((d) => html`<option value=${d}>ב-${d} לחודש</option>`)}
        </select>
      <//>
    </div>
  <//>`;
}

function Cushion({ s, up }) {
  const target = cushionTarget(s);
  const have = s.bank.amount || 0;
  return html`<${Section} n="6" title="כרית ביטחון" sub="כסף שנשאר בעסק לחודש חלש. ברירת המחדל: הוצאות של חודשיים.">
    <div class="grid items-end gap-4 sm:grid-cols-[220px_1fr]">
      <${Field} class="!mb-0" label="כמה צריך להיות בכרית?" hint=${s.cushion == null ? `חודשיים של הוצאות: ${fmt(target)}` : 'קבעת בעצמך'}>
        <${Money} label="כרית ביטחון" value=${target} onChange=${(v) => up((d) => (d.cushion = v))} />
      <//>
      <div class="pb-6">
        <div class="mb-1 flex justify-between text-[13px] font-bold"><span>בחשבון היום ${fmt(have)}</span><span class="text-muted">מתוך ${fmt(target)}</span></div>
        <div class="h-3 overflow-hidden rounded-full bg-[#e3ddd0]"><div class="h-full rounded-full bg-warn" style=${{ width: `${Math.min(100, (have / (target || 1)) * 100)}%` }}></div></div>
        <p class="mt-1 text-[13px] text-muted">${have >= target ? 'הכרית מלאה.' : `חסרים ${fmt(target - have)}. בחלק 3 נקבע תוך כמה זמן ממלאים אותה.`}</p>
      </div>
    </div>
  <//>`;
}

export function TodayScreen({ s, up, notify, onStage }) {
  const st = stageOf(s.stage);
  const rw = runway(s);
  const avg = todayAvg(s);
  return html`<div class="mx-auto max-w-[1000px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 1 מתוך 5 · ${PARTS[0]} · ${st.board}`} title=${s.stage === 'setup' ? ['כמה כסף יש ', 'להקמה', '?'] : ['איך נראה ', 'חודש', ' היום?']} sub=${s.stage === 'setup' ? 'עוד אין הכנסה, אז נבדוק כמה זמן הכסף מחזיק.' : 'ממה שכבר קרה נבנה את נקודת ההתחלה של התחזית.'}>
      <button type="button" class="mt-1 inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${onStage} title="לשנות את מצב העסק"><${Icon} name=${st.icon} size=${15} />${st.label}</button>
    <//>
    <${MoneyNow} s=${s} up=${up} />
    ${s.stage === 'setup' &&
    html`<${SetupBudget} s=${s} up=${up} notify=${notify} />
      <${Expenses} s=${s} up=${up} n="2" />
      ${rw &&
      html`<${Result} icon="hourglass" tone=${rw.months < 3 ? 'warn' : 'blue'} title="בלי הכנסה בכלל, הכסף מחזיק" big=${rw.until ? `עד ${monthYear(rw.until)}` : 'יותר משנתיים'}>
        ${fmt(s.bank.amount)} היום, פחות ${fmt(setupSummary(s).left)} שעוד יוצאים על ההקמה, ו-${fmt(fixedMonthly(s))} הוצאות בחודש: <b>${num(rw.months, 1)} חודשים</b>.
      <//>`}`}
    ${s.stage !== 'setup' &&
    html`<${History} s=${s} up=${up} notify=${notify} />
      <${ToCome} s=${s} up=${up} n="2" />
      <${Expenses} s=${s} up=${up} n="3" />
      ${s.stage === 'active' && html`<${Regular} s=${s} up=${up} />`}
      <${SetupDone} s=${s} up=${up} n=${s.stage === 'active' ? '5' : '4'} />
      ${s.stage === 'active' && html`<${Cushion} s=${s} up=${up} />`}
      ${avg &&
      html`<${Result} icon="calendar-range" tone=${avg.left < 0 ? 'warn' : 'blue'} title="חודש ממוצע היום" big=${`נשארים ${fmt(avg.left)}`}>
        <span class="flex flex-wrap gap-x-4 gap-y-1">
          <span>נכנס ${fmt(avg.income)}${isLicensed(s) ? ' (בלי מע"מ)' : ''}</span>
          <span>יוצא ${fmt(avg.out)}</span>
          <span>הפרשה למס ${fmt(avg.tax)}</span>
        </span>
        ${rw && html`<span class="mt-1 block">עם הכסף שעוד מגיע, ובלי מכירות חדשות, הכסף מחזיק <b>${rw.until ? `עד ${monthYear(rw.until)}` : 'יותר משנתיים'}</b>.</span>`}
      <//>`}`}
  </div>`;
}

// ---------- part 2: the prices (from the basket, written back to it) ----------

const KIND = { one: 'מכירה אחת', program: (p) => `תוכנית של ${p.months} חודשים`, monthly: 'מנוי חודשי' };
const kindText = (p) => (typeof KIND[p.kind] === 'function' ? KIND[p.kind](p) : KIND[p.kind]);

function ProductCard({ s, p, set, onBasket }) {
  const before = useRef(null);
  const miss = missingOf(p);
  const ph = perHour(s, p);
  const field = (key, label, hint, suffix = '₪') => html`<${Field} class="!mb-0" label=${label} hint=${hint}>
    <${Money}
      suffix=${suffix}
      label=${label}
      invalid=${p[key] == null}
      value=${p[key]}
      onFocus=${() => (before.current = p[key])}
      onBlur=${() => before.current !== p[key] && onBasket(p, key, before.current)}
      onChange=${(v) => set((x) => (x[key] = v))}
    />
  <//>`;
  return html`<article class=${cx('fb-panel !p-4 md:!p-5', miss.length && '!ring-2 !ring-error/40')}>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h3 class="fb-h3 min-w-0 flex-1">${p.name}</h3>
      ${p.role === 'core' && html`<${Tag} tone="blue">מוצר הליבה<//>`}
      <${Tag}>${kindText(p)}<//>
      ${miss.length > 0 && html`<${Tag} tone="fix">חסר: ${miss.join(', ')}<//>`}
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
      ${field('price', p.kind === 'monthly' ? 'מחיר לחודש' : 'מחיר', 'כולל מע"מ')}
      ${field('cost', 'עלות למכירה', 'מה זה עולה לעסק, בלי הזמן שלך')}
      ${field('hours', p.kind === 'monthly' ? 'שעות עבודה בחודש' : 'שעות עבודה', p.kind === 'program' ? `סה"כ, על פני ${p.months} חודשים` : 'כולל הכנה', 'שעות')}
    </div>
    <div class="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-[1fr_1.3fr] md:items-center">
      <p class="text-[15px]">
        ${g('כמה אתה מרוויח', 'כמה את מרוויחה')} על שעת עבודה:
        <b class="ms-1 font-display text-[20px] tabular-nums text-brand-600">${ph != null && !miss.length ? fmt(ph) : '—'}</b>
        ${isLicensed(s) && p.price ? html`<span class="block text-[12px] text-muted">מתוך ${fmt(p.price)} נשארים לך ${fmt(netPrice(s, p))}, השאר מע"מ</span>` : ''}
      </p>
      <div>
        <p class="mb-1 text-[13px] font-bold">איך משלמים?</p>
        ${p.kind === 'monthly'
          ? html`<${Tag} tone="blue"><${Icon} name="repeat" size=${13} />מנוי חודשי, כל חודש עד שמבטלים<//>`
          : html`<${Chips} small options=${TERMS.filter((t) => t.id !== 'monthly')} value=${p.terms} onChange=${(v) => set((x) => (x.terms = v))} />`}
      </div>
    </div>
  </article>`;
}

function NewProduct({ onAdd, onCancel, first }) {
  const [d, setD] = useState({ name: '', price: null, cost: 0, hours: null, kind: 'one', months: 3, terms: 'one' });
  const ok = d.name.trim() && d.price > 0 && d.hours > 0 && d.cost != null;
  return html`<article class="fb-panel rise !p-4 md:!p-5">
    <h3 class="fb-h3 mb-3">${first ? 'המוצר הראשון שלך' : 'מוצר חדש לסל'}</h3>
    <${Field} label="מה מוכרים?"><input class=${inputCls} placeholder="למשל: פגישת ייעוץ" value=${d.name} onInput=${(e) => setD({ ...d, name: e.target.value })} /><//>
    <p class="mb-1 text-[14px] font-bold">איך זה נמכר?</p>
    <div class="mb-4"><${Chips} small options=${[{ id: 'one', label: 'מכירה אחת' }, { id: 'program', label: 'תוכנית של כמה חודשים' }, { id: 'monthly', label: 'מנוי חודשי' }]} value=${d.kind} onChange=${(v) => setD({ ...d, kind: v, terms: v === 'monthly' ? 'monthly' : 'one' })} /></div>
    <div class="grid gap-3 sm:grid-cols-3">
      <${Field} class="!mb-0" label="מחיר" hint="כולל מע״מ"><${Money} label="מחיר" value=${d.price} onChange=${(v) => setD({ ...d, price: v })} /><//>
      <${Field} class="!mb-0" label="עלות למכירה"><${Money} label="עלות" value=${d.cost} onChange=${(v) => setD({ ...d, cost: v })} /><//>
      <${Field} class="!mb-0" label="שעות עבודה"><${Money} suffix="שעות" label="שעות" value=${d.hours} onChange=${(v) => setD({ ...d, hours: v })} /><//>
    </div>
    <div class="mt-4 flex items-center gap-2">
      <${Button} variant="mini" disabled=${!ok} onClick=${() => ok && onAdd({ ...d, id: nextId('p'), short: d.name.trim().split(' ').slice(0, 2).join(' '), role: first ? 'core' : 'extra', months: d.kind === 'program' ? d.months : undefined })}><${Icon} name="plus" size=${15} />להכניס לסל<//>
      ${onCancel && html`<${Button} variant="text" onClick=${onCancel}>ביטול<//>`}
    </div>
  </article>`;
}

export function PricesScreen({ s, up, notify, undoTo }) {
  const [adding, setAdding] = useState(false);
  const paid = paidProducts(s).concat(s.products.filter((p) => !p.free && (p.price == null || p.price <= 0)));
  const free = s.products.filter((p) => p.free);
  const onBasket = (p, key, old) => {
    if (old == null && key !== 'price') return notify('נשמר, ונכנס גם לסל המוצרים', 'package-check');
    notify(key === 'price' ? `המחיר של ${p.short} עודכן גם בסל המוצרים` : 'עודכן גם בסל המוצרים', 'package-check', () => up((d) => (d.products.find((x) => x.id === p.id)[key] = old)));
  };
  return html`<div class="mx-auto max-w-[1000px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 2 מתוך 5 · ${PARTS[1]}`} title=${['כמה כל מוצר ', 'מכניס', '?']} sub="המוצרים מהסל שלך. כל שינוי כאן מתעדכן גם בסל המוצרים, ותנאי התשלום מגיעים מוכנים לשלב 8, בניית הצעה מנצחת." />
    ${isLicensed(s) && html`<${Note} tone="white" tilt=${-0.6} class="mb-5 max-w-xl"><span class="fb-note-kicker">עוסק מורשה</span>המחירים כוללים מע"מ. מכל מכירה ${SETTINGS.vatPct}% עוברים למדינה, אז החישובים כאן לוקחים רק את מה שנשאר לך.<//>`}
    ${paid.length === 0 && !adding && html`<${NewProduct} first onAdd=${(np) => up((d) => d.products.push(np), `${np.name} נכנס לסל המוצרים`)} />`}
    <div class="flex flex-col gap-4">
      ${paid.map((p) => html`<${ProductCard} key=${p.id} s=${s} p=${p} set=${(fn) => up((d) => fn(d.products.find((x) => x.id === p.id)))} onBasket=${onBasket} />`)}
      ${adding && html`<${NewProduct} onCancel=${() => setAdding(false)} onAdd=${(np) => (setAdding(false), up((d) => d.products.push(np), `${np.name} נכנס לסל המוצרים`))} />`}
    </div>
    ${paid.length > 0 && !adding && html`<${Button} variant="mini" class="mt-4" onClick=${() => setAdding(true)}><${Icon} name="plus" size=${15} />מוצר נוסף לסל<//>`}
    ${free.length > 0 &&
    html`<section class="mt-6 border-t border-line pt-4">
      <h2 class="mb-1 text-[15px] font-bold">מוצרי כניסה בחינם</h2>
      <p class="mb-2 text-[14px] text-muted">לא נכנסים להכנסות, אבל הזמן שלהם כן: כל שיחת היכרות נספרת בשעות של חלק 4.</p>
      <ul class="flex flex-wrap gap-2">${free.map((p) => html`<li key=${p.id}><${Tag}>${p.name}${p.hours ? ` · ${num(p.hours * 60)} דקות` : ''}<//></li>`)}</ul>
    </section>`}
  </div>`;
}
