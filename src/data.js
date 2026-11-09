// Mock data for task 6, step 5 "העסק במספרים". In production:
//   products, prices, costs, hours  -> "סל מוצרים" (3); edits here write back to the basket
//   the monthly goal, hours a month  -> "אני והעסק" (2)
//   expenses, setup items, money     -> the finance center's tables (one data source)
//   when the money arrives           -> asked here (a program: all at the start, or each month)
// The first entry is empty: only what earlier steps collected (the basket, the goal, the
// hours) is filled. Each scenario's `demo` fills part 1 for direct links and dev jumps.
// The mockup's "today" is fixed so every date on the page stays the same.

export const PARTNER = { name: 'הכריש', role: 'השותף העסקי' };

export const STEP = { n: 5, name: 'העסק במספרים', chapterNo: 2, chapter: 'שביל הכסף', icon: 'calculator' };
export const PARTS = ['המצב היום', 'המחירים', 'היעד', 'כמה למכור', 'התחזית'];
export const STEP_SCREENS = ['today', 'prices', 'goal', 'sell', 'forecast'];

export const TODAY = '2026-11-09';
// The forecast runs 12 months from next month.
export const FIRST_MONTH = '2026-12';

const PROFILES = {
  m: { gender: 'm', firstName: 'דניאל', fullName: 'דניאל כהן' },
  f: { gender: 'f', firstName: 'דניאלה', fullName: 'דניאלה כהן' },
};
const GENDER_KEY = 'flowbiz-num-gender';
function pickGender() {
  try {
    const q = new URLSearchParams(location.search).get('user');
    if (q === 'f' || q === 'm') {
      localStorage.setItem(GENDER_KEY, q);
      return q;
    }
    return localStorage.getItem(GENDER_KEY) === 'f' ? 'f' : 'm';
  } catch {
    return 'm';
  }
}
export const GENDER = pickGender();
// The masculine or feminine form, by how the user asked to be addressed.
export const g = (m, f) => (GENDER === 'f' ? f : m);
export function setDemoGender(v) {
  try {
    localStorage.setItem(GENDER_KEY, v);
  } catch {}
  const u = new URL(location.href);
  u.searchParams.set('user', v);
  location.href = u.toString();
}

export const USER = { ...PROFILES[GENDER], business: 'שיווק שעובד', kind: g('יועץ שיווק', 'יועצת שיווק') };

// The question the finance center used to ask on its first entry. It now opens the step.
export const STAGES = [
  { id: 'setup', n: 1, label: 'אין עדיין לקוחות משלמים', sub: 'בונים את העסק, ההכנסה הראשונה עוד לפנינו', icon: 'hammer', board: 'הקמה' },
  { id: 'first', n: 2, label: 'יש לקוחות משלמים, עוד לא כל חודש', sub: 'כבר מכרת, אבל ההכנסה עוד לא קבועה', icon: 'sprout', board: 'לקוחות ראשונים' },
  { id: 'active', n: 3, label: 'יש הכנסה כל חודש', sub: 'יש לקוחות קבועים, ורוצים לגדול', icon: 'trending-up', board: 'עסק פעיל' },
];
export const stageOf = (id) => STAGES.find((s) => s.id === id);

// FlowBiz settings (one place in the admin, updated each year; never in the code).
export const SETTINGS = {
  vatPct: 18,
  exemptCeiling: 120000,
  taxPct: { exempt: 15, licensed: 25 },
};

export const ENTITIES = [
  { id: 'exempt', label: 'עוסק פטור' },
  { id: 'licensed', label: 'עוסק מורשה' },
];

// When the money of a program reaches the business. Card installments are between the
// client and the card company; what counts here is when the money reaches the business.
export const PAY = [
  { id: 'start', label: 'הכל בהתחלה' },
  { id: 'monthly', label: 'כל חודש, לאורך התוכנית' },
];

