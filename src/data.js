// Mock data for task 6, step 5 "העסק במספרים". In production:
//   products, prices, costs, hours  -> "סל מוצרים" (3); edits here write back to the basket
//   the monthly goal, hours a month  -> "אני והעסק" (2)
//   expenses, setup items, money     -> the finance center's tables (one data source)
//   payment terms                    -> asked here, prefilled in "בניית הצעה מנצחת" (8)
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

export const TERMS = [
  { id: 'one', label: 'תשלום אחד', n: 1 },
  { id: 'two', label: '2 תשלומים', n: 2 },
  { id: 'three', label: '3 תשלומים', n: 3 },
  { id: 'monthly', label: 'מנוי חודשי', n: 0 },
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
  { name: 'Canva ואחסון אתר', amount: 110, category: 'tools', freq: 'monthly', day: 1 },
  { name: 'הנהלת חשבונות', amount: 350, category: 'pro', freq: 'monthly', day: 10 },
  { name: 'ביטוח אחריות מקצועית', amount: 1320, category: 'insurance', freq: 'yearly', day: 12 },
  { name: 'פרסום ממומן בפייסבוק', amount: 200, category: 'marketing', freq: 'weekly', day: 0 },
  { name: 'ChatGPT Plus', amount: 75, category: 'tools', freq: 'monthly', day: 15 },
];

