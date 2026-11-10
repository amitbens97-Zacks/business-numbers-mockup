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
//   - Forecast, 12 months from next month, in three scenarios (rampPlan below): a start,
//     a pace that slows month by month, weak months (holidays, summer) and the hours as a
//     ceiling. The user can edit each scenario. The checks, the verdict and the summary
//     use the realistic one.
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
// The fixed expenses that grow with the business: advertising (more leads) and tools
// (more seats, bigger plans). Accountant, insurance, FlowBiz and the like stay as they are.
export const GROWS = ['marketing', 'tools'];
export const growingMonthly = (s) => s.expenses.filter((x) => GROWS.includes(x.category)).reduce((t, x) => t + monthlyCost(x), 0);
const fixedIn = (s, i) => s.expenses.reduce((t, x) => t + (i >= startIndex(x) ? monthlyCost(x) : 0), 0);
const growingIn = (s, i) => s.expenses.filter((x) => GROWS.includes(x.category)).reduce((t, x) => t + (i >= startIndex(x) ? monthlyCost(x) : 0), 0);

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
  // Left to pay = what the items still need (Amit, 10.11): budget not yet in an item is free money.
  const remaining = itemsLeft;
  const final = spent + remaining;
  return { items, budget, withBudget, allocated, spent, over, overItems, unallocated, remaining, final, overBudget: withBudget && s.setupBudget != null ? Math.max(0, final - budget) : 0 };
}
export const setupLeftToPay = (s) => (s.stage === 'setup' || s.setupDone === false ? setupSummary(s).remaining : 0);
// What FlowBiz saves (shown, never counted).
export const savedOf = (list) => list.reduce((t, x) => t + x.value, 0);

// ---------- prices ----------

