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

// When the money of a sale reaches the business, for every product. The default follows
// the kind: a single sale at once, a program and a subscription each month.
export const PAY = [
  { id: 'start', label: 'הכל בהתחלה' },
  { id: 'monthly', label: 'כל חודש' },
];
// A single sale is always paid at once (Amit, 10.11): only programs and subscriptions choose.
export const payOf = (p) => (p.kind === 'one' ? 'start' : p.pay ?? 'monthly');

export const CATEGORIES = {
  marketing: { label: 'שיווק', icon: 'megaphone' },
  tools: { label: 'כלים ותוכנות', icon: 'monitor' },
  pro: { label: 'אנשי מקצוע', icon: 'briefcase' },
  insurance: { label: 'ביטוח', icon: 'shield-check' },
  gov: { label: 'מסים ואגרות', icon: 'landmark' },
  other: { label: 'אחר', icon: 'circle-dot' },
};

export const FREQS = [
  { id: 'monthly', label: 'כל חודש' },
  { id: 'weekly', label: 'כל שבוע' },
  { id: 'yearly', label: 'פעם בשנה' },
];

// The shark's suggestions for a marketing consultant. In production the model writes them
// from the business type, the stage and the entity, with market prices it checks, and
// "עוד הצעות" asks it for more, every time, with no limit. Prices include VAT unless they
// say "+ מע"מ"; checked November 2026. The fitting suggestions show; `extra` ones come 4 at
// a time with each "עוד הצעות" (the mockup's stand-in for the model writing more).
// What FlowBiz offers is a suggestion like the rest, in the same look: never a sales pitch.
//   stages: where it fits (default: all); amount and note may depend on the entity;
//   fb: the FlowBiz way to get the same thing, behind a small "לחסוך עם FlowBiz" button;
//   shown: the price as written on the card, when it is "+ מע"מ".
const withVat = (n) => Math.round(n * (1 + SETTINGS.vatPct / 100));
const plusVat = (n, per = '') => `${n.toLocaleString('he-IL')} ₪ + מע"מ${per}`;
export const FLOWBIZ_PRICE = 350; // + VAT, a month
export const FLOWBIZ_ACCOUNTANT = 150; // + VAT, a month, only with the system: 500 + VAT together
export const FLOWBIZ_FILE_OPENING = 249; // + VAT, once
const FLOWBIZ_NOTE = 'המנוי שלך. כולל דף נחיתה, תוכן לרשתות, בוט וואטסאפ, ניהול לידים ויומן';
const BUNDLE_NOTE = `המנוי והנהלת החשבונות: רואה חשבון ב-${FLOWBIZ_ACCOUNTANT} ₪ + מע"מ בחודש, בתוך החבילה`;
const BUNDLE = { name: 'FlowBiz עם רואה חשבון', category: 'flowbiz', freq: 'monthly', day: 1, amount: withVat(FLOWBIZ_PRICE + FLOWBIZ_ACCOUNTANT), shown: plusVat(FLOWBIZ_PRICE + FLOWBIZ_ACCOUNTANT, ' בחודש'), flowbiz: 'bundle', note: BUNDLE_NOTE };
export const SHARK_EXPENSES = [
  { name: 'FlowBiz', category: 'flowbiz', freq: 'monthly', day: 1, amount: withVat(FLOWBIZ_PRICE), shown: plusVat(FLOWBIZ_PRICE, ' בחודש'), flowbiz: 'system', note: FLOWBIZ_NOTE },
  { name: 'הנהלת חשבונות', category: 'pro', freq: 'monthly', day: 10, amount: { exempt: 250, licensed: 550 },
    note: { exempt: 'ליווי שוטף לעוסק פטור, בלי הדוח השנתי', licensed: 'עוסק מורשה: כולל דיווחי מע"מ ומקדמות' },
    fb: { ...BUNDLE, pitch: `רואה חשבון ב-${FLOWBIZ_ACCOUNTANT} ₪ + מע"מ בחודש, בחבילה עם המערכת: ${FLOWBIZ_PRICE + FLOWBIZ_ACCOUNTANT} ₪ + מע"מ בחודש ביחד.`, market: { exempt: 'במחיר שוק: כ-250 ₪ בחודש, בלי המערכת', licensed: 'במחיר שוק: כ-550 ₪ בחודש, בלי המערכת' } } },
  BUNDLE,
  { name: 'ביטוח לאומי (מינימום)', category: 'gov', freq: 'monthly', day: 15, amount: 265, note: 'המינימום לעצמאי ב-2026, גם בחודש בלי הכנסה' },
  { name: 'דוח שנתי לרואה חשבון', category: 'pro', freq: 'yearly', day: 1, amount: 1500, note: 'בדרך כלל 1,100-2,000 ₪' },
  { name: 'Zoom Pro', category: 'tools', freq: 'monthly', day: 1, amount: 57, note: 'רישיון אחד, תשלום חודשי' },
  { name: 'פרסום ממומן (פייסבוק ואינסטגרם)', category: 'marketing', freq: 'weekly', day: 0, amount: 150, stages: ['first', 'active'], note: 'תקציב בדיקה: כ-650 ₪ בחודש' },
  { name: 'פרסום ממומן (פייסבוק ואינסטגרם)', category: 'marketing', freq: 'weekly', day: 0, amount: 150, stages: ['setup'], start: 'next', note: 'מהחודש הבא, תקציב בדיקה: כ-650 ₪ בחודש' },
  { name: 'ביטוח אחריות מקצועית', category: 'insurance', freq: 'yearly', day: 12, amount: 1500, note: 'הערכה ליועץ. תלוי בגבול הכיסוי' },
  { name: 'Google Workspace', category: 'tools', freq: 'monthly', day: 1, amount: 35, note: 'מייל עסקי על הדומיין, משתמש אחד' },
  { name: 'ChatGPT Plus', category: 'tools', freq: 'monthly', day: 15, amount: 70, note: 'המחיר בישראל, משתמש אחד' },
  { name: 'Canva Pro', category: 'tools', freq: 'monthly', day: 1, amount: 55, note: 'משתמש אחד, תשלום חודשי' },
  { name: 'קו סלולר לעסק', category: 'tools', freq: 'monthly', day: 1, amount: 40, note: 'קו נפרד ללקוחות' },
  { name: 'השתלמות מקצועית', category: 'pro', freq: 'yearly', day: 1, amount: 2400, stages: ['first', 'active'], note: 'קורס או כנס אחד בשנה' },
  ...[
    ['עמלות חשבון בנק עסקי', 'other', 'monthly', 30, 'עמלות בסיסיות בחודש'],
    ['נסיעות לפגישות', 'other', 'monthly', 250, 'הערכה, לפי מספר הפגישות פנים מול פנים'],
    ['LinkedIn Premium', 'marketing', 'monthly', 120, 'Premium Career, משתמש אחד'],
    ['Notion Plus', 'tools', 'monthly', 45, 'תכנון ומשימות, משתמש אחד'],
    ['ביטוח ציוד', 'insurance', 'yearly', 300, 'מחשב וציוד צילום'],
    ['Dropbox Plus', 'tools', 'monthly', 45, '2TB לקבצים של לקוחות'],
    ['CapCut Pro', 'tools', 'monthly', 40, 'עריכת סרטונים קצרים'],
    ['אינטרנט (החלק של העסק)', 'other', 'monthly', 60, 'חלק מחשבון הבית'],
    ['קפה ואירוח לקוחות', 'other', 'monthly', 150, 'פגישות בבית קפה'],
    ['חלל עבודה משותף', 'other', 'monthly', 900, 'שולחן גמיש, כמה ימים בשבוע'],
    ['ספרים וקורסים דיגיטליים', 'pro', 'monthly', 100, 'ממוצע בחודש'],
    ['נטוורקינג ומפגשים מקצועיים', 'marketing', 'monthly', 150, 'כרטיסים לאירועים'],
    ['סופרוויז\'ן או מנטור', 'pro', 'monthly', 400, 'פגישה אחת בחודש'],
    ['מתנות ללקוחות', 'marketing', 'yearly', 600, 'לחגים, ללקוחות פעילים'],
    ['תחזוקת מחשב', 'other', 'yearly', 400, 'תיקונים וחלקים'],
    ['חברות באיגוד מקצועי', 'pro', 'yearly', 600, 'דמי חבר לשנה'],
    ['כרטיס אשראי עסקי', 'other', 'monthly', 20, 'דמי כרטיס'],
  ].map(([name, category, freq, amount, note]) => ({ name, category, freq, day: 1, amount, note, extra: true })),
];