export const CATEGORIES = {
  marketing: { label: 'שיווק', icon: 'megaphone' },
  tools: { label: 'כלים ותוכנות', icon: 'monitor' },
  pro: { label: 'אנשי מקצוע', icon: 'briefcase' },
  insurance: { label: 'ביטוח', icon: 'shield-check' },
  other: { label: 'אחר', icon: 'circle-dot' },
};

export const FREQS = [
  { id: 'monthly', label: 'כל חודש' },
  { id: 'weekly', label: 'כל שבוע' },
  { id: 'yearly', label: 'פעם בשנה' },
];

// The shark's expense suggestions for a marketing consultant (the model writes these
// in production, from the business type). Never tools FlowBiz already gives
// (Morning, Calendly, Smoove and the like).
export const SHARK_EXPENSES = [
  { name: 'Zoom', amount: 60, category: 'tools', freq: 'monthly', day: 1 },
  { name: 'Canva', amount: 55, category: 'tools', freq: 'monthly', day: 1 },
  { name: 'הנהלת חשבונות', amount: 350, category: 'pro', freq: 'monthly', day: 10 },
  { name: 'ביטוח אחריות מקצועית', amount: 1320, category: 'insurance', freq: 'yearly', day: 12 },
  { name: 'פרסום ממומן בפייסבוק', amount: 200, category: 'marketing', freq: 'weekly', day: 0 },
  { name: 'ChatGPT Plus', amount: 75, category: 'tools', freq: 'monthly', day: 15 },
];

// What FlowBiz gives, with what it would cost outside (draft values for Amit). They sit in
// the tables as "חסכת עם FlowBiz" and never count in the calculations.
export const FLOWBIZ_SETUP = [
  { id: 'fb-logo', name: 'שם ולוגו', icon: 'palette', value: 2500, step: 6 },
  { id: 'fb-msg', name: 'דף המסרים (קופירייטינג)', icon: 'pen-line', value: 1800, step: 7 },
  { id: 'fb-lp', name: 'דף נחיתה', icon: 'layout-template', value: 3500, step: 9 },
];
// What the FlowBiz subscription replaces each month (draft values for Amit).
export const FLOWBIZ_TOOLS = [
  { id: 'fb-lp-host', name: 'דף נחיתה ואחסון', icon: 'layout-template', value: 120 },
  { id: 'fb-content', name: 'יצירת תוכן לרשתות', icon: 'sparkles', value: 300 },
  { id: 'fb-bot', name: 'בוט וואטסאפ לשירות לקוחות', icon: 'message-circle', value: 250 },
  { id: 'fb-crm', name: 'ניהול לידים ולקוחות', icon: 'users', value: 150 },
  { id: 'fb-cal', name: 'יומן וזימון פגישות', icon: 'calendar-days', value: 50 },
];
// The FlowBiz subscription is a real fixed expense: it is in the list from the first
// entry, counts in every calculation, and can't be removed or cut by a fix.
export const FLOWBIZ_PRICE = 350;
export const flowbizExpense = () => ({ id: 'x-flowbiz', name: 'FlowBiz', amount: FLOWBIZ_PRICE, category: 'flowbiz', freq: 'monthly', day: 1, start: 'now', flowbiz: true });

// The shark's one-time setup suggestions for a marketing consultant (the model writes
// these in production, from the business type). Never what FlowBiz already gives.
export const SHARK_SETUP = [
  { name: 'מצלמה ותאורה לזום', icon: 'camera', planned: 900 },
  { name: 'פתיחת תיק ורואה חשבון', icon: 'file-text', planned: 800 },
  { name: 'עורך דין לחוזה לקוח', icon: 'scale', planned: 1200 },
  { name: 'קמפיין השקה', icon: 'megaphone', planned: 1500 },
  { name: 'צילומי תדמית', icon: 'image', planned: 1200 },
  { name: 'מחשב נייד', icon: 'laptop', planned: 4500 },
];

