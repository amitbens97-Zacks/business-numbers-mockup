// The end of step 5: the document "התוכנית העסקית שלך" (before the paywall), the gold
// chapter finish, and the home page with chapter 3 behind the paywall.
import { html, useEffect, Icon, PencilLine, cx, confetti } from './lib.js';
import { Button, Note, SharkAvatar } from './components.js';
import { Tag, Sheet } from './ui.js';
import { USER, STEP, SETTINGS, g, stageOf, ENTITIES, FINANCE_URL, FINANCE_SCENARIO } from './data.js';
import { cashText } from './parts.js';
import {
  fmt, num, monthYear, todayText, todayAvg, runway, fixedMonthly, setupSummary, cushionTarget, setAsideMonthly,
  paidProducts, netPrice, perHour, isLicensed,
} from './calc.js';
import { ForecastChart, ForecastLegend } from './chart.js';
import { Checks, Verdict, Quarters } from './plan.js';

const H = ({ n, children }) => html`<h2 class="mb-2 mt-7 flex items-center gap-2 font-display text-[20px] font-black"><span class="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] text-white">${n}</span>${children}</h2>`;
const Row = ({ k, v, strong }) => html`<tr class="border-t border-line"><td class="py-1.5 pe-3">${k}</td><td class=${cx('py-1.5 text-end tabular-nums', strong && 'font-display font-black')}>${v}</td></tr>`;