export const vatRate = () => SETTINGS.vatPct / 100;
// The exempt ceiling. The plan always follows the type the user chose: start exempt, and
// switch when the money really passes the ceiling. The step only informs (what the full
// month brings in a year, and what is left as licensed), and recommends switching only when
// the business is over the ceiling already today (stages 2-3, by today's average).
// The least the business has to bring in to keep the goal (part 4's "needed"), in a year.
// Not the shark's mix: whole sales usually bring in a bit more than the least.
export const fullYearGross = (s) => steady(s, mixOf(s)).gross * 12;
export const neededYear = (s) => steady(s, mixOf(s)).needed * 12;
export const overCeiling = (s) => s.entity === 'exempt' && neededYear(s) > SETTINGS.exemptCeiling;
export const overCeilingToday = (s) => {
  if (s.entity !== 'exempt' || s.stage === 'setup') return false;
  const a = todayAvg(s);
  return !!a && a.gross * 12 > SETTINGS.exemptCeiling;
};
// The full month as licensed, same mix: what would be left.
export function asLicensed(s) {
  const st = steady({ ...s, entity: 'licensed' }, mixOf(s));
  return { st, left: st.profit - st.setAside };
}
export const isLicensed = (s) => s.entity === 'licensed';
const wasLicensed = (s) => s.entity === 'licensed';
export const netPrice = (s, p) => (isLicensed(s) ? p.price / (1 + vatRate()) : p.price);
export const profitPerSale = (s, p) => netPrice(s, p) - (p.cost || 0);
export const perHour = (s, p) => (p.hours > 0 ? profitPerSale(s, p) / p.hours : null);
export const paidProducts = (s) => s.products.filter((p) => !p.free && p.price > 0);
export const missingOf = (p) => [p.price == null && 'מחיר', p.cost == null && 'עלות', p.hours == null && 'שעות'].filter(Boolean);
// In how many months the money of one sale arrives: a program paid each month spreads
// over its months; anything else arrives at once (card installments are the client's).
export const paymentsOf = (p) => (payOf(p) === 'monthly' && p.kind === 'program' ? p.months || 1 : 1);
const callHours = (s) => s.products.find((p) => p.id === 'e1')?.hours ?? 0.5;
// ---------- tax (the accountant chapter's calculator, 2026) ----------
// Checked 10.11.2026 against the Tax Authority's 2026 deductions booklet (brackets after the
// widening of the 20% and 31% brackets, approved 30.3.2026 retroactive to 1.1.2026), the
// National Insurance self-employed rates page, and Kol Zchut for the credit points.
//   - Income tax by the 2026 brackets on the taxable profit, minus credit points (2,904 a
//     point a year) and the settlement discount (rate x income up to a ceiling).
//   - NI + health on the profit: 7.7% up to 7,703 a month (60% of the average wage), 18% above,
//     up to 51,910 a month. A salary uses up the reduced part first.
//   - 52% of the NI part (not health) is deducted from the taxable profit (section 47A).
//   - With a salary, the business is taxed from where the salary ends, and the points go to
//     the salary first.
// The rate = (income tax + NI) ÷ the profit before tax, at the profit that leaves the goal.
// Not included (the user is told): pension and study-fund deposits.
export const TAX_2026 = {
  brackets: [[84120, 0.1], [120720, 0.14], [228000, 0.2], [301200, 0.31], [560280, 0.35], [721560, 0.47], [Infinity, 0.5]],
  point: 2904,
  niLow: 7703 * 12,
  niCap: 51910 * 12,
  niLowRate: 0.077, // 4.47% NI + 3.23% health
  niRate: 0.18, // 12.83% NI + 5.17% health
  niPartLow: 0.0447,
  niPart: 0.1283,
  niDeduct: 0.52,
};
export const NI_MIN = 'ביטוח לאומי (מינימום)';
// The settlement discount: rate and ceiling as in the booklet's table (the system picks the
// town from the official list; the mockup shows the combinations).
export const SETTLE = [[7, 146640], [10, 180000], [12, 213240], [14, 219960], [16, 226560], [18, 245400], [20, 267840]];
function bracketTax(x) {
  let tax = 0;
  let from = 0;
  for (const [to, r] of TAX_2026.brackets) {
    if (x <= from) break;
    tax += (Math.min(x, to) - from) * r;
    from = to;
  }
  return tax;
}
// Children by age in the tax year: [field, label, points for the mother, for the father].
export const KIDS = [
  ['k0', 'נולד השנה', 2.5, 2.5],
  ['k12', 'בן 1 או 2', 4.5, 4.5],
  ['k3', 'בן 3', 3.5, 3.5],
  ['k45', 'בן 4 או 5', 2.5, 2.5],
  ['k617', 'בן 6 עד 17', 2, 1],
  ['k18', 'בן 18 השנה', 0.5, 0],
];
export const kidPoints = (c) => KIDS.reduce((a, [f, , m, d]) => a + ((c.kids && c.kids[f]) || 0) * (c.gender === 'f' ? m : d), 0);
export const kidCount = (c) => KIDS.reduce((a, [f]) => a + ((c.kids && c.kids[f]) || 0), 0);
// Combat reserve days last year -> points (section 39B, from 2026, at most 4).
export const reservePoints = (days) => (!days || days < 30 ? 0 : days < 40 ? 0.5 : days < 50 ? 0.75 : Math.min(4, 1 + Math.floor((days - 50) / 5) * 0.25));
export const DEGREE_PTS = [0, 1, 0.5, 1.5, 1];
export const OLEH_PTS = [0, 1, 3, 2, 1];
// The credit points, by what the user filled (s.taxCalc).
export function creditPoints(c) {
  const lines = [
    [c.gender === 'f' ? 'תושבת ישראל (2.25 + חצי לאישה)' : 'תושב ישראל', c.gender === 'f' ? 2.75 : 2.25],
    ['שחרור מצה"ל או משירות לאומי', [0, 1, 2][c.soldier || 0]],
    [`ילדים (${kidCount(c)})`, kidPoints(c)],
    [`מילואים כלוחם (${c.reserveDays || 0} ימים)`, reservePoints(c.reserveDays)],
    ['הורה יחיד או משלם מזונות', c.single ? 1 : 0],
    ['תואר או תעודת מקצוע', DEGREE_PTS[c.degree || 0]],
    ['עלייה', OLEH_PTS[c.oleh || 0]],
  ].filter(([, n]) => n > 0);
  return { lines, total: lines.reduce((a, [, n]) => a + n, 0) };
}
// Tax and NI on a year's business profit P.
export function taxOn(s, P) {
  const c = s.taxCalc || {};
  const salary = c.sole === false ? (c.salary || 0) * 12 : 0;
  const pts = creditPoints(c);
  const credit = pts.total * TAX_2026.point;
  const [sRate, sCap] = c.settle ? SETTLE[c.settle - 1] : [0, 0];
  // NI + health on the business profit; a salary uses up the reduced part first.
  const low = Math.max(0, TAX_2026.niLow - salary);
  const top = Math.max(0, TAX_2026.niCap - salary);
  const atLow = Math.min(P, low);
  const atFull = Math.max(0, Math.min(P, top) - low);
  const ni = atLow * TAX_2026.niLowRate + atFull * TAX_2026.niRate;
  const niPart = atLow * TAX_2026.niPartLow + atFull * TAX_2026.niPart;
  const deduct = niPart * TAX_2026.niDeduct;
  const taxable = Math.max(0, P - deduct);
  const after = (x) => Math.max(0, bracketTax(x) - credit - (sRate / 100) * Math.min(x, sCap));
  const gross = bracketTax(salary + taxable) - bracketTax(salary);
  const incomeTax = after(salary + taxable) - after(salary);
  const niMin = s.expenses.filter((x) => x.name === NI_MIN).reduce((a, x) => a + (x.amount || 0) * 12, 0);
  const niNet = Math.max(0, ni - niMin);
  return { P, salary, pts, credit, sRate, sCap, deduct, taxable, gross, incomeTax, ni, niMin, niNet, total: incomeTax + niNet };
}
// At the goal: the yearly profit before tax that leaves 12 x the goal, and its rate.
export function taxAtGoal(s) {
  const want = 12 * Math.max(0, s.goal || 0);
  let lo = want;
  let hi = want * 3 + 1000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (mid - taxOn(s, mid).total >= want) hi = mid;
    else lo = mid;
  }
  const r = taxOn(s, hi);
  return { ...r, want, rate: hi > 0 ? r.total / hi : 0 };
}
export const taxRate = (s) => (s.taxManual ? (s.taxPct ?? 0) / 100 : taxAtGoal(s).rate);
// The rate as the user sees it, one decimal.
export const taxPctOf = (s) => Math.round(taxRate(s) * 1000) / 10;

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
  const income = wasLicensed(s) ? gross / (1 + vatRate()) : gross;
  const out = fixedMonthly(s);
  const tax = Math.max(0, income - out) * taxRate(s);
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