// The basket (סל מוצרים, v5 consultant pack). Prices include VAT.
//   pay (a program only): start = all at the start, monthly = price / months each month
//   kind: one = a single sale, program = several months (hours spread over them),
//         monthly = a subscription (active clients stack month after month)
//   cost: what one sale costs the business (not the user's time); null = not filled yet
export const BASKET = [
  { id: 'e1', name: 'שיחת היכרות (30 דקות)', short: 'שיחת היכרות', price: 0, cost: 0, hours: 0.5, kind: 'one', free: true, role: 'entry' },
  { id: 'e2', name: 'מדריך: 7 טעויות בשיווק עסק קטן', short: 'מדריך חינמי', price: 0, cost: 0, hours: 0, kind: 'one', free: true, role: 'entry' },
  { id: 'b1', name: 'סדנת אסטרטגיה אישית (3 שעות)', short: 'סדנה אישית', price: 890, cost: null, hours: 4, kind: 'one', role: 'bridge' },
  { id: 'p1', name: 'תוכנית ליווי 90 יום 1:1', short: 'ליווי 90 יום', price: 7500, cost: 450, hours: 20, months: 3, kind: 'program', pay: 'monthly', role: 'core' },
  { id: 'p2', name: 'יום VIP אסטרטגי', short: 'יום VIP', price: 3900, cost: 250, hours: 8, kind: 'one', role: 'premium' },
  { id: 'r1', name: 'ריטיינר ליווי חודשי', short: 'ריטיינר חודשי', price: 2200, cost: 0, hours: 5, kind: 'monthly', role: 'recurring' },
];

// From "אני והעסק" (step 2).
export const FROM_STEP2 = { goal: 12000, hoursWeek: 20 };

// Our assumptions, all in one place and all editable in the step.
export const DEFAULT_ASSUMPTIONS = {
  leadToCall: 40, // % of leads that book a call
  closeRate: 25, // % of calls that buy
  hoursMonth: 80, // hours a month for client work (from step 2: hours a week x 4)
  stayMonths: 6, // a monthly client stays this long on average
};

const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 100;
export const nextId = (p = 'x') => `${p}${++seq}`;

// A setup item, as in the finance center: planned, paid so far, and "paid in full".
const item = (id, name, icon, planned, spent, done = false) => ({ id, name, icon, planned, spent, done });
const SETUP_ITEMS = [
  item('s1', 'מצלמה ותאורה לזום', 'camera', 900, 900, true),
  item('s2', 'פתיחת תיק ורואה חשבון', 'file-text', 800, 800, true),
  item('s3', 'עורך דין לחוזה לקוח', 'scale', 1200, 0),
  item('s4', 'קמפיין השקה', 'megaphone', 1500, 600),
];

const exp = (name, amount, category, freq, day, start = 'now') => ({ id: nextId('x'), name, amount, category, freq, day, start });

// Income and expenses up to today (stages 2 and 3): one total each, from the month the
// business started. `from` is a month key; the totals count up to the end of last month.
export const EMPTY_HISTORY = { mode: null, from: null, income: null, out: null, clients: null };
export const HISTORY_FIRST = { mode: 'manual', from: '2026-05', income: 14470, out: 9800, clients: 6 };
const HISTORY_ACTIVE = { mode: 'manual', from: '2026-01', income: 115000, out: 21500, clients: 27 };

function base(extra) {
  return {
    stage: null,
    bank: { has: null, amount: null },
    setupBudget: null,
    setup: [],
    expenses: [flowbizExpense()],
    history: clone(EMPTY_HISTORY),
    toCome: { now: null, next: null, later: null },
    setupDone: null,
    regular: { amount: null, day: 1 },
    seen: [], // part 1 sections the user already went through (the guided list)
    cushion: null, // amount; null = the default, 2 months of expenses
    cushionMonths: 6, // stage 3: fill the cushion within this many months
    products: clone(BASKET),
    goal: FROM_STEP2.goal,
    goalConfirmed: false,
    entity: 'exempt',
    taxPct: SETTINGS.taxPct.exempt,
    annualGoal: null, // stage 3; null = 12 x the monthly goal
    mix: null, // null = the shark's suggestion
    assumptions: clone(DEFAULT_ASSUMPTIONS),
    ramp: 6,
    applied: [],
    done: false,
    doneOn: null,
    ...extra,
  };
}

