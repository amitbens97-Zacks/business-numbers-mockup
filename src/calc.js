// Every number in step 5 is computed here, in code. The model (the shark) only writes
// words and expense suggestions; it never computes an amount.
//
// The model, in short (the same rules go to ג'וליוס in the developer notes):
//   - Basket prices include VAT. עוסק פטור keeps the whole price. עוסק מורשה keeps
//     price / (1 + VAT); the VAT is shown as its own line and never counted as income.
//   - Profit = income - product costs - fixed expenses - tax provision (% of income).
//   - Needed income = (goal + fixed expenses + product costs [+ cushion set-aside]) / (1 - tax%).
//   - The mix = sales in a regular month. A monthly product counts ACTIVE clients
//     (they stack month after month); new monthly clients = active / months a client stays.
//     A program over several months spreads its hours over those months.
//   - Plan back: new clients / close rate = calls; calls / lead-to-call rate = leads.
//   - Forecast, 12 months from next month: sales grow from the start point (0 in stage 1,
//     today's average in stages 2-3) to a full month (the whole mix) within the ramp
//     months, in a straight line. The ramp is the shark's unless the user picks one:
//     the months it takes new clients to grow at a healthy pace (rampPlan below).
//   - When the money arrives: "all at the start" = in the month of the sale ("in advance"
//     for a subscription = the average stay, paid at the start); "each month" = a program
//     over its months, a single sale over the months the user set, a subscription monthly.
//   - The cash line: the owner takes out what the month left, up to the goal; a loss
//     comes out of the business's money; what is above the goal stays in the business.
//     In stage 3 the cushion set-aside comes first, until the cushion is full.
import { SETTINGS, FIRST_MONTH, TODAY, payOf, needOf } from './data.js';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
export const fmt = (n) => (n == null || Number.isNaN(n) ? '—' : `${n < 0 ? '-' : ''}${nf.format(Math.abs(Math.round(n)))} ₪`);
export const num = (n, d = 0) => (n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat('he-IL', { maximumFractionDigits: d }).format(n));
export const clientsText = (n) => (Math.abs(n - 1) < 0.05 ? 'לקוח אחד' : `${num(n, 1)} לקוחות`);
export const round50 = (n) => Math.round(n / 50) * 50;

// ---------- months ----------

export function addMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  const t = new Date(y, m - 1 + n, 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
}
export const monthName = (key) => MONTHS[Number(key.split('-')[1]) - 1];
export const monthShort = (key) => SHORT[Number(key.split('-')[1]) - 1];
export const monthYear = (key) => `${monthName(key)} ${key.split('-')[0]}`;
export const FORECAST_MONTHS = Array.from({ length: 12 }, (_, i) => addMonth(FIRST_MONTH, i));
export const todayText = () => {
  const [y, m, d] = TODAY.split('-').map(Number);
  return `${d}.${m}.${y}`;
};

// ---------- expenses ----------

export const monthlyCost = (x) => (x.freq === 'weekly' ? (x.amount * 52) / 12 : x.freq === 'yearly' ? x.amount / 12 : x.amount);
// The forecast month (0-11) an expense starts in.
export const startIndex = (x) => (!x.start || x.start === 'now' ? 0 : Math.max(0, FORECAST_MONTHS.indexOf(x.start)));
export const fixedMonthly = (s) => s.expenses.reduce((t, x) => t + monthlyCost(x), 0);
const fixedIn = (s, i) => s.expenses.reduce((t, x) => t + (i >= startIndex(x) ? monthlyCost(x) : 0), 0);

// ---------- setup (the finance center's budget table) ----------
// Each item: planned, paid so far, and "paid in full". The budget (stage 1 only) that is
// not split into items yet is still money that will go out, so it counts as left to pay.

