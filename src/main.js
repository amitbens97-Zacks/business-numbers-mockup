// Task 6: step 5 "העסק במספרים" (chapter 2, the last free step). It merges the old
// "תקציב הקמה" and "תחזית פיננסית" steps and adapts to where the business stands.
// There is no frame around the product: it opens on step 5, as a user reaches it.
// Link params: ?view=step|home, ?screen=opening|stage|today|prices|goal|sell|forecast|doc|done,
// ?scenario=setup|first|active|skipped, ?user=f, ?embed = phone layout.
// Shift+D opens the developer notes, the scenarios and the screen list.
import { html, render, useState, useEffect, useRef, Icon, cx } from './lib.js';
import { Logo, PartnerBubble, Progress, TopBar, BottomBar, Status, PrimaryButton, Button, Toast } from './components.js';
import { STEP, PARTS, STEP_SCREENS, SCENARIOS, DEFAULT_SCENARIO, HISTORY_FIRST, g } from './data.js';
import { model, missingOf, paidProducts, todayText, taxPctOf, fixBaseOf, withPicks } from './calc.js';
import { Opening, StageScreen, PricesScreen } from './parts.js';
import { TodayScreen, ALL_SECTIONS, historyMissing } from './today.js';
import { GoalScreen, SellScreen, ForecastScreen } from './plan.js';
import { DocScreen, Done, Home, Paywall, financeLink } from './finish.js';
import { DevPanel } from './devnotes.js';
import { EMBED, IS_PHONE, readView, saveView, writeHandoff, takeHandoff, applyPhoneViewport, ViewToggle, PhonePreview } from './viewswitch.js';

const params = new URLSearchParams(location.search);
const SCREENS = ['opening', 'stage', ...STEP_SCREENS, 'doc', 'done'];
const clone = (x) => JSON.parse(JSON.stringify(x));

function makeScenario(id) {
  const sc = SCENARIOS.find((x) => x.id === id) || SCENARIOS[0];
  return sc.make();
}

// The first entry is empty. A direct link (or a jump in the developer panel) past part 1
// fills it with the scenario's demo, so every later screen opens with numbers.
function fillTo(st, screen, scenarioId) {
  const at = SCREENS.indexOf(screen);
  if (at > SCREENS.indexOf('today')) {
    if (st.bank.amount == null) (SCENARIOS.find((x) => x.id === scenarioId) || SCENARIOS[0]).demo(st);
    if (st.stage !== 'setup' && historyMissing(st)) st.history = { ...HISTORY_FIRST };
    if (st.bank.has == null) st.bank.has = true;
    if (st.setupBudget == null && st.stage === 'setup') st.setupBudget = 0;
    if (st.setupDone == null) st.setupDone = true;
    if (st.stage === 'active' && st.regular.amount == null) st.regular.amount = 0;
    st.seen = [...ALL_SECTIONS];
  }
  if (at > SCREENS.indexOf('prices')) st.products.forEach((p) => p.cost == null && (p.cost = 60));
  return st;
}

function startRoute() {
  if (params.get('view') === 'home') return { view: 'home' };
  const sc = params.get('screen');
  return { view: 'step', screen: SCREENS.includes(sc) ? sc : 'opening' };
}

const partOf = (screen) => (screen === 'stage' || screen === 'today' ? 0 : STEP_SCREENS.indexOf(screen));