// One-time setup. What FlowBiz builds with the user (the name and logo, the messages page,
// the landing page) is a suggestion like the rest: 0 ₪, with the market price in the note.
// Added, it shows that price under "תכננת" and "חסכת עם FlowBiz", and never counts.
// Amounts are kept realistic for someone starting alone, not a studio's price list.
export const FLOWBIZ_SETUP = [
  { id: 'fb-logo', name: 'שם ולוגו', icon: 'palette', value: 1200, step: 6 },
  { id: 'fb-msg', name: 'דף המסרים (קופירייטינג)', icon: 'pen-line', value: 1000, step: 7 },
  { id: 'fb-lp', name: 'דף נחיתה', icon: 'layout-template', value: 1800, step: 9 },
];
const fbSetup = (id) => {
  const x = FLOWBIZ_SETUP.find((y) => y.id === id);
  return { name: x.name, icon: x.icon, planned: 0, flowbiz: true, value: x.value, note: `נבנה ב-FlowBiz, בשלב ${x.step}. אצל פרילנסר: כ-${x.value.toLocaleString('he-IL')} ₪` };
};
export const SHARK_SETUP = [
  { name: 'פתיחת תיק אצל רואה חשבון', icon: 'file-text', planned: 450, stages: ['setup'], note: 'פתיחה במע"מ ובמס הכנסה ושכר רו"ח. בשוק: 350-600 ₪',
    fb: { name: 'פתיחת תיק דרך FlowBiz', icon: 'file-text', planned: withVat(FLOWBIZ_FILE_OPENING), shown: plusVat(FLOWBIZ_FILE_OPENING), pitch: `פתיחת תיק חד-פעמית ב-${FLOWBIZ_FILE_OPENING} ₪ + מע"מ, עם רואה החשבון של FlowBiz.`, market: 'במחיר שוק: 350-600 ₪' } },
  fbSetup('fb-logo'),
  { name: 'חוזה לקוח מעורך דין', icon: 'scale', planned: 800, note: 'התאמה של חוזה ליווי קיים, 500-1,200 ₪' },
  fbSetup('fb-lp'),
  { name: 'מצלמת רשת ותאורה', icon: 'camera', planned: 400, note: 'מצלמת רשת וטבעת תאורה' },
  fbSetup('fb-msg'),
  { name: 'קמפיין השקה', icon: 'megaphone', planned: 1000, note: 'תקציב פרסום לחודש הראשון' },
  { name: 'צילומי תדמית', icon: 'image', planned: 800, note: 'צלם לחצי שעה, כמה תמונות ערוכות' },
  { name: 'מיקרופון', icon: 'mic', planned: 250, note: 'מיקרופון USB לשיחות והקלטות' },
  { name: 'מחשב נייד', icon: 'laptop', planned: 3000, note: 'רק אם צריך חדש. דגם בסיסי מספיק לעבודה ולזום' },
  { name: 'עמדת עבודה (שולחן וכיסא)', icon: 'armchair', planned: 800, note: 'כיסא משרדי ושולחן פשוט' },
  ...[
    ['כרטיסי ביקור', 'id-card', 150, '250 כרטיסים, הדפסה דיגיטלית'],
    ['אוזניות עם מיקרופון', 'headphones', 250, 'לשיחות ארוכות'],
    ['מסך נוסף', 'monitor', 600, 'מסך 24 אינץ\''],
    ['שם מתחם (דומיין)', 'globe', 70, 'כתובת co.il לשנה הראשונה'],
    ['סרטון היכרות קצר', 'video', 1200, 'צילום ועריכה של דקה, לדף הנחיתה'],
    ['תאורה לצילום סרטונים', 'lamp', 300, 'שתי מנורות עם מעמד'],
    ['רול-אפ לכנסים', 'flag', 250, 'הדפסה ומעמד'],
    ['מעמד למחשב ומקלדת', 'keyboard', 200, 'לעבודה ארוכה ליד המחשב'],
    ['קורס הכשרה לפני הפתיחה', 'graduation-cap', 1500, 'קורס דיגיטלי או סדנה'],
    ['טלפון לעסק', 'smartphone', 1500, 'רק אם צריך מכשיר נפרד'],
    ['מדפסת', 'printer', 500, 'רק אם מדפיסים חוזים וחומרים'],
    ['חותמת עסק', 'stamp', 80, 'לחוזים ולקבלות'],
  ].map(([name, icon, planned, note]) => ({ name, icon, planned, note, extra: true })),
];
// How urgent each suggestion is, for the order and the small label on the card:
//   1 = חובה (the law, taxes, the client contract), 2 = חשוב (what brings and serves clients),
//   3 = אפשר לחכות (nice to have; the first thing the shark offers to drop when money is short).
// Anything not listed is 3.
export const NEED_LABEL = { 1: 'חובה', 2: 'חשוב', 3: 'אפשר לחכות' };
const NEED = {
  'פתיחת תיק אצל רואה חשבון': 1, 'פתיחת תיק דרך FlowBiz': 1, 'חוזה לקוח מעורך דין': 1,
  'הנהלת חשבונות': 1, 'FlowBiz עם רואה חשבון': 1, 'ביטוח לאומי (מינימום)': 1, 'דוח שנתי לרואה חשבון': 1, 'עמלות חשבון בנק עסקי': 1,
  FlowBiz: 2, 'שם ולוגו': 2, 'דף נחיתה': 2, 'דף המסרים (קופירייטינג)': 2, 'קמפיין השקה': 2, 'מצלמת רשת ותאורה': 2, 'שם מתחם (דומיין)': 2,
  'פרסום ממומן (פייסבוק ואינסטגרם)': 2, 'Zoom Pro': 2, 'ביטוח אחריות מקצועית': 2, 'אינטרנט (החלק של העסק)': 2,
};
export const needOf = (name) => NEED[name] ?? 3;
const byNeed = (list) => list.map((x, i) => [x, i]).sort((a, b) => needOf(a[0].name) - needOf(b[0].name) || a[1] - b[1]).map(([x]) => ({ ...x, need: needOf(x.name) }));
const ordered = (list) => [...byNeed(list.filter((x) => !x.extra)), ...byNeed(list.filter((x) => x.extra))];