export const itemLeft = (x) => (x.done ? 0 : Math.max(0, (x.planned || 0) - (x.spent || 0)));
export function setupSummary(s) {
  const items = s.setup.filter((x) => !x.flowbiz); // what FlowBiz builds never counts
  const allocated = items.reduce((t, x) => t + (x.planned || 0), 0);
  const spent = items.reduce((t, x) => t + (x.spent || 0), 0);
  const overItems = items.filter((x) => (x.spent || 0) > (x.planned || 0));
  const over = overItems.reduce((t, x) => t + x.spent - x.planned, 0);
  const itemsLeft = items.reduce((t, x) => t + itemLeft(x), 0);
  const withBudget = s.stage === 'setup';
  const budget = withBudget ? s.setupBudget || 0 : 0;
  const unallocated = withBudget ? Math.max(0, budget - allocated - over) : 0;
  const remaining = itemsLeft + unallocated;
  const final = spent + remaining;
  return { items, budget, withBudget, allocated, spent, over, overItems, unallocated, remaining, final, overBudget: withBudget && s.setupBudget != null ? Math.max(0, final - budget) : 0 };
}
export const setupLeftToPay = (s) => (s.stage === 'setup' || s.setupDone === false ? setupSummary(s).remaining : 0);
// What FlowBiz saves (shown, never counted).
export const savedOf = (list) => list.reduce((t, x) => t + x.value, 0);

// ---------- prices ----------

export const vatRate = () => SETTINGS.vatPct / 100;
export const isLicensed = (s) => s.entity === 'licensed';
export const netPrice = (s, p) => (isLicensed(s) ? p.price / (1 + vatRate()) : p.price);
export const profitPerSale = (s, p) => netPrice(s, p) - (p.cost || 0);
export const perHour = (s, p) => (p.hours > 0 ? profitPerSale(s, p) / p.hours : null);
export const paidProducts = (s) => s.products.filter((p) => !p.free && p.price > 0);
export const missingOf = (p) => [p.price == null && 'מחיר', p.cost == null && 'עלות', p.hours == null && 'שעות'].filter(Boolean);
// In how many months the money of one sale arrives: a program paid each month spreads
// over its months; anything else arrives at once (card installments are the client's).
export const paymentsOf = (p) => (payOf(p) === 'monthly' && p.kind === 'program' ? p.months || 1 : 1);
const callHours = (s) => s.products.find((p) => p.id === 'e1')?.hours ?? 0.5;
export const taxRate = (s) => (s.taxPct ?? 0) / 100;

// ---------- today (stages 2-3) ----------

// Full months from the month the business started to the end of last month (at least 1).
export function monthsSince(from) {
  if (!from) return 0;
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = TODAY.slice(0, 7).split('-').map(Number);
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1));
}

// An average month today, from the totals up to today. The income and clients come from
// the totals; what goes out is today's fixed expenses (the totals include one-time costs).
export function todayAvg(s) {
  const h = s.history;
  if (!h.from || h.income == null) return null;
  const n = monthsSince(h.from);
  const gross = h.income / n;
  const clients = (h.clients || 0) / n;
  const income = isLicensed(s) ? gross / (1 + vatRate()) : gross;
  const out = fixedMonthly(s);
  const tax = income * taxRate(s);
  const pastOut = h.out != null ? h.out / n : null;
  return { gross, income, vat: gross - income, clients, out, tax, left: income - out - tax, n, pastOut };
}


// Months the money lasts with no income at all (stage 1), or with only the money to
// come (stages 2-3).
export function runway(s) {
  const cash = s.bank.amount;
  if (cash == null) return null;
  const toCome = s.stage === 'setup' ? 0 : (s.toCome.now || 0) + (s.toCome.next || 0) + (s.toCome.later || 0);
  const free = cash + toCome - setupLeftToPay(s);
  const monthly = fixedMonthly(s);
  if (monthly <= 0) return { free, months: Infinity, until: null };
  const months = Math.max(0, free / monthly);
  return { free, months, until: months >= 24 ? null : addMonth(TODAY.slice(0, 7), Math.floor(months)) };
}

export const cushionTarget = (s) => (s.cushion != null ? s.cushion : Math.round((fixedMonthly(s) * 2) / 100) * 100);
// Stage 3: what goes aside each month until the cushion is full.
export function setAsideMonthly(s) {
  if (s.stage !== 'active') return 0;
  const gap = cushionTarget(s) - (s.bank.amount || 0);
  return gap > 0 ? Math.ceil(gap / (s.cushionMonths || 6) / 50) * 50 : 0;
}

// ---------- a regular month ----------

