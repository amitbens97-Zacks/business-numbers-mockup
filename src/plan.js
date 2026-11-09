// Step 5, parts 3-5: the goal, how much to sell, and the annual forecast with the four
// checks and the fixes.
import { html, useState, Icon, cx } from './lib.js';
import { Button, Note, StepHeading, PartnerNote, FillButton, SharkAvatar } from './components.js';
import { Chips, Field, inputCls, Tag, Sheet } from './ui.js';
import { PARTS, ENTITIES, SETTINGS, FROM_STEP2, g, PARTNER } from './data.js';
import { Money, Stepper, Section, Result } from './parts.js';
import { ForecastChart, ForecastLegend, ForecastTable } from './chart.js';
import {
  fmt, num, monthName, monthYear, todayAvg, fixedMonthly, cushionTarget, setAsideMonthly, isLicensed, netPrice,
  paidProducts, perHour, isSharkMix, suggestMix, taxRate, fixes, clientsText,
} from './calc.js';

// ---------- part 3: the goal ----------

export function GoalScreen({ s, up, m }) {
  const avg = s.stage === 'setup' ? null : todayAvg(s);
  const below = avg && s.goal != null && s.goal <= avg.left;
  const yearToday = avg ? avg.gross * 12 : 0;
  const fc = m.fc;
  return html`<div class="mx-auto max-w-[1000px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 3 מתוך 5 · ${PARTS[2]}`} title=${['כמה צריך ', 'להישאר', ' לך?']} sub="היעד הוא מה שנשאר לך בכיס בסוף החודש, אחרי כל ההוצאות והמס." />
    <${Section} title="היעד החודשי" aside=${s.goal === FROM_STEP2.goal && html`<${Tag}>מ"אני והעסק"<//>`}>
      <div class="grid items-end gap-4 md:grid-cols-[260px_1fr]">
        <${Field} class="!mb-0" label="כמה כסף צריך להישאר לך בכל חודש?" hint=${s.goal === FROM_STEP2.goal ? 'מה שכתבת בשלב 2. אפשר לאשר או לשנות' : 'אפשר לשנות בכל רגע'}>
          <${Money} label="היעד החודשי" invalid=${!s.goal} value=${s.goal} onChange=${(v) => up((d) => ((d.goal = v), (d.goalConfirmed = true)))} />
        <//>
        ${avg &&
        html`<div class="flex flex-wrap gap-3 pb-6">
          <div class="rounded-xl bg-canvas px-4 py-2"><small class="block text-[12px] font-bold text-muted">היום נשארים בממוצע</small><b class="font-display text-[20px] tabular-nums">${fmt(avg.left)}</b></div>
          ${s.goal > 0 && html`<div class="rounded-xl bg-brand-50 px-4 py-2"><small class="block text-[12px] font-bold text-muted">היעד לעומת היום</small><b class="font-display text-[20px] tabular-nums text-brand-600">${s.goal > avg.left ? `פי ${num(s.goal / Math.max(1, avg.left), 1)}` : 'כבר שם'}</b></div>`}
        </div>`}
      </div>
      ${s.stage === 'active' &&
      below &&
      html`<${PartnerNote} class="mt-3 max-w-lg" title="יעד מעל מה שיש היום" mood="thinking" action=${html`<${FillButton} onClick=${() => up((d) => (d.goal = Math.ceil((avg.left * 1.2) / 500) * 500))}>להעמיד את היעד על ${fmt(Math.ceil((avg.left * 1.2) / 500) * 500)}<//>`}>
        היעד כבר מושג: היום נשארים לך ${fmt(avg.left)} בחודש. עסק פעיל צריך יעד שמושך קדימה. מה דעתך על 20% יותר?
      <//>`}
    <//>

    <${Section} title="סוג העוסק" sub="קובע כמה מכל מכירה נשאר לך, וכמה לשים בצד למס.">
      <div class="grid gap-4 md:grid-cols-[1fr_220px]">
        <div>
          <${Chips} options=${ENTITIES} value=${s.entity} onChange=${(v) => up((d) => ((d.entity = v), (d.taxPct = SETTINGS.taxPct[v])))} />
          <p class="mt-2 text-[14px] text-muted">${s.entity === 'exempt' ? `עוסק פטור לא גובה מע"מ, עד תקרה של ${fmt(SETTINGS.exemptCeiling)} בשנה.` : `עוסק מורשה גובה מע"מ: מכל מחיר בסל ${SETTINGS.vatPct}% עוברים למדינה.`}</p>
          ${s.entity === 'exempt' && yearToday > SETTINGS.exemptCeiling && html`<p class="mt-2 flex items-start gap-2 rounded-xl bg-warn-50 p-2.5 text-[14px] font-semibold text-warn"><${Icon} name="triangle-alert" size=${17} />בקצב של היום ההכנסה בשנה היא ${fmt(yearToday)}, מעל התקרה. כדאי לבדוק עם רואה החשבון מעבר לעוסק מורשה.</p>`}
        </div>
        <${Field} class="!mb-0" label="הפרשה למס" hint="הערכה, לא ייעוץ מס. ברירת המחדל לפי סוג העוסק">
          <${Money} suffix="%" label="הפרשה למס" value=${s.taxPct} onChange=${(v) => up((d) => (d.taxPct = Math.min(60, v ?? 0)))} />
        <//>
      </div>
    <//>

    ${s.stage === 'active' &&
    html`<${Section} title="יעד שנתי, לפי רבעונים" sub="הרבעונים מחולקים לפי קצב הצמיחה בתחזית: בהתחלה פחות, בסוף השנה יותר.">
        <div class="mb-4 max-w-[260px]">
          <${Field} class="!mb-0" label="כמה צריך להישאר לך בשנה?" hint=${s.annualGoal ? 'קבעת בעצמך' : `12 חודשים של ${fmt(s.goal)}`}>
            <${Money} label="יעד שנתי" value=${s.annualGoal ?? (s.goal || 0) * 12} onChange=${(v) => up((d) => (d.annualGoal = v))} />
          <//>
        </div>
        <${Quarters} fc=${fc} />
      <//>
      <${Section} title="כרית הביטחון כיעד" sub=${`היעד: ${fmt(cushionTarget(s))} בעסק. הסכום לכרית יוצא כל חודש לפני היעד שלך.`}>
        ${(s.bank.amount || 0) >= cushionTarget(s)
          ? html`<p class="text-[15px]">הכרית כבר מלאה: ${fmt(s.bank.amount)} בחשבון.</p>`
          : html`<div class="flex flex-wrap items-end gap-5">
              <div>
                <p class="mb-1 text-[14px] font-bold">תוך כמה זמן למלא אותה?</p>
                <${Chips} small options=${[3, 6, 9, 12].map((n) => ({ id: n, label: `${n} חודשים` }))} value=${s.cushionMonths} onChange=${(v) => up((d) => (d.cushionMonths = v))} />
              </div>
              <p class="text-[15px]"><b class="font-display text-[20px] tabular-nums">${fmt(setAsideMonthly(s))}</b> בחודש לכרית${fc.fillIdx >= 0 ? html` · מלאה ב${monthYear(fc.rows[fc.fillIdx].key)}` : fc.fillIdx === -1 ? ' · לא מתמלאת בשנה הקרובה' : ''}</p>
            </div>`}
      <//>`}
  </div>`;
}

function Quarters({ fc }) {
  return html`<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    ${fc.quarters.map((q) => {
      const ok = q.profit >= q.goal;
      return html`<div key=${q.q} class="rounded-xl border border-line bg-white p-3">
        <small class="block text-[12px] font-bold text-muted">רבעון ${q.q} · ${monthName(q.from)}-${monthName(q.to)}</small>
        <b class="block font-display text-[18px] tabular-nums">${fmt(q.goal)}</b>
        <span class=${cx('text-[13px] font-semibold', ok ? 'text-money' : 'text-warn')}>תחזית ${fmt(q.profit)}</span>
      </div>`;
    })}
  </div>`;
}

// ---------- part 4: how much to sell ----------

function Assumptions({ s, up }) {
  const a = s.assumptions;
  const row = (key, label, hint, suffix) => html`<${Field} class="!mb-0" label=${label} hint=${hint}>
    <${Money} suffix=${suffix} label=${label} invalid=${a[key] == null} value=${a[key]} onChange=${(v) => up((d) => (d.assumptions[key] = v))} />
  <//>`;
  return html`<${Section} title="על מה החישוב מבוסס" sub="ארבעה מספרים שכל החלק הזה יוצא מהם. אפשר לשנות כל אחד, וכל המסך מתעדכן." aside=${html`<${Tag}><${Icon} name="pencil" size=${12} />אפשר לשנות<//>`}>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      ${row('hoursMonth', 'שעות בחודש לעבודה עם לקוחות', a.hoursMonth ? `מה שכתבת ב"אני והעסק": בערך ${num((a.hoursMonth * 12) / 52)} שעות בשבוע` : 'כמה שעות בחודש יש לך ללקוחות', 'שעות')}
      ${row('leadToCall', 'כמה מהפניות קובעות שיחה', 'ממוצע בתחום, עד שיהיו לך נתונים משלך', '%')}
      ${row('closeRate', 'כמה מהשיחות נגמרות בקנייה', 'ממוצע בתחום, עד שיהיו לך נתונים משלך', '%')}
      ${row('stayMonths', 'כמה זמן לקוח חודשי נשאר', 'בממוצע בתחום', 'חודשים')}
    </div>
    <p class="mt-3 text-[13px] text-muted">מע"מ ${SETTINGS.vatPct}% ותקרת עוסק פטור ${fmt(SETTINGS.exemptCeiling)} בשנה, לפי החוק היום. הפרשה למס: ${s.taxPct}%, כמו שקבעת בחלק 3.</p>
  <//>`;
}