// key = the scenario: in a full month the growing expenses are cost% higher than today.
export function steady(s, mix, key = 'real') {
  const a = s.assumptions;
  const t = taxRate(s);
  const fixedGrow = growingMonthly(s) * ((paceOf(s, key).cost || 0) / 100);
  const fixed = fixedMonthly(s) + fixedGrow;
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
  // Tax on the profit: what is left after the products and the fixed expenses.
  const tax = Math.max(0, income - cogs - fixed) * t;
  const profit = income - cogs - fixed - tax;
  const goal = s.goal || 0;
  const beforeTax = (goal + setAside) / (1 - t);
  const needed = beforeTax + fixed + cogs;
  const hours = work + callH;
  return {
    income, gross, vat: gross - income, cogs, fixed, fixedGrow, fixedBase: fixed - fixedGrow, tax, profit, setAside, needed, beforeTax,
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

// The equation of the three scenarios. Growth is not a straight, steady line:
//   1. A start: stage 1 = the first client arrives after `delay` months; stages 2-3 =
//      today's new clients, flat for `delay` months.
//   2. The pace slows: in growth month k the clients grow by g(k) = start% × (1 - slow%)^(k-1).
//      A small business grows fast from a small base; the bigger it gets, the harder each %.
//   3. Weak months: in the months of Passover, the summer break and the Tishrei holidays,
//      sales are dip% lower, and come back the month after (the trend goes on underneath).
//   4. A ceiling: never more than the hours the user has (hours available ÷ full-month hours).
//   5. Expenses grow too: advertising and tools are cost% higher in the full month, and in
//      between they move with the trend: extra(m) = growing × cost% × (trend(m) - t0) / (1 - t0),
//      t0 = the start level. Past the full month they keep rising with the trend.
//   level(m) = min(ceiling, trend(m)) × (weak month ? 1 - dip% : 1), where trend(m) =
//   trend(m-1) × (1 + g(k)). 1 = the full month (the whole mix). The full month arrives in
//   the first month the level reaches 1. The user can edit the four numbers of every
//   scenario (s.pace); the checks, verdict, fixes and summary use the realistic one.
export const PACE_DEFAULT = {
  real: { start: 25, slow: 4, dip: 20, delay: 0, cost: 20 },
  low: { start: 15, slow: 6, dip: 30, delay: 1, cost: 30 },
  high: { start: 35, slow: 4, dip: 10, delay: 0, cost: 15 },
};
export const SCENARIO_KEYS = ['real', 'low', 'high'];
export const SCEN_NAME = { real: 'הריאלי', low: 'הפסימי', high: 'האופטימי' };
// Weak months by calendar month (the mockup's year). The system takes them from the Hebrew
// calendar of each year: Tishrei falls in September in some years and October in others.
export const WEAK = { 4: 'פסח', 8: 'החופש הגדול', 10: 'חגי תשרי' };
export const paceOf = (s, key) => ({ ...PACE_DEFAULT[key], ...((s.pace && s.pace[key]) || {}) });
export const paceEdited = (s, key) => !!(s.pace && s.pace[key] && Object.keys(PACE_DEFAULT[key]).some((f) => s.pace[key][f] !== PACE_DEFAULT[key][f]));
export const growAt = (P, k) => (P.start / 100) * Math.pow(1 - P.slow / 100, k - 1);
const monthNum = (m) => Number(addMonth(FIRST_MONTH, m - 1).split('-')[1]);
const HORIZON = 60;
export function rampPlan(s, st, key = 'real') {
  const P = paceOf(s, key);
  const need = st.newClients;
  const today = s.stage === 'setup' ? null : todayAvg(s);
  const avail = s.assumptions.hoursMonth || 0;
  const cap = avail > 0 && st.hours > 0 ? Math.max(1, avail / st.hours) : 1;
  const fresh = !(today && today.clients > 0);
  const from = fresh ? 1 : today.clients;
  const start = need > 0 ? Math.min(1, from / need) : 1;
  const delay = Math.max(0, Math.round(P.delay || 0));
  const levels = [fresh ? 0 : Math.min(cap, start)];
  const trends = [fresh ? 0 : Math.min(cap, start)];
  let trend = fresh ? 0 : start;
  let k = 0;
  let months = null;
  for (let m = 1; m <= HORIZON; m++) {
    if (m > delay) {
      if (trend === 0) trend = start; // the first client
      else trend *= 1 + growAt(P, ++k);
    }
    const weak = WEAK[monthNum(m)];
    const lvl = Math.min(cap, trend) * (weak ? 1 - (P.dip || 0) / 100 : 1);
    levels.push(lvl);
    trends.push(Math.min(cap, trend));
    if (months == null && lvl >= 1 - 1e-9) months = m;
  }
  const ratio = need > 0 ? need / from : 1;
  // How far the business has grown from its start, for the expenses: 0 at the start, 1 at the full month.
  const grown = (m) => (start >= 1 ? 0 : Math.max(0, (trends[Math.min(m, HORIZON)] - start) / (1 - start)));
  return { key, P, months, from, need, ratio, fresh, cap, start, delay, level: (m) => levels[Math.min(m, HORIZON)], trend: (m) => trends[Math.min(m, HORIZON)], grown };
}
export const weakIn = (rows) => rows.map((r) => WEAK[Number(r.key.split('-')[1])] && [r.key, WEAK[Number(r.key.split('-')[1])]]).filter(Boolean);

export function forecast(s, mix, key = 'real') {
  const st = steady(s, mix, key);
  const t = taxRate(s);
  const plan = rampPlan(s, st, key);
  const ramp = plan.months;
  const f = plan.level;
  const r0 = f(0);
  const vatDiv = wasLicensed(s) ? 1 + vatRate() : 1;
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
    const grow = growingIn(s, i) * ((plan.P.cost || 0) / 100) * plan.grown(i + 1);
    const fixed = fixedIn(s, i) + grow;
    const tax = Math.max(0, income - cogsAt[i] - fixed) * t;
    const profit = income - cogsAt[i] - fixed - tax;
    const keep = Math.min(aside, Math.max(0, profit), st.setAside || 0);
    aside -= keep;
    const draw = Math.max(0, Math.min(goal, profit - keep));
    cash += profit - draw - (i === 0 ? setupLeft : 0);
    yearGross += grossAt[i];
    if (ceilingMonth == null && !isLicensed(s) && yearGross > SETTINGS.exemptCeiling) ceilingMonth = i;
    rows.push({ key: FORECAST_MONTHS[i], f: f(i + 1), grow, income, gross: grossAt[i], vat: grossAt[i] - income, cogs: cogsAt[i], fixed, tax, profit, draw, keep, cash });
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
    key, rows, st, r0, ramp, reachIdx: ramp != null && ramp <= 12 ? ramp - 1 : -1, plan, startCash, cushion, goalIdx, minRow, fillIdx, yearProfit, annualGoal, quarters,
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
    ['פחות הוצאות קבועות', fmt(-st.fixedBase)],
    st.fixedGrow > 0 && [`פחות העלייה בפרסום ובכלים כשהעסק גדל (${paceOf(s, fc.key).cost}%)`, fmt(-st.fixedGrow)],
    [`פחות מס וביטוח לאומי (${taxPctOf(s)}% מהרווח)`, fmt(-st.tax)],
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
  const needPerHour = avail > 0 ? ((goal + st.setAside) / (1 - t) + st.fixed) / avail : Infinity;
  const timeTone = st.hours > avail ? 'bad' : st.hours > avail * 0.9 ? 'warn' : 'ok';
  out.push({
    id: 'time',
    q: 'כמה זמן נדרש?',
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
      sub: fc.ramp != null && fc.ramp <= 12 ? `בתסריט ${SCEN_NAME[fc.key]} מגיעים לזה תוך ${fc.ramp} חודשים` : `בתסריט ${SCEN_NAME[fc.key]} זה לוקח יותר משנה`,
      how: [
        ['פניות שמגיעות אליך בחודש', num(st.leads)],
        [`${s.assumptions.leadToCall}% מהן קובעות שיחה`, `${num(st.calls, 1)} שיחות`],
        [`${s.assumptions.closeRate}% מהשיחות קונות`, `${num(st.newClients, 1)} לקוחות`, true],
      ],
      rule: 'בלי לקוחות עדיין זו בדיקה למידע בלבד, היא לא משנה את השורה התחתונה. מחלק 4: כמה פניות צריך כדי שזה יקרה.',
    });
  } else {
    const ratio = st.newClients / today.clients;
    const inYear = fc.ramp != null && fc.ramp <= 12;
    const tone = inYear ? 'ok' : 'warn';
    out.push({
      id: 'pace',
      q: 'הקצב סביר?',
      tone,
      a: ratio <= 1 ? 'כן, כמו היום' : `פי ${num(ratio, 1)} ממה שיש היום`,
      sub: ratio <= 1 ? `היום ${clientsText(today.clients)} בחודש, וצריך ${num(st.newClients, 1)}` : `בתסריט ${SCEN_NAME[fc.key]}: ${inYear ? `תוך ${fc.ramp} חודשים` : 'יותר משנה'}`,
      ratio,
      how: [
        [`לקוחות חדשים בחודש היום (ממוצע ${today.n} חודשים)`, num(today.clients, 1)],
        ['צריך בחודש מלא', num(st.newClients, 1)],
        ['פי כמה', `פי ${num(Math.max(1, ratio), 1)}`],
        [`בתסריט ${SCEN_NAME[fc.key]}`, fc.ramp != null ? `${fc.ramp} חודשים` : 'יותר מ-5 שנים', true],
      ],
      rule: `ירוק: בתסריט ${SCEN_NAME[fc.key]} (קצב שמאט, עם חודשים חלשים) מגיעים לחודש מלא בתוך השנה. כתום: זה לוקח יותר משנה.`,
      key: fc.key,
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
  return `גם בתסריט ${SCEN_NAME[c.key || 'real']}, מגיעים לחודש מלא רק אחרי יותר משנה.`;
}
export const scoreOf = (list) => list.reduce((x, c) => x + TONE_SCORE[c.tone], 0);

// ---------- everything at once ----------

// key = the scenario (realistic by default: the summary and everything outside part 5 use it).
export function model(s, key = 'real') {
  const mix = mixOf(s);
  const fc = forecast(s, mix, key);
  const list = checks(s, mix, fc);
  return { mix, fc, st: fc.st, checks: list, verdict: verdict(list), score: scoreOf(list) };
}

// ---------- the fixes, ranked by what they change ----------
// Each fix returns a new state. The mix is frozen first, so the user sees exactly
// what the one change does (more hours re-runs the shark's mix, since that is its point).

const freeze = (s) => ({ ...s, mix: mixOf(s), applied: s.applied });

// A fix as data (d): what it changes. applyFix makes the new state; withPicks starts from the
// state before any fix (fixBase: only the fields fixes change) and adds the picked ones, so the
// user can pick a few, and take any one back. More hours goes first: it re-runs the mix.
export function applyFix(x, d) {
  const mixed = (fn) => { const m = { ...mixOf(x) }; fn(m); return { ...x, mix: m }; };
  switch (d.id) {
    case 'price': return { ...freeze(x), products: x.products.map((p) => (p.id === d.pid ? { ...p, price: d.to } : p)) };
    case 'shift': return mixed((m) => { m[d.from] = Math.max(0, (m[d.from] || 0) - 1); m[d.to] = (m[d.to] || 0) + 1; });
    case 'monthly': return mixed((m) => { m[d.pid] = (m[d.pid] || 0) + 1; });
    case 'hours': return { ...x, mix: null, assumptions: { ...x.assumptions, hoursMonth: (x.assumptions.hoursMonth || 0) + d.add } };
    case 'goal': return { ...freeze(x), goal: d.to };
    case 'cash-in': return { ...freeze(x), bank: { ...x.bank, amount: (x.bank.amount || 0) + d.amt } };
    case 'cut': return { ...freeze(x), expenses: x.expenses.filter((e) => e.id !== d.xid) };
    default: return x;
  }
}
export const fixBaseOf = (s) => JSON.parse(JSON.stringify({ products: s.products, mix: s.mix, hoursMonth: s.assumptions.hoursMonth, goal: s.goal, bank: s.bank, expenses: s.expenses }));
export function withPicks(s, base, picks) {
  let x = { ...s, products: base.products, mix: base.mix, assumptions: { ...s.assumptions, hoursMonth: base.hoursMonth }, goal: base.goal, bank: base.bank, expenses: base.expenses };
  for (const d of [...picks].sort((a, b) => (b.id === 'hours') - (a.id === 'hours'))) x = applyFix(x, d);
  return x;
}

export function fixes(s, key = 'real') {
  const now = model(s, key);
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
      d: { id: 'price', pid: top.id, to },
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
      d: { id: 'shift', from: worst.id, to: best.id },
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
      d: { id: 'monthly', pid: monthly.id },
    });
  }

  // More hours for client work.
  if (byId.time.tone !== 'ok' || byId.goal.tone === 'bad') {
    c.push({
      id: 'hours',
      icon: 'clock',
      title: 'עוד 4 שעות בשבוע לעבודה עם לקוחות',
      sub: `${num(s.assumptions.hoursMonth)} שעות בחודש יהיו ${num(s.assumptions.hoursMonth + 16)}. הכריש מחשב מחדש את התמהיל`,
      d: { id: 'hours', add: 16 },
    });
  }


  // Another goal for the first year: what this mix really leaves.
  if (byId.goal.tone === 'bad') {
    const to = Math.max(1000, Math.floor((now.st.profit - now.st.setAside) / 500) * 500);
    if (to < (s.goal || 0)) c.push({ id: 'goal', icon: 'target', title: `יעד של ${fmt(to)} בחודש לשנה הראשונה`, sub: `במקום ${fmt(s.goal)}. אפשר להעלות אותו כשהמספרים יגדלו`, d: { id: 'goal', to } });
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
      d: { id: 'cash-in', amt },
      boost: amt <= 3000 ? 60000 : 0,
    });
  } else if (low && byId.cash.tone === 'warn' && now.fc.cushion > low.cash) {
    // Below the cushion on the way (stage 3): the gap up front keeps the cushion whole.
    // The smallest round sum that keeps the cushion (money in also changes what goes to it).
    const withIn = (x, n) => ({ ...freeze(x), bank: { ...x.bank, amount: (x.bank.amount || 0) + n } });
    let amt = Math.ceil((now.fc.cushion - low.cash) / 500) * 500;
    for (let k = 0; k < 20 && model(withIn(s, amt), key).checks.find((x) => x.id === 'cash').tone !== 'ok'; k++) amt += 500;
    c.push({
      id: 'cash-in',
      icon: 'piggy-bank',
      title: `להכניס לעסק ${fmt(amt)} מראש`,
      sub: `ב${monthName(low.key)} נשארים בעסק ${fmt(low.cash)}, מתחת לכרית של ${fmt(now.fc.cushion)}. סכום קטן עכשיו שומר על הכרית כל השנה`,
      d: { id: 'cash-in', amt },
      boost: amt <= 3000 ? 60000 : 0,
    });
  }

  // Drop what can wait. Never marketing that brings the leads, never what the law needs:
  // only expenses the shark marks "אפשר לחכות" (or the user's own small tools).
  const cut = [...s.expenses]
    .filter((x) => !x.flowbiz && x.category !== 'marketing' && x.category !== 'gov' && needOf(x.name) === 3)
    .sort((a, b) => monthlyCost(b) - monthlyCost(a))[0];
  if (cut && monthlyCost(cut) >= 100) {
    c.push({ id: 'cut', icon: 'scissors', title: `לוותר בינתיים על ${cut.name}`, sub: `חוסך ${fmt(monthlyCost(cut))} בחודש. אפשר להחזיר כשההכנסה מגיעה`, d: { id: 'cut', xid: cut.id } });
  }

  return c
    .map((fx) => ({ ...fx, d: { ...fx.d, title: fx.title, basket: !!fx.basket }, make: (x) => applyFix(x, fx.d) }))
    .map((fx) => {
      const after = model(fx.make(s), key);
      const gap = (m) => Math.max(0, (s.goal || 0) - m.st.profit);
      // A lower goal is the last resort: it ranks after the fixes that change the business.
      const impact = (after.score - now.score) * 10000 + (gap(now) - gap(after)) + (after.verdict.tone !== now.verdict.tone ? 50000 : 0) - (fx.id === 'goal' ? 45000 : 0) + (after.score > now.score ? fx.boost || 0 : 0);
      return { ...fx, before: now, after, impact };
    })
    .filter((fx) => fx.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
}