// The basket (סל מוצרים, v5 consultant pack). Prices include VAT.
//   kind: one = a single sale, program = several months (hours spread over them),
//         monthly = a subscription (active clients stack month after month)
//   cost: what one sale costs the business (not the user's time); null = not filled yet
export const BASKET = [
  { id: 'e1', name: 'שיחת היכרות (30 דקות)', short: 'שיחת היכרות', price: 0, cost: 0, hours: 0.5, kind: 'one', terms: 'one', free: true, role: 'entry' },
  { id: 'e2', name: 'מדריך: 7 טעויות בשיווק עסק קטן', short: 'מדריך חינמי', price: 0, cost: 0, hours: 0, kind: 'one', terms: 'one', free: true, role: 'entry' },
  { id: 'b1', name: 'סדנת אסטרטגיה אישית (3 שעות)', short: 'סדנה אישית', price: 890, cost: null, hours: 4, kind: 'one', terms: 'one', role: 'bridge' },
  { id: 'p1', name: 'תוכנית ליווי 90 יום 1:1', short: 'ליווי 90 יום', price: 7500, cost: 450, hours: 20, months: 3, kind: 'program', terms: 'three', role: 'core' },
  { id: 'p2', name: 'יום VIP אסטרטגי', short: 'יום VIP', price: 3900, cost: 250, hours: 8, kind: 'one', terms: 'one', role: 'premium' },
  { id: 'r1', name: 'ריטיינר ליווי חודשי', short: 'ריטיינר חודשי', price: 2200, cost: 0, hours: 5, kind: 'monthly', terms: 'monthly', role: 'recurring' },
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

const SETUP_ITEMS = [
  { id: 's1', name: 'לוגו ומיתוג', icon: 'palette', planned: 1200, paid: 'all', paidAmount: 1200 },
  { id: 's2', name: 'אתר ודף נחיתה', icon: 'monitor', planned: 2500, paid: 'part', paidAmount: 1800 },
  { id: 's3', name: 'מצלמה ותאורה לזום', icon: 'camera', planned: 900, paid: 'none', paidAmount: 0 },
  { id: 's4', name: 'פתיחת תיק ועורך דין לחוזה', icon: 'scale', planned: 800, paid: 'all', paidAmount: 800 },
  { id: 's5', name: 'קמפיין השקה', icon: 'megaphone', planned: 1500, paid: 'none', paidAmount: 0 },
];

const exp = (name, amount, category, freq, day, start = 'now') => ({ id: nextId('x'), name, amount, category, freq, day, start });

// The last 6 months (stages 2 and 3), oldest first.
const HISTORY_FIRST = [
  { key: '2026-05', income: 0, clients: 0 },
  { key: '2026-06', income: 890, clients: 1 },
  { key: '2026-07', income: 3900, clients: 1 },
  { key: '2026-08', income: 890, clients: 1 },
  { key: '2026-09', income: 2500, clients: 1 },
  { key: '2026-10', income: 6290, clients: 2 },
];
const HISTORY_ACTIVE = [
  { key: '2026-05', income: 9800, clients: 2 },
  { key: '2026-06', income: 11300, clients: 3 },
  { key: '2026-07', income: 10400, clients: 2 },
  { key: '2026-08', income: 12600, clients: 3 },
  { key: '2026-09', income: 11900, clients: 3 },
  { key: '2026-10', income: 13100, clients: 3 },
];

function base(extra) {
  return {
    stage: null,
    bank: { has: null, amount: null },
    setupBudget: null,
    setup: [],
    expenses: [],
    history: { mode: null, months: [] },
    toCome: { now: null, next: null, later: null },
    setupDone: null,
    setupLeft: null,
    regular: { amount: null, day: 1 },
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

// Each scenario is a user arriving at step 5 with what the earlier steps and the
// finance tables already know. The stage answer itself is not filled: the step asks it.
export const SCENARIOS = [
  {
    id: 'setup',
    label: 'שלב 1 · עוד אין לקוחות',
    sub: '20 שעות בשבוע, המודל עובד',
    stage: 'setup',
    make: () =>
      base({
        bank: { has: true, amount: 10000 },
        setupBudget: 7000,
        setup: clone(SETUP_ITEMS),
        expenses: [exp('Zoom', 60, 'tools', 'monthly', 1), exp('Canva ואחסון אתר', 110, 'tools', 'monthly', 1), exp('הנהלת חשבונות', 350, 'pro', 'monthly', 10), exp('פרסום ממומן בפייסבוק', 200, 'marketing', 'weekly', 0, '2027-01')],
      }),
  },
  {
    id: 'first',
    label: 'שלב 2 · לקוחות ראשונים',
    sub: 'רק 8 שעות בשבוע, אין לזה זמן',
    stage: 'first',
    make: () =>
      base({
        bank: { has: false, amount: 6400 },
        expenses: [exp('Zoom', 60, 'tools', 'monthly', 1), exp('Canva ואחסון אתר', 110, 'tools', 'monthly', 1), exp('הנהלת חשבונות', 350, 'pro', 'monthly', 10), exp('פרסום ממומן בפייסבוק', 200, 'marketing', 'weekly', 0)],
        history: { mode: null, months: HISTORY_FIRST.map((m) => ({ ...m, income: null, clients: null })) },
        toCome: { now: 2500, next: 2500, later: 0 },
        setupDone: false,
        setupLeft: 900,
        assumptions: { ...clone(DEFAULT_ASSUMPTIONS), hoursMonth: 32 },
      }),
  },
  {
    id: 'active',
    label: 'שלב 3 · עסק פעיל',
    sub: 'עוסק מורשה, צריך לגדול פי 1.8',
    stage: 'active',
    make: () =>
      base({
        bank: { has: true, amount: 1800 },
        expenses: [exp('Zoom', 60, 'tools', 'monthly', 1), exp('Canva ואחסון אתר', 110, 'tools', 'monthly', 1), exp('הנהלת חשבונות', 450, 'pro', 'monthly', 10), exp('פרסום ממומן בפייסבוק', 200, 'marketing', 'weekly', 0), exp('ביטוח אחריות מקצועית', 1320, 'insurance', 'yearly', 12)],
        history: { mode: 'manual', months: clone(HISTORY_ACTIVE) },
        toCome: { now: 4400, next: 4900, later: 2500 },
        setupDone: true,
        setupLeft: 0,
        regular: { amount: 4400, day: 1 },
        entity: 'licensed',
        taxPct: SETTINGS.taxPct.licensed,
        assumptions: { ...clone(DEFAULT_ASSUMPTIONS), hoursMonth: 100 },
      }),
  },
  {
    id: 'skipped',
    label: 'דילג על השלבים 2 ו-3',
    sub: 'בלי מוצרים בסל ובלי יעד',
    stage: 'setup',
    make: () =>
      base({
        bank: { has: null, amount: null },
        products: [],
        goal: null,
        assumptions: { ...clone(DEFAULT_ASSUMPTIONS), hoursMonth: null },
      }),
  },
];
export const DEFAULT_SCENARIO = 'setup';

// A P&L export the user uploads in stage 2 (demo numbers only, never a real file).
export const DEMO_REPORT = {
  file: 'רווח והפסד 2026.xlsx',
  months: HISTORY_FIRST,
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