// The funnel, from the leads that reach the business to the clients who buy: three bars
// that narrow down, with the rate between each two.
function Funnel({ st, a, wk }) {
  const rows = [
    ['users', st.leads, 'פניות שמגיעות אליך', '100%'],
    ['phone', st.calls, 'שיחות מכירה', '82%'],
    ['handshake', st.newClients, 'לקוחות חדשים', '64%'],
  ];
  const rates = [`${a.leadToCall}% מהפניות קובעות שיחה`, `${a.closeRate}% מהשיחות נגמרות בקנייה`];
  return html`<ol class="flex flex-col items-center">
    ${rows.map(
      ([icon, n, label, w], i) => html`<li key=${label} class="flex w-full flex-col items-center">
        ${i > 0 && html`<span class="my-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-600"><${Icon} name="arrow-down" size=${16} />${rates[i - 1]}</span>`}
        <div class=${cx('flex w-full items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5', i === 2 ? 'border-brand-600 bg-brand-100' : 'border-brand-300 bg-brand-50')} style=${{ maxWidth: w }}>
          <span class="text-brand-600"><${Icon} name=${icon} size=${22} /></span>
          <b class="font-display text-[26px] leading-none tabular-nums">${num(n, n < 10 ? 1 : 0)}</b>
          <span class="min-w-0 flex-1 text-[15px] font-bold leading-tight">${label}<small class="block text-[12px] font-semibold text-muted">בחודש · ${num(Math.ceil(wk(n) * 2) / 2, 1)} בשבוע</small></span>
        </div>
      </li>`,
    )}
  </ol>`;
}