export function steady(s, mix) {
  const a = s.assumptions;
  const t = taxRate(s);
  const fixed = fixedMonthly(s);
  const setAside = setAsideMonthly(s);
  let income = 0;
  let gross = 0;
  let cogs = 0;
  let work = 0;
  let newClients = 0;
  const rows = [];
  for (const p of paidProducts(s)) {
    const n = mix[p.id] || 0;
    const inc = n * netPrice(s, p);
    income += inc;
    gross += n * p.price;
    cogs += n * (p.cost || 0);
    work += n * (p.hours || 0);
    const fresh = p.kind === 'monthly' ? n / (a.stayMonths || 3) : n;
    newClients += fresh;
    rows.push({ p, n, income: inc, fresh, hours: n * (p.hours || 0) });
  }
  const calls = a.closeRate > 0 ? newClients / (a.closeRate / 100) : 0;
  const leads = a.leadToCall > 0 ? calls / (a.leadToCall / 100) : 0;
  const callH = calls * callHours(s);
  const tax = income * t;
  const profit = income - cogs - fixed - tax;
  const goal = s.goal || 0;
  const needed = (goal + fixed + cogs + setAside) / (1 - t);
  const hours = work + callH;
  return {
    income, gross, vat: gross - income, cogs, fixed, tax, profit, setAside, needed,
    work, callH, hours, newClients, calls, leads, rows,
    perHour: work > 0 ? (income - cogs) / work : 0,
  };
}

// The shark's mix: a few of each product, best profit per hour first, never more hours
// than the user has, until the regular month reaches the goal (and the set-aside).
export function suggestMix(s) {
  const goal = s.goal || 0;
  const avail = s.assumptions.hoursMonth ?? Infinity;
  const ps = paidProducts(s).filter((p) => p.hours != null);
  const mix = Object.fromEntries(ps.map((p) => [p.id, 0]));
  for (let k = 0; k < 40; k++) {
    const st = steady(s, mix);
    if (st.profit >= goal + st.setAside) break;
    const options = ps
      .map((p) => {
        const next = { ...mix, [p.id]: mix[p.id] + 1 };
        const ph = perHour(s, p) ?? profitPerSale(s, p);
        return { p, next, fits: steady(s, next).hours <= avail, score: ph / (1 + mix[p.id]) };
      })
      .filter((o) => o.fits)
      .sort((x, y) => y.score - x.score);
    if (!options.length) break;
    Object.assign(mix, options[0].next);
  }
  return mix;
}

export const mixOf = (s) => (s.mix ? { ...suggestMix(s), ...s.mix } : suggestMix(s));
export const isSharkMix = (s) => !s.mix;

// ---------- the 12-month forecast ----------

// How long it takes to reach the full month, from the pace new clients can grow at.
//   Stages 2-3: from today's new clients a month to what the full month needs, growing up
//   to 10% a month (the pace check's green line): months = ln(need / today) / ln(1.1).
//   Stage 1, no clients yet: the first client in the first month, then up to 20% more
//   new clients each month (a small start grows faster): months = 1 + ln(need) / ln(1.2).
//   Never fewer than 3 months or more than 12.
export const PACE = { grow: 10, growNew: 20, min: 3, max: 12 };
export function rampPlan(s, st) {
  const need = st.newClients;
  const today = s.stage === 'setup' ? null : todayAvg(s);
  const clamp = (m) => Math.max(PACE.min, Math.min(PACE.max, Math.ceil(m - 1e-9)));
  if (today && today.clients > 0) {
    const ratio = need / today.clients;
    const raw = ratio <= 1 ? 0 : Math.log(ratio) / Math.log(1 + PACE.grow / 100);
    return { months: clamp(raw), from: today.clients, need, ratio, grow: PACE.grow, raw, fresh: false };
  }
  const raw = need <= 1 ? 1 : 1 + Math.log(need) / Math.log(1 + PACE.growNew / 100);
  return { months: clamp(raw), from: 1, need, ratio: need, grow: PACE.growNew, raw, fresh: true };
}