// Each scenario is a user arriving at step 5 with what the earlier steps know: the basket,
// the goal and the hours. Part 1 starts empty. `demo` fills part 1 (for a direct link or a
// dev jump past it), so every later screen opens with numbers.
const expenses = (acct = 350) => [flowbizExpense(), exp('Zoom', 60, 'tools', 'monthly', 1), exp('Canva', 55, 'tools', 'monthly', 1), exp('הנהלת חשבונות', acct, 'pro', 'monthly', 10)];
export const SCENARIOS = [
  {
    id: 'setup',
    label: 'שלב 1 · עוד אין לקוחות',
    sub: '20 שעות בשבוע, המודל עובד',
    stage: 'setup',
    make: () => base(),
    demo: (s) => {
      s.bank = { has: true, amount: 10000 };
      s.setupBudget = 5000;
      s.setup = clone(SETUP_ITEMS);
      s.expenses = [...expenses(), exp('פרסום ממומן בפייסבוק', 200, 'marketing', 'weekly', 0, '2027-01')];
    },
  },
  {
    id: 'first',
    label: 'שלב 2 · לקוחות ראשונים',
    sub: 'רק 8 שעות בשבוע, אין לזה זמן',
    stage: 'first',
    make: () => base({ assumptions: { ...clone(DEFAULT_ASSUMPTIONS), hoursMonth: 32 } }),
    demo: (s) => {
      s.bank = { has: false, amount: 6400 };
      s.expenses = [...expenses(), exp('פרסום ממומן בפייסבוק', 200, 'marketing', 'weekly', 0)];
      s.history = clone(HISTORY_FIRST);
      s.toCome = { now: 2500, next: 2500, later: 0 };
      s.setupDone = false;
      s.setup = [item('s1', 'מצלמה ותאורה לזום', 'camera', 900, 0)];
    },
  },
  {
    id: 'active',
    label: 'שלב 3 · עסק פעיל',
    sub: 'עוסק מורשה, צריך לגדול פי 1.8',
    stage: 'active',
    make: () => base({ assumptions: { ...clone(DEFAULT_ASSUMPTIONS), hoursMonth: 100 } }),
    demo: (s) => {
      s.bank = { has: true, amount: 1800 };
      s.expenses = [...expenses(450), exp('פרסום ממומן בפייסבוק', 200, 'marketing', 'weekly', 0), exp('ביטוח אחריות מקצועית', 1320, 'insurance', 'yearly', 12)];
      s.history = clone(HISTORY_ACTIVE);
      s.toCome = { now: 4400, next: 4900, later: 2500 };
      s.setupDone = true;
      s.regular = { amount: 4400, day: 1 };
      s.entity = 'licensed';
      s.taxPct = SETTINGS.taxPct.licensed;
    },
  },
  {
    id: 'skipped',
    label: 'דילג על השלבים 2 ו-3',
    sub: 'בלי מוצרים בסל ובלי יעד',
    stage: 'setup',
    make: () => base({ products: [], goal: null, assumptions: { ...clone(DEFAULT_ASSUMPTIONS), hoursMonth: null } }),
    demo: (s) => {
      s.bank = { has: true, amount: 8000 };
      s.setupBudget = 0;
    },
  },
];
export const DEFAULT_SCENARIO = 'setup';

// A P&L export the user uploads in stage 2 (demo numbers only, never a real file).
export const DEMO_REPORT = {
  file: 'רווח והפסד 2026.xlsx',
  history: { ...HISTORY_FIRST, mode: 'file' },
  expenseLines: [
    { name: 'Zoom', amount: 60 },
    { name: 'Canva ואחסון', amount: 110 },
    { name: 'רו"ח', amount: 350 },
    { name: 'פייסבוק', amount: 870 },
  ],
};

// The finance center mockup (task 2), opened on the matching board.
export const FINANCE_URL = 'https://amitbens97-zacks.github.io/finance-center-mockup/';
export const FINANCE_SCENARIO = { setup: 'setup', first: 'first', active: 'regular' };