function sharkLine(screen, s, m) {
  return {
    opening: g('עסק בלי מספרים הוא ניחוש. נעשה את זה פעם אחת ביחד, ובסוף תדע בדיוק איפה אתה עומד.', 'עסק בלי מספרים הוא ניחוש. נעשה את זה פעם אחת ביחד, ובסוף תדעי בדיוק איפה את עומדת.'),
    stage: g('אין כאן תשובה לא נכונה. לפי מה שתבחר, אשאל רק את מה שצריך.', 'אין כאן תשובה לא נכונה. לפי מה שתבחרי, אשאל רק את מה שצריך.'),
    today: s.stage === 'setup'
      ? 'הוספתי הצעות למה שיועצי שיווק צריכים בדרך כלל בהקמה, במחירי שוק. מה שלא רלוונטי, פשוט לא להוסיף.'
      : g('יש לך דוח רווח והפסד מרואה החשבון? אני אקרא אותו ואחסוך לך את ההקלדה.', 'יש לך דוח רווח והפסד מרואה החשבון? אני אקרא אותו ואחסוך לך את ההקלדה.'),
    prices: g('שים לב לשורה "כמה אתה מרוויח על שעת עבודה". זה המספר שמחליט איזה מוצר כדאי למכור יותר.', 'שימי לב לשורה "כמה את מרוויחה על שעת עבודה". זה המספר שמחליט איזה מוצר כדאי למכור יותר.'),
    goal: 'היעד הוא מה שנשאר לך, לא מה שנכנס. את הדרך מהיעד להכנסות אני מחשב בחלק הבא.',
    sell: 'הצעתי תמהיל לפי הרווח לשעה ולפי השעות שיש לך. אפשר לשחק עם המספרים, והכל מתעדכן.',
    forecast: m.verdict.tone === 'ok' ? 'המודל עובד. מכאן זה עניין של ביצוע: להביא את הפניות, ולסגור.' : 'משהו לא מסתדר, ובשביל זה בדיוק בודקים עכשיו ולא אחרי שנה. בחרתי את השינויים שהכי משפיעים.',
    doc: 'זו התוכנית שלך. היא נשמרת, ואפשר לחזור ולעדכן אותה בכל פעם שהעסק משתנה.',
    home: 'פרק 2 מאחוריך. יש לך מספרים שעובדים, עכשיו בונים את המותג.',
  }[screen];
}

function reasonOf(screen, s, m) {
  if (screen === 'stage' && !s.stage) return 'צריך לבחור איפה העסק עומד';
  if (screen === 'today') {
    if (s.bank.has == null) return 'צריך לענות אם יש חשבון בנק נפרד';
    if (s.bank.amount == null) return 'צריך לכתוב כמה כסף יש היום';
    if (s.stage === 'setup' && s.setupBudget == null) return 'צריך את תקציב ההקמה';
    if (s.stage !== 'setup') {
      if (historyMissing(s)) return historyMissing(s);
      if (s.stage === 'active' && s.regular.amount == null) return 'צריך את ההכנסה הקבועה';
      if (s.setupDone == null) return 'צריך לענות אם ההקמה הסתיימה';
    }
  }
  if (screen === 'prices') {
    if (!paidProducts(s).length) return 'צריך לפחות מוצר אחד בתשלום';
    const miss = s.products.find((p) => !p.free && missingOf(p).length);
    if (miss) return `חסר ${missingOf(miss)[0]} ב${miss.short || miss.name}`;
  }
  if (screen === 'goal' && !s.goal) return 'צריך יעד חודשי';
  if (screen === 'sell') {
    if (!s.assumptions.hoursMonth) return 'צריך כמה שעות בחודש יש לך';
    if (!Object.values(m.mix).some((n) => n > 0)) return 'צריך לפחות מכירה אחת בתמהיל';
  }
  return null;
}