export function forecast(s, mix) {
  const st = steady(s, mix);
  const t = taxRate(s);
  const today = s.stage === 'setup' ? null : todayAvg(s);
  const r0 = today && st.income > 0 ? Math.min(1, today.income / st.income) : 0;
  const plan = rampPlan(s, st);
  const ramp = s.ramp ?? plan.months;
  const f = (m) => r0 + (1 - r0) * Math.min(1, m / ramp);
  const vatDiv = isLicensed(s) ? 1 + vatRate() : 1;
  const ps = paidProducts(s);
  const incomeAt = new Array(12).fill(0);
  const grossAt = new Array(12).fill(0);
  const cogsAt = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    const fm = f(i + 1);
    for (const p of ps) {
      const n = (mix[p.id] || 0) * fm;
      if (!n) continue;
      cogsAt[i] += n * (p.cost || 0);
      if (p.kind === 'monthly') {
        if (payOf(p) === 'start') {
          // Paid in advance: each new client pays the average stay at the start.
          const stay = s.assumptions.stayMonths || 3;
          const prev = (mix[p.id] || 0) * (i === 0 ? r0 : f(i));
          const fresh = n / stay + Math.max(0, n - prev);
          incomeAt[i] += fresh * stay * netPrice(s, p);
          grossAt[i] += fresh * stay * p.price;
        } else {
          incomeAt[i] += n * netPrice(s, p);
          grossAt[i] += n * p.price;
        }
        continue;
      }
      const k = paymentsOf(p);
      for (let j = 0; j < k && i + j < 12; j++) {
        incomeAt[i + j] += (n * netPrice(s, p)) / k;
        grossAt[i + j] += (n * p.price) / k;
      }
    }
  }
  // Payments already promised by clients (stages 2-3): next month, and the month after.
  if (s.stage !== 'setup') {
    incomeAt[0] += (s.toCome.next || 0) / vatDiv;
    grossAt[0] += s.toCome.next || 0;
    incomeAt[1] += (s.toCome.later || 0) / vatDiv;
    grossAt[1] += s.toCome.later || 0;
  }
  const goal = s.goal || 0;
  const cushion = s.stage === 'active' ? cushionTarget(s) : 0;
  // The money in the business today. What still arrives this month pays this month
  // (the owner's November), so the forecast starts from today's money; what is left of
  // the setup is paid in the first month.
  let cash = s.bank.amount || 0;
  const startCash = cash;
  const setupLeft = setupLeftToPay(s);
  let aside = Math.max(0, cushion - (s.bank.amount || 0));
  const rows = [];
  let yearGross = 0;
  let ceilingMonth = null;
  for (let i = 0; i < 12; i++) {
    const income = incomeAt[i];
    const fixed = fixedIn(s, i);
    const tax = income * t;
    const profit = income - cogsAt[i] - fixed - tax;
    const keep = Math.min(aside, Math.max(0, profit), st.setAside || 0);
    aside -= keep;
    const draw = Math.max(0, Math.min(goal, profit - keep));
    cash += profit - draw - (i === 0 ? setupLeft : 0);
    yearGross += grossAt[i];
    if (ceilingMonth == null && !isLicensed(s) && yearGross > SETTINGS.exemptCeiling) ceilingMonth = i;
    rows.push({ key: FORECAST_MONTHS[i], f: f(i + 1), income, gross: grossAt[i], vat: grossAt[i] - income, cogs: cogsAt[i], fixed, tax, profit, draw, keep, cash });
  }
  const goalIdx = rows.findIndex((r) => r.profit >= goal);
  const minRow = rows.reduce((m, r) => (r.cash < m.cash ? r : m), rows[0]);
  const fillIdx = cushion ? (startCash >= cushion ? -2 : rows.findIndex((r) => r.cash >= cushion)) : -1;
  const yearProfit = rows.reduce((x, r) => x + r.profit, 0);
  const annualGoal = s.stage === 'active' && s.annualGoal ? s.annualGoal : goal * 12;
  const fSum = rows.reduce((x, r) => x + r.f, 0);
  const quarters = [0, 1, 2, 3].map((q) => {
    const part = rows.slice(q * 3, q * 3 + 3);
    const share = part.reduce((x, r) => x + r.f, 0) / (fSum || 1);
    return { q: q + 1, from: part[0].key, to: part[2].key, profit: part.reduce((x, r) => x + r.profit, 0), goal: Math.round((annualGoal * share) / 100) * 100 };
  });
  return {
    rows, st, r0, ramp, plan, rampByShark: s.ramp == null, startCash, cushion, goalIdx, minRow, fillIdx, yearProfit, annualGoal, quarters,
    yearIncome: rows.reduce((x, r) => x + r.income, 0),
    yearGross, ceilingMonth,
  };
}