export function DocScreen({ s, m }) {
  const st = m.st;
  const fc = m.fc;
  const stage = stageOf(s.stage);
  const avg = s.stage === 'setup' ? null : todayAvg(s);
  const rw = runway(s);
  const ps = paidProducts(s);
  const ent = ENTITIES.find((e) => e.id === s.entity).label;
  return html`<div class="mx-auto max-w-[860px] px-4 py-6 md:px-8">
    <div class="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
      <p class="fb-eyebrow">התוצר של השלב</p>
      <div class="flex gap-2">
        <${Button} variant="text" onClick=${() => window.print()}><${Icon} name="printer" size=${16} />הדפסה<//>
        <${Button} variant="text" onClick=${() => window.print()}><${Icon} name="download" size=${16} />PDF<//>
      </div>
    </div>
    <article class="rounded-[18px] bg-white p-5 shadow-[var(--shadow-paper)] md:p-10">
      <header class="border-b-2 border-ink pb-4">
        <p class="text-[14px] font-bold text-muted">${USER.business} · ${USER.fullName}</p>
        <h1 class="font-display text-[32px] font-black leading-tight md:text-[40px]">התוכנית העסקית שלך</h1>
        <p class="text-[14px] text-muted">עודכן ב-${todayText()} · שלב העסק: ${stage.label} · ${ent}</p>
      </header>

      <div class="mt-5"><${Verdict} v=${m.verdict} /></div>

      <${H} n="1">המצב היום<//>
      <table class="w-full text-[15px]"><tbody>
        <${Row} k=${s.bank.has ? 'בחשבון הבנק של העסק' : 'הכסף של העסק'} v=${fmt(s.bank.amount)} />
        ${s.stage === 'setup' && html`<${Row} k="תקציב ההקמה" v=${`${fmt(setupSummary(s).budget)} · שולם ${fmt(setupSummary(s).spent)} · נשאר ${fmt(setupSummary(s).remaining)}`} />`}
        ${avg && html`<${Row} k="חודש ממוצע היום" v=${`נכנס ${fmt(avg.income)} · נשאר ${fmt(avg.left)}`} />`}
        ${s.stage !== 'setup' && html`<${Row} k="כסף שעוד מגיע מלקוחות" v=${fmt((s.toCome.now || 0) + (s.toCome.next || 0) + (s.toCome.later || 0))} />`}
        ${s.stage === 'active' && html`<${Row} k="הכנסה קבועה" v=${`${fmt(s.regular.amount)} ב-${s.regular.day} לחודש`} />`}
        <${Row} k="הוצאות קבועות בחודש" v=${fmt(fixedMonthly(s))} />
        ${rw && html`<${Row} k=${s.stage === 'setup' ? 'בלי הכנסה, הכסף מחזיק' : 'בלי מכירות חדשות, הכסף מחזיק'} v=${rw.until ? `עד ${monthYear(rw.until)}` : 'יותר משנתיים'} />`}
      </tbody></table>

      <${H} n="2">המחירים<//>
      <table class="w-full text-[14px]">
        <thead><tr class="text-[12px] font-bold text-muted"><th class="pb-1 text-start">מוצר</th><th class="pb-1 text-start">מחיר</th><th class="pb-1 text-start">מתי הכסף נכנס</th><th class="pb-1 text-end">לשעת עבודה</th></tr></thead>
        <tbody>${ps.map((p) => html`<tr key=${p.id} class="border-t border-line"><td class="py-1.5 pe-2 font-bold">${p.name}</td><td class="py-1.5 tabular-nums">${fmt(p.price)}${p.kind === 'monthly' ? ' לחודש' : ''}</td><td class="py-1.5 pe-2">${cashText(p, s.assumptions.stayMonths || 3)}</td><td class="py-1.5 text-end tabular-nums">${fmt(perHour(s, p))}</td></tr>`)}</tbody>
      </table>
      ${isLicensed(s) && html`<p class="mt-1 text-[13px] text-muted">המחירים כוללים מע"מ ${SETTINGS.vatPct}%. החישובים לוקחים רק את מה שנשאר לעסק.</p>`}

      <${H} n="3">היעדים<//>
      <table class="w-full text-[15px]"><tbody>
        <${Row} k="נשאר לך בכל חודש" v=${fmt(s.goal)} strong />
        <${Row} k="בשנה" v=${fmt(fc.annualGoal)} />
        <${Row} k=${`הפרשה למס (${ent})`} v=${`${s.taxPct}% מההכנסות`} />
        ${s.stage === 'active' && html`<${Row} k="כרית ביטחון" v=${`${fmt(cushionTarget(s))}${setAsideMonthly(s) ? ` · ${fmt(setAsideMonthly(s))} בחודש` : ' · מלאה'}`} />`}
      </tbody></table>
      ${s.stage === 'active' && html`<div class="mt-3"><${Quarters} fc=${fc} /></div>`}

      <${H} n="4">כמה צריך למכור<//>
      <p class="mb-2 text-[15px]">העסק צריך להכניס <b>${fmt(st.needed)}</b> בחודש מלא. התמהיל:</p>
      <ul class="mb-2 flex flex-wrap gap-2">${ps.filter((p) => m.mix[p.id]).map((p) => html`<li key=${p.id}><${Tag} tone="blue">${m.mix[p.id]} × ${p.short}${p.kind === 'monthly' ? ' (פעילים)' : ''}<//></li>`)}</ul>
      <table class="w-full text-[15px]"><tbody>
        <${Row} k="פניות שצריכות להגיע אליך בחודש" v=${`${num(st.leads)} (${num((st.leads * 12) / 52, 1)} בשבוע)`} />
        <${Row} k="שיחות מכירה בחודש" v=${`${num(st.calls, 1)} (${num((st.calls * 12) / 52, 1)} בשבוע)`} />
        <${Row} k="לקוחות חדשים בחודש" v=${num(st.newClients, 1)} />
        <${Row} k="שעות עבודה בחודש" v=${`${num(st.hours)} מתוך ${num(s.assumptions.hoursMonth)}`} />
      </tbody></table>
      <p class="mt-1 text-[13px] text-muted">החישוב מבוסס על: ${s.assumptions.leadToCall}% מהפניות קובעות שיחה, ${s.assumptions.closeRate}% מהשיחות קונות, לקוח חודשי נשאר ${s.assumptions.stayMonths} חודשים (ממוצעים בתחום, אפשר לשנות).</p>

      <${H} n="5">התחזית לשנה<//>
      <${ForecastChart} fc=${fc} goal=${s.goal} />
      <div class="mt-2"><${ForecastLegend} cushion=${fc.cushion} /></div>
      <p class="mt-3 text-[15px]">יישאר לך בשנה <b>${fmt(fc.yearProfit)}</b> מול יעד של ${fmt(fc.annualGoal)}. מגיעים ליעד ההכנסה החודשית, כל התמהיל (${fmt(st.income)} בחודש), תוך ${fc.ramp} חודשים, ב-${fc.plan.grow}% יותר לקוחות בכל חודש.</p>
      <div class="mt-3"><${Checks} list=${m.checks} how=${false} /></div>
      ${s.applied.length > 0 &&
      html`<p class="mt-3 text-[15px] font-bold">מה שינית בדרך</p>
        <ul class="list-disc ps-5 text-[14px]">${s.applied.map((a) => html`<li key=${a.id + a.at}>${a.title}</li>`)}</ul>`}
      <p class="mt-5 border-t border-line pt-3 text-[12px] text-muted">תחזית היא לא הבטחה. המספרים מחושבים מהנתונים והאחוזים שבתוכנית, וההפרשה למס היא הערכה ולא ייעוץ מס.</p>
    </article>
  </div>`;
}

export function Done({ s }) {
  useEffect(() => {
    const t = setTimeout(() => confetti('chapter'), 200);
    return () => clearTimeout(t);
  }, []);
  const stage = stageOf(s.stage);
  return html`<div class="mx-auto grid max-w-[1000px] items-center gap-8 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10">
    <div>
      <p class="fb-eyebrow mb-1">סיימת את פרק 2 · ${STEP.chapter}</p>
      <h1 class="fb-h1 mb-4 text-[28px] md:text-[36px]">יש לך <span class="marker">תוכנית</span> עם מספרים</h1>
      <p class="mb-4 max-w-[48ch] text-[17px]">${g('אתה יודע', 'את יודעת')} כמה צריך למכור, מאיזה מוצרים, ומה קורה לכסף בכל חודש של השנה הקרובה. בעמוד הכספים רואים אם זה קורה בפועל.</p>
      <div class="flex flex-col gap-2">
        ${[
          ['badge-check', 'תג חדש', g('המתכנן', 'המתכננת')],
          ['medal', 'דרגה חדשה', g('האסטרטג', 'האסטרטגית')],
          ['wallet', 'נפתח', 'המרכז הפיננסי'],
        ].map(([icon, k, v]) => html`<p key=${k} class="flex items-center gap-3 text-[15px]"><span class="text-brand-600"><${Icon} name=${icon} size=${19} /></span><span class="w-[90px] font-bold">${k}</span>${v}</p>`)}
      </div>
    </div>
    <div class="flex justify-center pt-8">
      <${Note} tone="gold" tilt=${-2} class="fb-badge-note !pt-10">
        <span class="fb-note-kicker">פרק 2 הושלם</span>
        <b class="font-display text-[26px]">${g('האסטרטג', 'האסטרטגית')}</b>
        <span class="text-[14px]">חסכת בפרק הזה</span>
        <span class="relative font-display text-[36px] font-black text-money">${fmt(4800)}<${PencilLine} color="#12805c" class="absolute inset-x-0 -bottom-1 h-2 w-full" /></span>
      <//>
    </div>
  </div>`;
}

export const financeLink = (s) => `${FINANCE_URL}?scenario=${FINANCE_SCENARIO[s.stage] || 'setup'}`;

// The home page: only what this step changes on it.
export function Home({ s, go, onPaywall, onFinance }) {
  const done = s.done;
  const chapters = [
    { n: 1, name: 'אפיון', state: 'done' },
    { n: 2, name: 'שביל הכסף', state: done ? 'done' : 'now' },
    { n: 3, name: 'בניית מותג אישי', state: 'locked' },
    { n: 4, name: 'מביאים לקוחות', state: 'locked' },
    { n: 5, name: 'מגדילים מכירות', state: 'locked' },
    { n: 6, name: 'העסק שתמיד רצית', state: 'locked' },
  ];
  return html`<div class="mx-auto max-w-[1040px] px-4 py-5 md:px-8 md:py-7">
    <h1 class="fb-h1 mb-1 text-[28px] md:text-[36px]">בוקר טוב, ${USER.firstName}</h1>
    <p class="mb-5 text-[16px]">${USER.business} · ${done ? 'פרק 2 הושלם' : 'פרק 2, שביל הכסף'}</p>
    <section class="fb-panel mb-5 flex flex-wrap items-center gap-4 !p-4 md:!p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><${Icon} name=${done ? 'lock' : STEP.icon} size=${24} /></span>
      <span class="min-w-0 flex-1">
        <small class="fb-eyebrow block">${done ? 'הצעד הבא · פרק 3, בניית מותג אישי' : `הצעד הבא · פרק ${STEP.chapterNo}, ${STEP.chapter}`}</small>
        <b class="block font-display text-[20px]">${done ? 'שלב 6: שם ולוגו' : `שלב ${STEP.n}: ${STEP.name}`}</b>
      </span>
      <${Button} class="!h-11 !text-[16px]" onClick=${() => (done ? onPaywall() : go({ view: 'step', screen: 'opening' }))}>${done ? 'להמשיך' : 'להתחיל'}<${Icon} name="arrow-left" size=${18} /><//>
    </section>
    <div class="grid items-start gap-5 md:grid-cols-[1.3fr_0.7fr]">
      <section class="fb-panel !p-4 md:!p-5">
        <h2 class="fb-h3 mb-3">המפה</h2>
        <ol class="flex flex-col gap-2">
          ${chapters.map(
            (c) => html`<li key=${c.n}>
              <button type="button" class=${cx('flex w-full items-center gap-3 rounded-xl border-[1.5px] p-3 text-start cursor-pointer', c.state === 'now' ? 'border-brand-600 bg-brand-50' : c.state === 'done' ? 'border-gold/60 bg-[#fdf6e6]' : 'border-line bg-white hover:border-brand-300')} onClick=${() => (c.state === 'locked' ? onPaywall() : c.n === 2 && go({ view: 'step', screen: done ? 'done' : 'opening' }))}>
                <span class=${cx('grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[14px] font-black', c.state === 'done' ? 'bg-gold text-ink' : c.state === 'now' ? 'bg-brand-600 text-white' : 'bg-canvas text-muted')}>${c.state === 'locked' ? html`<${Icon} name="lock" size=${14} />` : c.n}</span>
                <span class="flex-1 font-bold">פרק ${c.n} · ${c.name}</span>
                ${c.state === 'done' && html`<${Tag} tone="live">הושלם<//>`}
              </button>
            </li>`,
          )}
        </ol>
      </section>
      <div class="flex flex-col gap-4">
        <section class="fb-panel !p-4">
          <h2 class="fb-h3 mb-1">העסק במספרים</h2>
          ${done
            ? html`<p class="mb-2 text-[14px]">התוכנית עודכנה ב-${s.doneOn}. אפשר להיכנס שוב ולעדכן, למשל כשהעסק עובר שלב.</p>
                <div class="flex flex-wrap gap-2">
                  <${Button} variant="mini" onClick=${() => go({ view: 'step', screen: 'doc' })}><${Icon} name="file-text" size=${15} />התוכנית העסקית<//>
                  <${Button} variant="text" class="!h-9" onClick=${() => go({ view: 'step', screen: 'stage' })}>לעדכן את המספרים<//>
                </div>`
            : html`<p class="text-[14px] text-muted">עוד לא הושלם.</p>`}
        </section>
        <section class="fb-panel !p-4">
          <h2 class="fb-h3 mb-1 flex items-center gap-2">${!done && html`<${Icon} name="lock" size=${16} class="text-muted" />`}המרכז הפיננסי</h2>
          <p class="mb-2 text-[14px]">${done ? 'נפתח. שם רואים אם התוכנית קורית בפועל.' : 'נפתח בסוף "העסק במספרים".'}</p>
          ${done && html`<${Button} variant="text" class="!h-auto !p-0" onClick=${onFinance}>לעמוד הכספים<//>`}
        </section>
      </div>
    </div>
  </div>`;
}

export function Paywall({ onClose }) {
  return html`<${Sheet} title="הפרקים הבאים" onClose=${onClose} footer=${html`<${Button} variant="secondary" onClick=${onClose}>אחר כך<//><${Button} onClick=${onClose}>להמשיך עם FlowBiz<${Icon} name="arrow-left" size=${18} /><//>`}>
    <div class="flex items-start gap-3">
      <${SharkAvatar} size=${56} mood="happy" />
      <div>
        <p class="mb-2 text-[17px] font-bold">יש לך עסק עם מספרים שעובדים. עכשיו צריך שיכירו אותו.</p>
        <p class="mb-3 text-[15px]">פרקים 3 עד 6: בניית מותג אישי, מביאים לקוחות, מגדילים מכירות, והעסק שתמיד רצית. כל שלב בונה על התוכנית שעשית עכשיו.</p>
      </div>
    </div>
  <//>`;
}
