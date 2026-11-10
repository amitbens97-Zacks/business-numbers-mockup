// Step 5 "העסק במספרים": shared inputs, the opening, the stage question and part 2 (the
// prices, written back to the basket). Part 1 lives in today.js.
import { html, useState, useRef, Icon, cx, parseNum } from './lib.js';
import { Button, Note, StepHeading, How, CalcLines } from './components.js';
import { Chips, Field, inputCls, Tag } from './ui.js';
import { STAGES, PARTS, PAY, SETTINGS, nextId, g, payOf } from './data.js';
import { fmt, num, netPrice, perHour, paidProducts, missingOf, isLicensed } from './calc.js';

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

export function StageScreen({ s, up, onPicked }) {
  return html`<div class="mx-auto max-w-[860px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 1 מתוך 5 · ${PARTS[0]}`} title=${['איפה העסק ', 'עומד', ' היום?']} sub="לפי התשובה נשאל רק מה שרלוונטי לך." />
    <div class="flex flex-col gap-3" role="radiogroup" aria-label="איפה העסק עומד היום">
      ${STAGES.map(
        (st) => html`<button
          key=${st.id}
          type="button"
          role="radio"
          aria-checked=${s.stage === st.id}
          class=${cx('fb-tile w-full !p-4 text-start', s.stage === st.id && 'is-on')}
          onClick=${() => {
            up((d) => (d.stage = st.id));
            onPicked?.();
          }}
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

// ---------- part 2: the prices (from the basket, written back to it) ----------

const KIND = { one: 'מכירה אחת', program: (p) => `תוכנית של ${p.months} חודשים`, monthly: 'מנוי חודשי' };
const kindText = (p) => (typeof KIND[p.kind] === 'function' ? KIND[p.kind](p) : KIND[p.kind]);

// When the money of one sale reaches the business, in words (updates with the answer).
export function cashText(p, stay = 3) {
  if (p.price == null) return '';
  const pay = payOf(p);
  if (p.kind === 'monthly')
    return pay === 'start' ? `${fmt(p.price * stay)} מראש, על ${stay} חודשים (כמה שלקוח נשאר בממוצע)` : `${fmt(p.price)} בכל חודש, כל עוד הלקוח נשאר`;
  if (pay === 'monthly') return `${fmt(p.price / (p.months || 1))} בכל חודש, ${p.months} חודשים`;
  return `${fmt(p.price)} בבת אחת, בחודש של המכירה`;
}

// When the money reaches the business: all at the start, or each month (programs and
// subscriptions; the default follows the kind). A single sale is always paid at once.
function PayQuestion({ p, set, stay }) {
  const pay = payOf(p);
  return html`<div>
    <p class="mb-1 text-[13px] font-bold">מתי הכסף נכנס לעסק?</p>
    ${p.kind === 'one'
      ? html`<${Tag} tone="blue"><${Icon} name="banknote" size=${13} />בבת אחת<//>`
      : html`<${Chips} small options=${PAY} value=${pay} onChange=${(v) => set((x) => (x.pay = v))} />`}
    <p class="mt-1.5 text-[13px] font-semibold text-brand-600">${cashText(p, stay)}</p>
  </div>`;
}

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
    <div class="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-[1fr_1.3fr] md:items-start">
      <p class="text-[15px]">
        ${g('כמה אתה מרוויח', 'כמה את מרוויחה')} על שעת עבודה:
        <b class="ms-1 font-display text-[20px] tabular-nums text-brand-600">${ph != null && !miss.length ? fmt(ph) : '—'}</b>
      </p>
      ${ph != null && !miss.length && html`<${How} class="-mt-2"><${CalcLines}
        lines=${[
          ['מחיר', fmt(p.price)],
          isLicensed(s) && ['פחות מע"מ (עובר למדינה)', fmt(-(p.price - netPrice(s, p)))],
          p.cost > 0 && ['פחות עלות למכירה', fmt(-p.cost)],
          ['נשאר מכל מכירה', fmt(netPrice(s, p) - (p.cost || 0)), true],
          [`÷ ${num(p.hours)} שעות עבודה`, `${fmt(ph)} לשעה`, true],
        ]}
        note=${p.kind === 'monthly' ? 'לכל חודש של לקוח: המחיר לחודש ÷ השעות בחודש.' : ''}
      /><//>`}
      <${PayQuestion} p=${p} set=${set} stay=${s.assumptions.stayMonths || 3} />
    </div>
  </article>`;
}

function NewProduct({ onAdd, onCancel, first }) {
  const [d, setD] = useState({ name: '', price: null, cost: 0, hours: null, kind: 'one', months: 3, pay: null });
  const ok = d.name.trim() && d.price > 0 && d.hours > 0 && d.cost != null;
  return html`<article class="fb-panel rise !p-4 md:!p-5">
    <h3 class="fb-h3 mb-3">${first ? 'המוצר הראשון שלך' : 'מוצר חדש לסל'}</h3>
    <${Field} label="מה מוכרים?"><input class=${inputCls} placeholder="למשל: פגישת ייעוץ" value=${d.name} onInput=${(e) => setD({ ...d, name: e.target.value })} /><//>
    <p class="mb-1 text-[14px] font-bold">איך זה נמכר?</p>
    <div class="mb-4"><${Chips} small options=${[{ id: 'one', label: 'מכירה אחת' }, { id: 'program', label: 'תוכנית של כמה חודשים' }, { id: 'monthly', label: 'מנוי חודשי' }]} value=${d.kind} onChange=${(v) => setD({ ...d, kind: v, pay: null })} /></div>
    ${d.kind === 'program' &&
    html`<div class="rise mb-4 flex flex-wrap items-end gap-5">
      <div><p class="mb-1 text-[14px] font-bold">כמה חודשים?</p><${Stepper} label="כמה חודשים" min=${2} value=${d.months} onChange=${(v) => setD({ ...d, months: v })} /></div>
    </div>`}
    ${d.kind !== 'one' && html`<div class="mb-4"><p class="mb-1 text-[14px] font-bold">מתי הכסף נכנס לעסק?</p><${Chips} small options=${PAY} value=${payOf(d)} onChange=${(v) => setD({ ...d, pay: v })} /></div>`}
    <div class="grid gap-3 sm:grid-cols-3">
      <${Field} class="!mb-0" label="מחיר" hint="כולל מע״מ"><${Money} label="מחיר" value=${d.price} onChange=${(v) => setD({ ...d, price: v })} /><//>
      <${Field} class="!mb-0" label="עלות למכירה"><${Money} label="עלות" value=${d.cost} onChange=${(v) => setD({ ...d, cost: v })} /><//>
      <${Field} class="!mb-0" label="שעות עבודה"><${Money} suffix="שעות" label="שעות" value=${d.hours} onChange=${(v) => setD({ ...d, hours: v })} /><//>
    </div>
    <div class="mt-4 flex items-center gap-2">
      <${Button} variant="mini" disabled=${!ok} onClick=${() => ok && onAdd({ ...d, id: nextId('p'), short: d.name.trim().split(' ').slice(0, 2).join(' '), role: first ? 'core' : 'extra', months: d.kind === 'program' ? d.months : undefined, pay: payOf(d) })}><${Icon} name="plus" size=${15} />להכניס לסל<//>
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
    <${StepHeading} n="5" eyebrow=${`חלק 2 מתוך 5 · ${PARTS[1]}`} title=${['כמה כל מוצר ', 'מכניס', '?']} sub="המוצרים מהסל שלך. כל שינוי כאן נשמר גם בסל המוצרים." />
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