// ---------- the four checks ----------

const TONE_SCORE = { ok: 2, warn: 1, bad: 0, info: 2 };

export function checks(s, mix, fc) {
  const st = fc.st;
  const goal = s.goal || 0;
  const avail = s.assumptions.hoursMonth || 0;
  const t = taxRate(s);
  const out = [];

  // 1. The goal.
  const gap = goal + st.setAside - st.profit;
  const goalHow = [
    ['הכנסות בחודש מלא (כל התמהיל)', fmt(st.income)],
    ['פחות עלויות המוצרים', fmt(-st.cogs)],
    ['פחות הוצאות קבועות', fmt(-st.fixed)],
    [`פחות הפרשה למס (${s.taxPct}%)`, fmt(-st.tax)],
    st.setAside > 0 && ['פחות לכרית הביטחון', fmt(-st.setAside)],
    ['נשאר לך', fmt(st.profit - st.setAside), true],
    ['היעד', fmt(goal)],
  ].filter(Boolean);
  const goalRule = 'ירוק: בחודש מלא נשאר לך לפחות היעד, ומגיעים לזה בתוך השנה. אדום: גם בחודש מלא נשאר פחות מהיעד.';
  out.push(
    gap <= 0
      ? { id: 'goal', q: 'מגיעים ליעד?', tone: fc.goalIdx >= 0 ? 'ok' : 'warn', a: fc.goalIdx >= 0 ? `כן, החל מ${monthYear(fc.rows[fc.goalIdx].key)}` : 'רק אחרי השנה הראשונה', sub: `בחודש מלא נשארים ${fmt(st.profit - st.setAside)}, היעד ${fmt(goal)}`, how: goalHow, rule: goalRule }
      : { id: 'goal', q: 'מגיעים ליעד?', tone: 'bad', a: `חסרים ${fmt(gap)} בחודש`, sub: `בחודש מלא נשארים ${fmt(st.profit - st.setAside)}, היעד ${fmt(goal)}`, how: goalHow, rule: goalRule },
  );

  // 2. The hours: what each work hour has to earn, against what the basket earns.
  const needPerHour = avail > 0 ? (goal + st.fixed + st.setAside) / (1 - t) / avail : Infinity;
  const timeTone = st.hours > avail ? 'bad' : st.hours > avail * 0.9 ? 'warn' : 'ok';
  out.push({
    id: 'time',
    q: 'יש לזה זמן?',
    tone: timeTone,
    a: timeTone === 'bad' ? `צריך ${num(st.hours)} שעות, יש ${num(avail)}` : `${num(st.hours)} מתוך ${num(avail)} שעות בחודש`,
    sub: `כל שעת עבודה צריכה להכניס ${fmt(needPerHour)}. הסל שלך מכניס ${fmt(st.perHour)} לשעה`,
    needPerHour,
    how: [
      ['שעות עבודה עם לקוחות (התמהיל)', `${num(st.work)} שעות`],
      [`שיחות מכירה: ${num(st.calls, 1)} שיחות × ${num(callHours(s) * 60)} דקות`, `${num(st.callH, 1)} שעות`],
      ['סה"כ צריך', `${num(st.hours)} שעות`, true],
      ['יש לך בחודש', `${num(avail)} שעות`],
    ],
    rule: 'ירוק: עד 90% מהשעות שיש לך. כתום: בין 90% ל-100%, אין מקום לחודש עמוס. אדום: צריך יותר שעות ממה שיש.',
  });

  // 3. The money on the way.
  const low = fc.minRow;
  const cashTone = low.cash < 0 ? 'bad' : s.stage === 'active' && low.cash < fc.cushion ? 'warn' : 'ok';
  const upTo = fc.rows.slice(0, fc.rows.indexOf(low) + 1);
  const sum = (k) => upTo.reduce((x, r) => x + r[k], 0);
  const setupLeft = setupLeftToPay(s);
  out.push({
    id: 'cash',
    q: 'הכסף מחזיק בדרך?',
    tone: cashTone,
    a: low.cash < 0 ? `ב${monthName(low.key)} הכסף נגמר` : cashTone === 'warn' ? 'מחזיק, אבל מתחת לכרית' : 'כן, לאורך כל השנה',
    sub: `הכי נמוך: ${fmt(low.cash)} ב${monthName(low.key)}`,
    how: [
      ['בעסק היום', fmt(fc.startCash)],
      setupLeft > 0 && ['פחות מה שנשאר לשלם על ההקמה', fmt(-setupLeft)],
      [`נכנס מלקוחות עד ${monthName(low.key)}`, fmt(sum('income'))],
      ['פחות הוצאות, עלויות המוצרים ומס', fmt(-(sum('fixed') + sum('cogs') + sum('tax')))],
      ['פחות מה שיוצא אליך (עד גובה היעד)', fmt(-sum('draw'))],
      [`בעסק ב${monthName(low.key)}, הנקודה הכי נמוכה`, fmt(low.cash), true],
    ].filter(Boolean),
    rule: `ירוק: הכסף בעסק לא יורד מתחת לאפס באף חודש.${s.stage === 'active' ? ' כתום: יורד מתחת לכרית הביטחון.' : ''} אדום: בחודש כלשהו הכסף נגמר. כל חודש יוצא אליך מה שהחודש השאיר, עד גובה היעד.`,
  });

  // 4. The pace (stages 2-3): how much faster than today, and per month.
  const today = todayAvg(s);
  if (s.stage === 'setup' || !today || today.clients <= 0) {
    out.push({
      id: 'pace',
      q: 'הקצב סביר?',
      tone: 'info',
      a: `${num(st.newClients, 1)} לקוחות חדשים בחודש`,
      sub: `מגיעים לזה תוך ${fc.ramp} חודשים. בלי לקוחות עדיין, אין למה להשוות`,
      how: [
        ['פניות שמגיעות אליך בחודש', num(st.leads)],
        [`${s.assumptions.leadToCall}% מהן קובעות שיחה`, `${num(st.calls, 1)} שיחות`],
        [`${s.assumptions.closeRate}% מהשיחות קונות`, `${num(st.newClients, 1)} לקוחות`, true],
      ],
      rule: 'בלי לקוחות עדיין זו בדיקה למידע בלבד, היא לא משנה את השורה התחתונה. מחלק 4: כמה פניות צריך כדי שזה יקרה.',
    });
  } else {
    const ratio = st.newClients / today.clients;
    const monthly = ratio > 1 ? (Math.pow(ratio, 1 / fc.ramp) - 1) * 100 : 0;
    const tone = monthly <= 10 ? 'ok' : monthly <= 20 ? 'warn' : 'bad';
    out.push({
      id: 'pace',
      q: 'הקצב סביר?',
      tone,
      a: ratio <= 1 ? 'כן, כמו היום' : `פי ${num(ratio, 1)} ממה שיש היום`,
      sub: `היום ${clientsText(today.clients)} בחודש, צריך ${num(st.newClients, 1)}${ratio > 1 ? `: עוד ${num(monthly)}% בכל חודש, ${fc.ramp} חודשים` : ''}`,
      ratio,
      how: [
        [`לקוחות חדשים בחודש היום (ממוצע ${today.n} חודשים)`, num(today.clients, 1)],
        ['צריך בחודש מלא', num(st.newClients, 1)],
        ['פי כמה', `פי ${num(Math.max(1, ratio), 1)}`],
        [`צמיחה בכל חודש, ${fc.ramp} חודשים`, `${num(monthly)}%`, true],
      ],
      rule: 'ירוק: עד 10% יותר לקוחות בכל חודש. כתום: עד 20%. אדום: יותר מזה, קצב שרוב העסקים לא מחזיקים.',
    });
  }
  return out;
}