// The suggestions that fit this user, with the amount and the note for their entity.
const forEntity = (v, s) => (v != null && typeof v === 'object' ? v[s.entity] ?? v.exempt : v);
const fits = (x, s) => !x.stages || x.stages.includes(s.stage);
const resolve = (x, s) => ({ ...x, amount: forEntity(x.amount, s), note: forEntity(x.note, s), start: x.start === 'next' ? FIRST_MONTH : 'now', fb: x.fb && { ...x.fb, market: forEntity(x.fb.market, s) } });
export const sharkExpensesFor = (s) => ordered(SHARK_EXPENSES.filter((x) => fits(x, s)).map((x) => resolve(x, s)));
export const sharkSetupFor = (s) => ordered(SHARK_SETUP.filter((x) => fits(x, s)).map((x) => resolve(x, s)));
// A row the user added that has a FlowBiz way (or is the FlowBiz way): what it switches to.
export function fbSwitchOf(name, s, list) {
  const all = list === 'setup' ? SHARK_SETUP : SHARK_EXPENSES;
  const base = all.find((x) => x.fb && x.name === name);
  if (base) return { to: 'fb', base: resolve(base, s), fb: resolve(base, s).fb };
  const back = all.find((x) => x.fb && x.fb.name === name);
  if (back) return { to: 'base', base: resolve(back, s), fb: resolve(back, s).fb };
  return null;
}
// The FlowBiz row once the user added it (demo data uses the same).
export const flowbizExpense = () => ({ id: 'x-flowbiz', name: 'FlowBiz', amount: withVat(FLOWBIZ_PRICE), category: 'flowbiz', freq: 'monthly', day: 1, start: 'now', flowbiz: 'system', sub: FLOWBIZ_NOTE });

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
  closeRate: 20, // % of calls that buy
  hoursMonth: 80, // hours a month for client work (from step 2: hours a week x 4)
  stayMonths: 3, // a monthly client stays this long on average
};