// A progress bar. Over the top is red only for hours (more income is good news).
function Bar({ value, max, tone = 'brand', label, sub, limit }) {
  const p = Math.min(100, (value / (max || 1)) * 100);
  const over = limit && value > max;
  return html`<div class="mb-3">
    <div class="mb-1 flex items-baseline justify-between gap-2 text-[14px]"><span class="font-bold">${label}</span><span class="tabular-nums text-muted">${sub}</span></div>
    <div class="h-2.5 overflow-hidden rounded-full bg-[#e3ddd0]"><div class=${cx('h-full rounded-full transition-all', over ? 'bg-error' : tone === 'money' ? 'bg-money' : 'bg-brand-600')} style=${{ width: `${p}%` }}></div></div>
  </div>`;
}

export function SellScreen({ s, up, m, notify, undoTo }) {
  const st = m.st;
  const mix = m.mix;
  const a = s.assumptions;
  const ps = paidProducts(s);
  const avg = s.stage === 'setup' ? null : todayAvg(s);
  const setN = (id, n) => up((d) => (d.mix = { ...mix, [id]: n }));
  const shark = isSharkMix(s);
  const monthly = ps.find((p) => p.kind === 'monthly');
  const program = ps.find((p) => p.kind === 'program');
  const wk = (n) => (n * 12) / 52;
  const t = taxRate(s);
  return html`<div class="mx-auto max-w-[1120px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 4 מתוך 5 · ${PARTS[3]}`} title=${['כמה צריך ', 'למכור', '?']} sub="מהיעד אחורה: כמה העסק צריך להכניס, מאיזה מוצרים, וכמה לידים ושיחות זה אומר." />
    <${Result} icon="calculator" title=${`כדי שיישארו לך ${fmt(s.goal)} בחודש, העסק צריך להכניס`} big=${`${fmt(st.needed)} בחודש`}>
      <span class="block text-[14px]">
        היעד ${fmt(s.goal)} + הוצאות קבועות ${fmt(st.fixed)} + עלויות המוצרים ${fmt(st.cogs)}${st.setAside ? ` + כרית ${fmt(st.setAside)}` : ''} = <b>${fmt(s.goal + st.fixed + st.cogs + st.setAside)}</b>.
        מכל שקל שנכנס, ${s.taxPct}% הולכים להפרשה למס, אז צריך להכניס ${fmt(st.needed)}.
      </span>
      ${isLicensed(s) && html`<span class="mt-1 block text-[14px]">עם המע"מ, הלקוחות משלמים ${fmt(st.needed * (1 + SETTINGS.vatPct / 100))}.</span>`}
    <//>

    <div class="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <div>
        <${Section}
          title="התמהיל: כמה מכל מוצר בחודש מלא"
          sub=${`חודש מלא = חודש שבו העסק מוכר את כל התמהיל, ומכניס ${fmt(st.income)}. כמה זמן לוקח להגיע לשם, קובעים בחלק 5.`}
          aside=${shark ? html`<${Tag} tone="blue"><img src="assets/shark/shark-happy-sm.svg" alt="" class="h-4 w-4 rounded-full bg-white" />ההצעה של הכריש<//>` : html`<button type="button" class="shrink-0 text-[14px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => { const back = s; up((d) => (d.mix = null)); notify('חזרת להצעה של הכריש', 'rotate-ccw', () => undoTo(back)); }}>להחזיר להצעה של הכריש</button>`}
        >
          <ul class="flex flex-col divide-y divide-line">
            ${ps.map((p) => {
              const n = mix[p.id] || 0;
              return html`<li key=${p.id} class="flex flex-wrap items-center gap-3 py-3">
                <div class="min-w-0 flex-1">
                  <b class="block text-[16px]">${p.short || p.name}</b>
                  <small class="text-[13px] text-muted">${fmt(netPrice(s, p))}${p.kind === 'monthly' ? ' לחודש' : ''} · ${fmt(perHour(s, p))} לשעה${p.kind === 'program' ? ` · ${num(p.hours / p.months, 1)} שעות בחודש, ${p.months} חודשים` : ''}</small>
                </div>
                <span class="text-[13px] font-semibold text-muted">${p.kind === 'monthly' ? 'לקוחות פעילים' : 'מכירות בחודש'}</span>
                <${Stepper} label=${p.name} value=${n} onChange=${(v) => setN(p.id, v)} />
                <b class="w-[92px] text-end font-display tabular-nums">${fmt(n * netPrice(s, p))}</b>
              </li>`;
            })}
          </ul>
          ${monthly &&
          (mix[monthly.id] || 0) > 0 &&
          html`<p class="mt-2 flex items-start gap-2 rounded-xl bg-canvas p-2.5 text-[14px]"><${Icon} name="repeat" size=${17} class="mt-0.5 shrink-0 text-brand-600" />${mix[monthly.id] === 1 ? 'לקוח פעיל אחד' : `${mix[monthly.id]} לקוחות פעילים`} ב${monthly.short} = ${num(mix[monthly.id] / a.stayMonths, 1)} חדשים בחודש. הם נערמים: מי שהצטרף בחודש שעבר עדיין משלם, אז כל לקוח חדש מוסיף הכנסה לכמה חודשים.</p>`}
          ${program && (mix[program.id] || 0) > 0 && html`<p class="mt-2 flex items-start gap-2 rounded-xl bg-canvas p-2.5 text-[14px]"><${Icon} name="calendar-range" size=${17} class="mt-0.5 shrink-0 text-brand-600" />${program.short}: ${num(program.hours)} שעות מתחלקות על ${program.months} חודשים, והתשלום לפי מה שבחרת בחלק 2.</p>`}
        <//>

        <${Section} title="מאיפה יגיעו הלקוחות" sub="מהיעד אחורה: כמה פניות צריכות להגיע אליך בכל חודש, כדי שמספיק מהן יהפכו ללקוחות.">
          <${Funnel} st=${st} a=${a} wk=${wk} />
          <p class="mt-4 rounded-xl bg-canvas p-3 text-[14px]">
            כדי לקבל <b>${num(st.newClients, 1)} לקוחות חדשים</b> בחודש, כש-${a.closeRate}% מהשיחות נגמרות בקנייה, צריך <b>${num(st.calls, st.calls < 10 ? 1 : 0)} שיחות מכירה</b>.
            כש-${a.leadToCall}% מהפניות קובעות שיחה, צריך שיגיעו אליך <b>${num(st.leads)} פניות</b> בחודש.
            ${avg ? html` היום מגיעים בממוצע ${clientsText(avg.clients)} חדשים בחודש.` : ''}
          </p>
          <p class="mt-2 text-[13px] text-muted">פנייה (ליד) = מי שהשאיר פרטים, שלח הודעה או ביקש לשמוע עוד. איך מביאים את הפניות: על זה עובדים בפרקים הבאים, בדף הנחיתה, במכונת התוכן ובלקוחות המשלמים.</p>
        <//>
        <${Assumptions} s=${s} up=${up} />
      </div>

      <aside class="fb-panel !p-4 lg:sticky lg:top-4">
        <h2 class="fb-h3 mb-3">חודש מלא עם התמהיל</h2>
        <${Bar} label="הכנסות" value=${st.income} max=${st.needed} sub=${`${fmt(st.income)} מתוך ${fmt(st.needed)}`} />
        <${Bar} label="נשאר לך" tone="money" value=${Math.max(0, st.profit - st.setAside)} max=${s.goal} sub=${`${fmt(st.profit - st.setAside)} מתוך ${fmt(s.goal)}`} />
        <${Bar} limit label="שעות" value=${st.hours} max=${a.hoursMonth} sub=${`${num(st.hours)} מתוך ${num(a.hoursMonth)}`} />
        <ul class="mt-2 border-t border-line pt-2 text-[14px]">
          ${[
            ['הכנסות', st.income],
            isLicensed(s) && ['מע"מ (לא שלך)', st.vat, true],
            ['עלויות המוצרים', -st.cogs],
            ['הוצאות קבועות', -st.fixed],
            [`הפרשה למס (${s.taxPct}%)`, -st.tax],
            st.setAside > 0 && ['לכרית הביטחון', -st.setAside],
          ]
            .filter(Boolean)
            .map(([k, v, aside]) => html`<li key=${k} class=${cx('flex justify-between py-1', aside && 'text-muted')}><span>${k}</span><span class="tabular-nums">${fmt(v)}</span></li>`)}
          <li class="mt-1 flex justify-between border-t border-line pt-2 font-bold"><span>נשאר לך</span><span class=${cx('font-display text-[18px] tabular-nums', st.profit - st.setAside >= s.goal ? 'text-money' : 'text-error')}>${fmt(st.profit - st.setAside)}</span></li>
        </ul>
        <p class="mt-2 text-[13px] text-muted">שעות: ${num(st.work)} עם לקוחות + ${num(st.callH, 1)} בשיחות מכירה.</p>
      </aside>
    </div>
  </div>`;
}

// ---------- part 5: the forecast, the checks, the fixes ----------

const TONE = {
  ok: { ring: 'border-money/30 bg-money-50', text: 'text-money', icon: 'circle-check' },
  warn: { ring: 'border-warn/30 bg-warn-50', text: 'text-warn', icon: 'circle-alert' },
  bad: { ring: 'border-error/30 bg-error-50', text: 'text-error', icon: 'circle-x' },
  info: { ring: 'border-line bg-white', text: 'text-muted', icon: 'info' },
};
const Dot = ({ tone }) => html`<span class=${cx('inline-block h-2.5 w-2.5 rounded-full', { ok: 'bg-money', warn: 'bg-warn', bad: 'bg-error', info: 'bg-faint' }[tone])}></span>`;

function Checks({ list, how = true }) {
  return html`<div class="grid gap-3 sm:grid-cols-2">
    ${list.map((c) => {
      const t = TONE[c.tone];
      return html`<div key=${c.id} class=${cx('flex items-start gap-3 rounded-xl border-[1.5px] p-3', t.ring)}>
        <span class=${cx('mt-0.5', t.text)}><${Icon} name=${t.icon} size=${22} /></span>
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-bold text-muted">${c.q}</p>
          <p class="font-display text-[17px] font-extrabold">${c.a}</p>
          <p class="text-[13px]">${c.sub}</p>
          ${how &&
          c.how &&
          html`<div class="mt-2 rounded-lg bg-white/80 px-2.5 py-1.5">
            <p class="mb-0.5 text-[12px] font-bold text-muted">איך זה חושב</p>
            <dl class="text-[13px]">
              ${c.how.map(([k, v, main]) => html`<div key=${k} class=${cx('flex items-baseline justify-between gap-3 py-0.5', main && 'mt-0.5 border-t border-line pt-1 font-bold')}><dt class="min-w-0">${k}</dt><dd class="shrink-0 tabular-nums">${v}</dd></div>`)}
            </dl>
            <p class="mt-1 text-[12px] text-muted">${c.rule}</p>
          </div>`}
        </div>
      </div>`;
    })}
  </div>`;
}

// What the verdict rests on, in plain words, and what it does not check.
function Basis({ s, m }) {
  const a = s.assumptions;
  const items = [
    ['user', 'המספרים שלך', `הכסף בעסק, ההוצאות, המחירים, העלויות והשעות מחלקים 1-2, והיעד של ${fmt(s.goal)} בחודש מחלק 3.`],
    ['shopping-basket', 'התמהיל', `כמה מכל מוצר נמכר בחודש מלא (חלק 4). בחודש מלא העסק מכניס ${fmt(m.st.income)}.`],
    ['percent', 'שני אחוזים שאפשר לשנות', `${a.leadToCall}% מהפניות קובעות שיחה, ${a.closeRate}% מהשיחות קונות. ממוצע בתחום, עד שיהיו לך נתונים משלך (חלק 4).`],
    ['trending-up', 'הדרך ליעד', `${s.ramp} חודשים עד חודש מלא, בקו ישר: כל חודש קצת יותר מכירות מהחודש שלפניו.`],
  ];
  return html`<${Section} title="על מה הבדיקה מבוססת" sub="אין כאן ניחוש: כל מספר מחושב מהנתונים האלה, באותו חישוב בכל פעם.">
    <ul class="grid gap-3 md:grid-cols-2">
      ${items.map(([icon, k, v]) => html`<li key=${k} class="flex items-start gap-3"><span class="fb-chip-ic h-9 w-9 shrink-0"><${Icon} name=${icon} size=${17} /></span><span class="text-[14px]"><b class="block text-[15px]">${k}</b>${v}</span></li>`)}
    </ul>
    <div class="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
      <p class="text-[14px]"><b class="block text-[15px]">איך נקבעת השורה התחתונה</b>אדום באחת משלוש הבדיקות הראשונות: "יש בעיה במודל". כתום באחת מהן, או קצב גבוה: "אפשרי, עם שינוי". הכל ירוק: "המודל עובד".</p>
      <p class="text-[14px]"><b class="block text-[15px]">מה הבדיקה לא יודעת</b>אם הפניות באמת יגיעו. היא בודקת שהמספרים מסתדרים אם הן מגיעות. להביא אותן זה השיווק, ועליו עובדים בפרקים הבאים.</p>
    </div>
  <//>`;
}