export function verdict(list) {
  const main = list.filter((c) => c.id !== 'pace');
  const bad = main.find((c) => c.tone === 'bad');
  if (bad) return { tone: 'bad', title: 'יש בעיה במודל', cause: causeOf(bad) };
  const warn = list.find((c) => c.tone === 'warn' || c.tone === 'bad');
  if (warn) return { tone: 'warn', title: 'אפשרי, עם שינוי', cause: causeOf(warn) };
  return { tone: 'ok', title: 'המודל עובד', cause: 'מגיעים ליעד, בשעות שיש לך, והכסף מחזיק לאורך כל הדרך.' };
}
function causeOf(c) {
  if (c.id === 'goal') return c.tone === 'bad' ? `גם בחודש מלא ${c.a.replace('חסרים', 'חסרים עוד')} כדי להגיע ליעד.` : 'היעד מגיע, אבל רק אחרי השנה הראשונה.';
  if (c.id === 'time') return c.tone === 'bad' ? `כדי להגיע ליעד ${c.a.replace('צריך', 'צריך')} בחודש.` : 'השעות כמעט מלאות, אין מקום לחודש עמוס.';
  if (c.id === 'cash') return c.tone === 'bad' ? `${c.a} לפני שההכנסה מספיקה.` : 'הכסף בעסק יורד מתחת לכרית הביטחון בדרך.';
  return `הקצב גבוה: ${c.a}, ${c.sub.split(': ')[1] || ''}.`;
}
export const scoreOf = (list) => list.reduce((x, c) => x + TONE_SCORE[c.tone], 0);

