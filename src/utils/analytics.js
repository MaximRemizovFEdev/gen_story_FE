const COUNTER_ID = 113444344;
const PREFIX = 'aidaskazka:metrica:';
const ROUTES = new Set(['/', '/app', '/auth', '/auth/success', '/auth/error',
  '/payment-return', '/privacy', '/policy', '/oferta']);
let lastPage;

export function trackPage(pathname) {
  const path = ROUTES.has(pathname) ? pathname : '/404';
  if (lastPage === path) return;
  try {
    if (typeof window.ym !== 'function') return;
    window.ym(COUNTER_ID, 'hit', window.location.origin + path, {
      referer: lastPage ? window.location.origin + lastPage : '',
      title: 'Ай да сказка',
    });
    lastPage = path;
  } catch { /* Analytics must never interrupt the application. */ }
}

// IDs stay in this browser; only the goal name is sent to Metrica.
// Mark before sending: prefer losing an event to repeating it after reload.
export function reachGoalOnce(goal, id) {
  if (!id) return;
  try {
    if (typeof window.ym !== 'function') return;
    const key = `${PREFIX}${goal}:${id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    window.ym(COUNTER_ID, 'reachGoal', goal);
  } catch { /* If persistent storage is unavailable, skip the event. */ }
}

export function trackWizardStart() {
  try {
    let id = sessionStorage.getItem(`${PREFIX}wizard`);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(`${PREFIX}wizard`, id);
    }
    reachGoalOnce('wizard_start', id);
  } catch { /* Storage can be blocked independently of Metrica. */ }
}

export function finishWizardAnalytics() {
  try {
    sessionStorage.removeItem(`${PREFIX}wizard`);
  } catch { /* No effect on form or payment state. */ }
}