function App({ view: shellView, onViewChange }) {
  const handoff = useRef(takeHandoff()).current;
  const [scenario, setScenarioId] = useState(handoff?.scenario || (SCENARIOS.some((x) => x.id === params.get('scenario')) ? params.get('scenario') : DEFAULT_SCENARIO));
  const [route, setRoute] = useState(handoff?.route || startRoute());
  const [s, setS] = useState(() => {
    if (handoff?.state) return handoff.state;
    const st = makeScenario(scenario);
    // A direct link into the step (past the stage question) needs a stage.
    if (!['opening', 'stage'].includes(route.screen) && route.view === 'step') st.stage = SCENARIOS.find((x) => x.id === scenario).stage;
    if (route.view === 'home') st.stage = SCENARIOS.find((x) => x.id === scenario).stage;
    return fillTo(st, route.view === 'home' ? 'done' : route.screen, scenario);
  });
  const [maxPart, setMaxPart] = useState(handoff?.maxPart ?? 0);
  const [toast, setToast] = useState(null);
  const [dev, setDev] = useState(false);
  const [save, setSave] = useState(null);
  const [unread, setUnread] = useState(true);
  const [paywall, setPaywall] = useState(false);
  const timers = useRef({});
  const sRef = useRef(s);
  sRef.current = s;
  const m = model(s);

  useEffect(() => {
    window.__flowbizSnapshot = () => ({ route, state: s, scenario, maxPart });
  });
  useEffect(() => {
    const q = new URLSearchParams();
    q.set('view', route.view);
    if (route.view === 'step') q.set('screen', route.screen);
    q.set('scenario', scenario);
    if (EMBED) q.set('embed', '1');
    if (params.get('user')) q.set('user', params.get('user'));
    history.replaceState(null, '', `${location.pathname}?${q}`);
    setUnread(true);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [route.view, route.screen]);
  useEffect(() => {
    const k = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === 'D' && e.shiftKey && !typing) setDev((d) => !d);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const notify = (text, icon = 'info', undo) => {
    const id = Date.now();
    setToast({ id, text, icon, undo });
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToast(null), undo ? 5000 : 2800);
  };
  const undoTo = (prev) => {
    setS(prev);
    setToast(null);
  };
  // Every change: a fresh copy, the change, and "נשמר". With a text, it also offers undo.
  const up = (fn, undoText) => {
    const prev = sRef.current;
    const next = clone(prev);
    fn(next);
    if (next.fixBase && route.screen !== 'forecast') {
      next.fixBase = null;
      next.picks = [];
    }
    setS(next);
    setSave('saving');
    clearTimeout(timers.current.save);
    timers.current.save = setTimeout(() => setSave('saved'), 450);
    if (undoText) notify(undoText, 'check', () => undoTo(prev));
  };
  const go = (r) => {
    setSave(null);
    setRoute(r);
    if (r.view === 'step') {
      const i = partOf(r.screen);
      if (i > maxPart) setMaxPart(i);
    }
  };
  const toScreen = (screen) => go({ view: 'step', screen });

  const setScenario = (id) => {
    const st = makeScenario(id);
    st.stage = SCENARIOS.find((x) => x.id === id).stage;
    setScenarioId(id);
    setS(st);
    setMaxPart(0);
    setDev(false);
    setRoute({ view: 'step', screen: 'stage' });
    notify(`מצב חדש: ${SCENARIOS.find((x) => x.id === id).label}`, 'rotate-ccw');
  };
  const jump = (id) => {
    setDev(false);
    if (id === 'home') return go({ view: 'home' });
    up((d) => {
      if (!['opening', 'stage'].includes(id) && !d.stage) d.stage = SCENARIOS.find((x) => x.id === scenario).stage;
      fillTo(d, id, scenario);
    });
    setMaxPart(4);
    toScreen(id);
  };
  // Part 5: pick a fix, or take it back. The state is rebuilt from before the first pick.
  const applyFix = (fx) => {
    const prev = sRef.current;
    const base = prev.fixBase || fixBaseOf(prev);
    const was = prev.picks || [];
    const on = was.some((p) => p.id === fx.d.id);
    const picks = on ? was.filter((p) => p.id !== fx.d.id) : [...was, fx.d];
    const next = clone(withPicks(prev, base, picks));
    next.picks = picks;
    next.fixBase = picks.length ? base : null;
    next.applied = picks.map((d) => ({ id: d.id, title: d.title, basket: d.basket, at: 0 }));
    setS(next);
    notify(on ? `ביטלת: ${fx.title}` : fx.basket ? `${fx.title}. עודכן גם בסל המוצרים` : fx.title, on ? 'rotate-ccw' : 'wand-sparkles', () => undoTo(prev));
  };
  const clearPicks = () => {
    const prev = sRef.current;
    if (!prev.fixBase) return;
    const next = clone(withPicks(prev, prev.fixBase, []));
    next.picks = [];
    next.fixBase = null;
    next.applied = [];
    setS(next);
    notify('ביטלת את כל השינויים', 'rotate-ccw', () => undoTo(prev));
  };
  const openFinance = () => window.open(financeLink(s), '_blank', 'noopener');

  const devBtn = html`<button type="button" onClick=${() => setDev((d) => !d)} title="הערות למפתחים (Shift+D)" aria-label="הערות למפתחים" class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-brand-50 hover:text-brand-600 cursor-pointer max-md:hidden"><${Icon} name="code-xml" size=${18} /></button>`;
  const shell = (inner) => html`<div class="fb-notebook flex h-dvh flex-col text-ink" dir="rtl">
    ${inner}
    <${Toast} toast=${toast} onUndo=${() => toast?.undo?.()} />
    ${paywall && html`<${Paywall} onClose=${() => setPaywall(false)} />`}
    <${DevPanel} open=${dev} onClose=${() => setDev(false)} onJump=${jump} scenario=${scenario} onScenario=${setScenario} />
  </div>`;

  // ---------- home ----------
  if (route.view === 'home') {
    const nav = [
      ['home', 'בית', 'house'],
      ['calendar', 'יומן', 'calendar-days'],
      ['tasks', 'משימות', 'list-checks'],
      ['finance', 'כספים', 'wallet'],
      ['files', 'קבצים', 'folder-open'],
      ['pages', 'הדפים שלי', 'layout-template'],
    ];
    return shell(html`<header class="no-print z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 md:px-6">
        <button type="button" aria-label="דף הבית" class="cursor-pointer" onClick=${() => go({ view: 'home' })}><${Logo} size="sm" /></button>
        <nav class="ms-4 hidden items-center gap-1 lg:flex">
          ${nav.map(([id, label, icon]) => {
            const locked = id === 'finance' && !s.done;
            return html`<button key=${id} type="button" class=${cx('inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-bold cursor-pointer', id === 'home' ? 'bg-brand-100 text-brand-600' : locked ? 'text-faint' : 'text-muted hover:bg-brand-50 hover:text-brand-600')} onClick=${() => (id === 'home' ? null : id === 'finance' ? (s.done ? openFinance() : notify('"כספים" נפתח בסוף "העסק במספרים"', 'lock')) : notify('במוק-אפ הפריט הזה לא פעיל', 'info'))}><${Icon} name=${locked ? 'lock' : icon} size=${17} />${label}</button>`;
          })}
        </nav>
        <span class="ms-auto"></span>
        ${!EMBED && html`<${ViewToggle} view=${shellView} onChange=${onViewChange} class="max-md:hidden" />`}
        ${devBtn}
      </header>
      <main class="thin-scroll relative min-h-0 flex-1 overflow-y-auto">
        <${Home} s=${s} go=${go} onPaywall=${() => setPaywall(true)} onFinance=${openFinance} />
        <${PartnerBubble} message=${s.done ? sharkLine('home', s, m) : sharkLine('opening', s, m)} unread=${unread} onRead=${() => setUnread(false)} />
      </main>`);
  }

  // ---------- the step ----------
  const screen = route.screen;
  if (!s.stage && !['opening', 'stage'].includes(screen)) {
    setTimeout(() => toScreen('stage'));
    return shell(html`<div></div>`);
  }
  const part = partOf(screen);
  const reason = reasonOf(screen, s, m);
  const order = SCREENS;
  const next = order[order.indexOf(screen) + 1];
  const prevScreen = order[order.indexOf(screen) - 1];
  // Picking where the business stands moves on by itself, after a short pause.
  const onPicked = () => {
    clearTimeout(timers.current.auto);
    timers.current.auto = setTimeout(() => toScreen('today'), 650);
  };
  const props = { s, up, m, notify, undoTo, onStage: () => toScreen('stage') };
  const body = {
    opening: html`<${Opening} />`,
    stage: html`<${StageScreen} ...${props} onPicked=${onPicked} />`,
    today: html`<${TodayScreen} ...${props} />`,
    prices: html`<${PricesScreen} ...${props} />`,
    goal: html`<${GoalScreen} ...${props} />`,
    sell: html`<${SellScreen} ...${props} />`,
    forecast: html`<${ForecastScreen} ...${props} onApply=${applyFix} onClearPicks=${clearPicks} />`,
    doc: html`<${DocScreen} ...${props} />`,
    done: html`<${Done} s=${s} />`,
  }[screen];
  const inParts = !['opening', 'doc', 'done'].includes(screen);
  const top = html`<${TopBar}
    step=${STEP}
    progress=${screen === 'opening' ? null : html`<${Progress} parts=${PARTS} current=${screen === 'doc' || screen === 'done' ? PARTS.length : Math.max(0, part)} maxReached=${Math.max(maxPart, part)} done=${screen === 'doc' || screen === 'done'} onJump=${(i) => toScreen(i === 0 ? 'today' : STEP_SCREENS[i])} />`}
    tools=${html`${screen !== 'done' && html`<button type="button" class="fb-home cursor-pointer whitespace-nowrap max-md:hidden" onClick=${() => (notify('דילגת על השלב. הוא נשאר פתוח במפה, ואפשר לחזור בדיוק לכאן', 'skip-forward'), go({ view: 'home' }))}><${Icon} name="skip-forward" size=${16} />דילוג על השלב</button>`}${!EMBED && html`<${ViewToggle} view=${shellView} onChange=${onViewChange} class="max-md:hidden" />`}${devBtn}`}
    onHome=${() => go({ view: 'home' })}
  />`;
  const label = { opening: 'מתחילים', forecast: 'לתוכנית העסקית', doc: 'סיום השלב' }[screen] || 'המשך';
  const bottom =
    screen === 'done'
      ? html`<${BottomBar}
          extra=${html`<${Button} variant="text" onClick=${() => go({ view: 'home' })}><${Icon} name="house" size=${16} />לדף הבית<//><${Button} variant="text" onClick=${() => toScreen('doc')}><${Icon} name="file-text" size=${16} />התוכנית העסקית<//>`}
          primary=${html`<${PrimaryButton} label="לעמוד הכספים" onClick=${openFinance} />`}
        />`
      : html`<${BottomBar}
          back=${screen !== 'opening' && html`<${Button} variant="secondary" onClick=${() => toScreen(prevScreen)}>חזרה<//>`}
          extra=${screen === 'goal' && html`<span key=${taxPctOf(s)} class="rise inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-[14px] font-bold text-brand-600" role="status" aria-live="polite"><${Icon} name="percent" size=${15} />מס וביטוח לאומי: <span class="font-display text-[17px] font-black tabular-nums">${taxPctOf(s)}%</span></span>`}
          status=${html`<${Status} undo=${null} reason=${reason} save=${inParts ? save : null} hint=${screen === 'forecast' && m.verdict.tone !== 'ok' ? (m.verdict.tone === 'bad' ? 'אפשר לסיים גם עם בדיקה אדומה' : 'אפשר לסיים גם ככה') : null} />`}
          primary=${html`<${PrimaryButton}
            label=${label}
            check=${screen === 'doc'}
            disabled=${!!reason}
            onClick=${() => {
              if (reason) return;
              if (screen === 'doc') up((d) => ((d.done = true), (d.doneOn = todayText())));
              toScreen(next);
            }}
          />`}
        />`;
  const line = sharkLine(screen, s, m);
  return shell(html`${top}
    <main class="thin-scroll relative min-h-0 flex-1 overflow-y-auto">
      ${body}
      ${line && html`<${PartnerBubble} message=${line} unread=${unread} onRead=${() => setUnread(false)} mood=${screen === 'forecast' ? (m.verdict.tone === 'ok' ? 'happy' : 'thinking') : 'calm'} />`}
    </main>
    ${bottom}`);
}

function Root() {
  const [view, setView] = useState(readView);
  useEffect(() => applyPhoneViewport(view), [view]);
  const change = (v) => {
    if (v === 'mobile') {
      try {
        writeHandoff(window.__flowbizSnapshot?.());
      } catch {}
    }
    saveView(v);
    setView(v);
  };
  if (!EMBED && !IS_PHONE && view === 'mobile') return html`<${PhonePreview} onSwitch=${change} title="העסק במספרים" />`;
  return html`<${App} view=${view} onViewChange=${change} />`;
}

applyPhoneViewport(readView());
render(html`<${Root} />`, document.getElementById('app'));