function Verdict({ v }) {
  const t = TONE[v.tone];
  return html`<div class=${cx('rise mb-4 flex items-center gap-4 rounded-2xl border-[1.5px] p-4 md:p-5', t.ring)} role="status">
    <${SharkAvatar} size=${56} mood=${v.tone === 'ok' ? 'happy' : v.tone === 'warn' ? 'thinking' : 'alert'} />
    <div>
      <p class=${cx('font-display text-[26px] font-black leading-tight md:text-[30px]', t.text)}>${v.title}</p>
      <p class="text-[16px]">${v.cause}</p>
    </div>
  </div>`;
}

function FixCard({ fx, onApply }) {
  return html`<li class="fb-panel flex flex-col gap-2 !p-4">
    <div class="flex items-start gap-3">
      <span class="fb-chip-ic h-10 w-10 shrink-0"><${Icon} name=${fx.icon} size=${20} /></span>
      <div class="min-w-0 flex-1">
        <b class="block text-[16px]">${fx.title}</b>
        <small class="text-[13px] text-muted">${fx.sub}</small>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-canvas px-3 py-2 text-[13px]">
      ${fx.before.checks.map(
        (c, i) => html`<span key=${c.id} class="inline-flex items-center gap-1" title=${c.q}><${Dot} tone=${c.tone} /><${Icon} name="arrow-left" size=${12} class="text-faint" /><${Dot} tone=${fx.after.checks[i].tone} /><span class="text-muted">${c.q.replace('?', '')}</span></span>`,
      )}
    </div>
    <p class="text-[13px]">אחרי: <b class=${TONE[fx.after.verdict.tone].text}>${fx.after.verdict.title}</b> · נשאר בחודש מלא ${fmt(fx.after.st.profit - fx.after.st.setAside)}</p>
    <${Button} variant="mini" class="self-start" onClick=${onApply}>לנסות את זה<//>
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

export function ForecastScreen({ s, up, m, notify, undoTo, onApply }) {
  const [table, setTable] = useState(false);
  const [chat, setChat] = useState(false);
  const fc = m.fc;
  const list = fixes(s);
  const ceiling = fc.ceilingMonth != null ? fc.rows[fc.ceilingMonth] : null;
  const yearOk = fc.yearProfit >= fc.annualGoal;
  return html`<div class="mx-auto max-w-[1120px] px-4 py-6 md:px-8">
    <${StepHeading} n="5" eyebrow=${`חלק 5 מתוך 5 · ${PARTS[4]}`} title=${['השנה ', 'הקרובה', ' במספרים']} sub="תחזית לשנים-עשר החודשים הבאים, ובדיקה אם המודל מחזיק." />

    <${Section} title="תוך כמה זמן מגיעים ליעד ההכנסה החודשית שלנו?" sub=${`כלומר: עד שמוכרים את כל התמהיל של חלק 4, ${fmt(m.st.income)} הכנסות בחודש${m.st.income >= m.st.needed ? ` (צריך לפחות ${fmt(m.st.needed)} כדי להגיע ליעד)` : ''}. ${s.stage === 'setup' ? 'מתחילים מאפס, ורוב העסקים צריכים בערך חצי שנה.' : `מתחילים ממה שנכנס היום, ${fmt(todayAvg(s)?.income)} בחודש.`}`}>
      <${Chips} options=${[3, 6, 9, 12].map((n) => ({ id: n, label: `${n} חודשים` }))} value=${s.ramp} onChange=${(v) => up((d) => (d.ramp = v))} />
    <//>

    <${Verdict} v=${m.verdict} />
    <div class="mb-5"><${Checks} list=${m.checks} /></div>
    <${Basis} s=${s} m=${m} />

    <${Section}
      title="התחזית, חודש אחרי חודש"
      aside=${html`<div role="tablist" aria-label="תצוגה" class="flex shrink-0 rounded-xl border border-line bg-canvas p-0.5">
        ${[
          [false, 'גרף', 'chart-column'],
          [true, 'טבלה', 'table'],
        ].map(([v, label, icon]) => html`<button key=${label} type="button" role="tab" aria-selected=${table === v} class=${cx('flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-bold cursor-pointer', table === v ? 'bg-brand-600 text-white' : 'text-muted')} onClick=${() => setTable(v)}><${Icon} name=${icon} size=${15} />${label}</button>`)}
      </div>`}
    >
      ${table ? html`<${ForecastTable} fc=${fc} goal=${s.goal} />` : html`<${ForecastChart} fc=${fc} goal=${s.goal} /><div class="mt-2"><${ForecastLegend} cushion=${fc.cushion} /></div>`}
      <p class="mt-3 text-[13px] text-muted">תחזית היא לא הבטחה. היא מראה מה קורה אם התמהיל והאחוזים של חלק 4 מתקיימים.</p>
    <//>

    <div class="mb-5 grid gap-3 md:grid-cols-3">
      <div class="rounded-xl border border-line bg-white p-4"><small class="block text-[13px] font-bold text-muted">יישאר לך בשנה</small><b class="font-display text-[24px] tabular-nums">${fmt(fc.yearProfit)}</b></div>
      <div class="rounded-xl border border-line bg-white p-4"><small class="block text-[13px] font-bold text-muted">היעד השנתי</small><b class="font-display text-[24px] tabular-nums">${fmt(fc.annualGoal)}</b></div>
      <div class=${cx('rounded-xl border p-4', yearOk ? 'border-money/30 bg-money-50' : 'border-warn/30 bg-warn-50')}><small class="block text-[13px] font-bold text-muted">${yearOk ? 'מעל היעד' : 'חסר ליעד השנתי'}</small><b class=${cx('font-display text-[24px] tabular-nums', yearOk ? 'text-money' : 'text-warn')}>${fmt(Math.abs(fc.yearProfit - fc.annualGoal))}</b><small class="block text-[12px] text-muted">השנה הראשונה כוללת את החודשים עד שמגיעים ליעד ההכנסה</small></div>
    </div>
    ${s.stage === 'active' && html`<${Section} title="לפי רבעונים"><${Quarters} fc=${fc} /><//>`}
    ${ceiling &&
    html`<p class="mb-5 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn-50 p-3 text-[15px] text-warn"><${Icon} name="triangle-alert" size=${19} class="mt-0.5 shrink-0" /><span><b>תקרת עוסק פטור:</b> בקצב הזה, ב${monthYear(ceiling.key)} ההכנסות עוברות ${fmt(SETTINGS.exemptCeiling)} ב-12 חודשים. משם צריך להיות עוסק מורשה, ו-${SETTINGS.vatPct}% מכל מחיר עוברים למדינה. כדאי לתאם עם רואה החשבון מראש.</span></p>`}

    ${list.length > 0 &&
    html`<${Section} title="מה אפשר לשנות" sub="מסודר לפי מה שמשפיע הכי הרבה. כל שינוי מראה את הבדיקות לפני ואחרי, ואפשר לבטל.">
      <ul class="grid gap-3 md:grid-cols-3">${list.map((fx) => html`<${FixCard} key=${fx.id} fx=${fx} onApply=${() => onApply(fx)} />`)}</ul>
    <//>`}
    ${s.applied.length > 0 &&
    html`<div class="mb-5 rounded-xl border border-line bg-white p-4">
      <h3 class="mb-1 text-[15px] font-bold">מה שינית בבדיקה</h3>
      <ul class="text-[14px]">${s.applied.map((a) => html`<li key=${a.id + a.at} class="flex items-center gap-2 py-0.5"><${Icon} name="check" size=${15} class="text-brand-600" />${a.title}${a.basket ? html`<${Tag}>עודכן בסל<//>` : ''}</li>`)}</ul>
    </div>`}
    <div class="flex flex-wrap items-center gap-3">
      <${Button} variant="secondary" onClick=${() => setChat(true)}><${SharkAvatar} size=${26} />לדבר על זה עם הכריש<//>
      ${m.verdict.tone !== 'ok' && html`<p class="text-[14px] text-muted">אפשר לסיים את השלב גם ככה. התוכנית תראה מה עוד לא מסתדר.</p>`}
    </div>
    ${chat && html`<${SharkChat} m=${m} onClose=${() => setChat(false)} />`}
  </div>`;
}

export { Quarters, Checks, Verdict, Dot, TONE };