// ---------- everything at once ----------

export function model(s) {
  const mix = mixOf(s);
  const fc = forecast(s, mix);
  const list = checks(s, mix, fc);
  return { mix, fc, st: fc.st, checks: list, verdict: verdict(list), score: scoreOf(list) };
}

// ---------- the fixes, ranked by what they change ----------
// Each fix returns a new state. The mix is frozen first, so the user sees exactly
// what the one change does (more hours re-runs the shark's mix, since that is its point).

const freeze = (s) => ({ ...s, mix: mixOf(s), applied: s.applied });

export function fixes(s) {
  const now = model(s);
  if (now.verdict.tone === 'ok') return [];
  const mix = now.mix;
  const ps = paidProducts(s);
  const c = [];
  const byId = Object.fromEntries(now.checks.map((x) => [x.id, x]));

  // Raise the price of the product that brings the most money.
  const top = [...ps].sort((a, b) => (mix[b.id] || 0) * b.price - (mix[a.id] || 0) * a.price)[0];
  if (top && mix[top.id]) {
    const to = round50(top.price * 1.12);
    c.push({
      id: 'price',
      icon: 'tag',
      title: `להעלות את ${top.short} ל-${fmt(to)}`,
      sub: `במקום ${fmt(top.price)}. מתעדכן גם בסל המוצרים`,
      basket: true,
      make: (x) => ({ ...freeze(x), products: x.products.map((p) => (p.id === top.id ? { ...p, price: to } : p)) }),
    });
  }

  // Move one sale from the weakest product per hour to the strongest.
  const ranked = ps.filter((p) => p.hours > 0).sort((a, b) => perHour(s, b) - perHour(s, a));
  const best = ranked[0];
  const worst = [...ranked].reverse().find((p) => (mix[p.id] || 0) > 0 && p.id !== best?.id);
  if (best && worst) {
    c.push({
      id: 'shift',
      icon: 'arrow-left-right',
      title: `${best.short} אחד במקום ${worst.short} אחד`,
      sub: `${best.short} מכניס ${fmt(perHour(s, best))} לשעה, ${worst.short} ${fmt(perHour(s, worst))}`,
      make: (x) => {
        const m = { ...mixOf(x) };
        m[worst.id] -= 1;
        m[best.id] = (m[best.id] || 0) + 1;
        return { ...x, mix: m };
      },
    });
  }

  // One more monthly client (they stack: money every month for the same work).
  const monthly = ps.find((p) => p.kind === 'monthly');
  if (monthly) {
    c.push({
      id: 'monthly',
      icon: 'repeat',
      title: `עוד לקוח אחד ב${monthly.short}`,
      sub: `${fmt(netPrice(s, monthly))} כל חודש, ${num(monthly.hours)} שעות בחודש`,
      make: (x) => {
        const m = { ...mixOf(x) };
        m[monthly.id] = (m[monthly.id] || 0) + 1;
        return { ...x, mix: m };
      },
    });
  }

  // More hours for client work.
  if (byId.time.tone !== 'ok' || byId.goal.tone === 'bad') {
    c.push({
      id: 'hours',
      icon: 'clock',
      title: 'עוד 4 שעות בשבוע לעבודה עם לקוחות',
      sub: `${num(s.assumptions.hoursMonth)} שעות בחודש יהיו ${num(s.assumptions.hoursMonth + 16)}. הכריש מחשב מחדש את התמהיל`,
      make: (x) => ({ ...x, mix: null, assumptions: { ...x.assumptions, hoursMonth: (x.assumptions.hoursMonth || 0) + 16 } }),
    });
  }

  // More time to reach a full month (gentler pace, and a softer start for the cash).
  const rampNow = now.fc.ramp;
  if (rampNow < 12 && (byId.pace.tone === 'warn' || byId.pace.tone === 'bad' || byId.cash.tone !== 'ok')) {
    const to = Math.min(12, rampNow + 3);
    c.push({ id: 'time-more', icon: 'calendar-plus', title: `${to} חודשים להגיע ליעד ההכנסה`, sub: `במקום ${rampNow}. הקצב בכל חודש יורד`, make: (x) => ({ ...freeze(x), ramp: to }) });
  }

  // Another goal for the first year: what this mix really leaves.
  if (byId.goal.tone === 'bad') {
    const to = Math.max(1000, Math.floor((now.st.profit - now.st.setAside) / 500) * 500);
    if (to < (s.goal || 0)) c.push({ id: 'goal', icon: 'target', title: `יעד של ${fmt(to)} בחודש לשנה הראשונה`, sub: `במקום ${fmt(s.goal)}. אפשר להעלות אותו כשהמספרים יגדלו`, make: (x) => ({ ...freeze(x), goal: to }) });
  }

  // Short on cash for a while: put the missing money in up front, so the business never
  // goes below zero (the simplest fix when a few hundred or a few thousand are missing).
  const low = now.fc.minRow;
  if (low && low.cash < 0) {
    const amt = Math.ceil(-low.cash / 500) * 500;
    c.push({
      id: 'cash-in',
      icon: 'piggy-bank',
      title: `להכניס לעסק ${fmt(amt)} מראש`,
      sub: `ב${monthName(low.key)} חסרים ${fmt(-low.cash)}. כסף שנכנס עכשיו שומר שהעסק לא נכנס למינוס, עד שהמכירות מגיעות`,
      make: (x) => ({ ...freeze(x), bank: { ...x.bank, amount: (x.bank.amount || 0) + amt } }),
      boost: amt <= 3000 ? 60000 : 0,
    });
  }

  // Drop what can wait. Never marketing that brings the leads, never what the law needs:
  // only expenses the shark marks "אפשר לחכות" (or the user's own small tools).
  const cut = [...s.expenses]
    .filter((x) => !x.flowbiz && x.category !== 'marketing' && x.category !== 'gov' && needOf(x.name) === 3)
    .sort((a, b) => monthlyCost(b) - monthlyCost(a))[0];
  if (cut && monthlyCost(cut) >= 100) {
    c.push({ id: 'cut', icon: 'scissors', title: `לוותר בינתיים על ${cut.name}`, sub: `חוסך ${fmt(monthlyCost(cut))} בחודש. אפשר להחזיר כשההכנסה מגיעה`, make: (x) => ({ ...freeze(x), expenses: x.expenses.filter((e) => e.id !== cut.id) }) });
  }

  return c
    .map((fx) => {
      const after = model(fx.make(s));
      const gap = (m) => Math.max(0, (s.goal || 0) - m.st.profit);
      // A lower goal is the last resort: it ranks after the fixes that change the business.
      const impact = (after.score - now.score) * 10000 + (gap(now) - gap(after)) + (after.verdict.tone !== now.verdict.tone ? 50000 : 0) - (fx.id === 'goal' ? 45000 : 0) + (after.score > now.score ? fx.boost || 0 : 0);
      return { ...fx, before: now, after, impact };
    })
    .filter((fx) => fx.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
}