const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 100;
export const nextId = (p = 'x') => `${p}${++seq}`;

// A setup item, as in the finance center: planned, paid so far, and "paid in full".
const item = (id, name, icon, planned, spent, done = false) => ({ id, name, icon, planned, spent, done });
const SETUP_ITEMS = [
  item('s1', 'מצלמת רשת ותאורה', 'camera', 400, 400, true),
  item('s2', 'פתיחת תיק אצל רואה חשבון', 'file-text', 400, 400, true),
  item('s3', 'חוזה לקוח מעורך דין', 'scale', 800, 0),
  item('s4', 'קמפיין השקה', 'megaphone', 1000, 600),
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
    setupBudget: null, // stage 1: starts as the money in the business today, until the user sets it
    budgetSet: false,
    setup: [],
    expenses: [],
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
    applied: [],
    done: false,
    doneOn: null,
    ...extra,
  };
}

// Each scenario is a user arriving at step 5 with what the earlier steps know: the basket,
// the goal and the hours. Part 1 starts empty. `demo` fills part 1 (for a direct link or a
// dev jump past it), so every later screen opens with numbers.
const ADS = 'פרסום ממומן (פייסבוק ואינסטגרם)';
const expenses = (acct = 350) => [flowbizExpense(), exp('Zoom Pro', 60, 'tools', 'monthly', 1), exp('Canva Pro', 55, 'tools', 'monthly', 1), exp('הנהלת חשבונות', acct, 'pro', 'monthly', 10)];
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
      s.budgetSet = true;
      s.setup = clone(SETUP_ITEMS);
      s.expenses = [...expenses(), exp(ADS, 200, 'marketing', 'weekly', 0, '2027-01')];
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
      s.expenses = [...expenses(), exp(ADS, 200, 'marketing', 'weekly', 0)];
      s.history = clone(HISTORY_FIRST);
      s.toCome = { now: 2500, next: 2500, later: 0 };
      s.setupDone = false;
      s.setup = [item('s1', 'מצלמת רשת ותאורה', 'camera', 400, 0)];
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
      s.expenses = [...expenses(450), exp(ADS, 200, 'marketing', 'weekly', 0), exp('ביטוח אחריות מקצועית', 1320, 'insurance', 'yearly', 12)];
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
