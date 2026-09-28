/**
 * Dental Charting activity tracker.
 *
 * Sends usage events (patient created, chart entries saved/deleted, PDF/image
 * downloads, per-screen time-on-page, session start/end) to Odoo's
 * charting_activity_log module, shown in Odoo under Activity Tracker >
 * Dental Charting. Same pattern as the other Snabbb mini-apps:
 *
 *   browser -> POST /api/charting/activity (public/_worker.js, this origin)
 *           -> POST https://mrbur.odoo.com/snabbb/api/charting/activity
 *              with the X-Snabbb-Api-Key that only the worker knows.
 *
 * Rules this file holds itself to:
 *  - Tracking must NEVER break or slow the app: every call is fire-and-forget
 *    and swallows its own errors.
 *  - No patient data in events. Details say what happened (and, for chart
 *    entries, the tooth number + treatment) — never a patient's name, IC,
 *    phone or email.
 *  - Events are dropped when the actor can't be identified (not logged in,
 *    local dev bypass), rather than stored anonymously.
 */

const SNABBB_APP_URL = "https://app.snabbb.com";
const ACTIVITY_ENDPOINT = "/api/charting/activity";
const MIN_PAGE_SECONDS = 1;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Actor = { email: string; name?: string; supabaseUserId?: string };

type LogExtras = {
  pagePath?: string;
  pageDurationSeconds?: number;
  sessionDurationSeconds?: number;
};

let cachedActor: Actor | null = null;
let actorPromise: Promise<Actor | null> | null = null;

/** Mirrors ProfileSettings' readUser() for the /api/verify-token payload. */
function readActor(payload: unknown): Actor | null {
  const data = payload as Record<string, any> | null;
  const user = data?.user ?? data?.data?.user ?? data?.profile ?? data?.data ?? {};
  const profileUser = user?.profiles?.user ?? user?.profile ?? {};
  const metadata = profileUser?.user_metadata ?? user?.user_metadata ?? {};
  const email = String(user.email ?? profileUser.email ?? "").trim();
  if (!email) return null;
  const fullName = [
    metadata.first_name ?? profileUser.first_name ?? user.first_name,
    metadata.last_name ?? profileUser.last_name ?? user.last_name,
  ].filter(Boolean).join(" ").trim();
  const name = fullName || metadata.full_name || metadata.name
    || profileUser.full_name || profileUser.name || user.full_name || user.name || undefined;
  const id = profileUser.user_id ?? profileUser.id ?? user.id ?? user.user_id ?? user.supabase_user_id;
  return { email, name: name ? String(name) : undefined, supabaseUserId: id ? String(id) : undefined };
}

function getActor(): Promise<Actor | null> {
  if (cachedActor) return Promise.resolve(cachedActor);
  if (!actorPromise) {
    actorPromise = fetch(`${SNABBB_APP_URL}/api/verify-token`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        cachedActor = readActor(payload);
        return cachedActor;
      })
      .catch(() => null)
      .finally(() => {
        // Let a later event retry if we couldn't identify anyone this time.
        if (!cachedActor) actorPromise = null;
      });
  }
  return actorPromise;
}

function buildBody(actor: Actor, action: string, details: string, extras: LogExtras) {
  return {
    external_ref: `charting-activity-${crypto.randomUUID()}`,
    actor_email: actor.email,
    actor_name: actor.name ?? null,
    supabase_user_id: actor.supabaseUserId ?? null,
    action,
    details,
    occurred_at: new Date().toISOString(),
    ...(extras.pagePath !== undefined && { page_path: extras.pagePath }),
    ...(extras.pageDurationSeconds !== undefined && { page_duration_seconds: extras.pageDurationSeconds }),
    ...(extras.sessionDurationSeconds !== undefined && { session_duration_seconds: extras.sessionDurationSeconds }),
  };
}

async function send(body: ReturnType<typeof buildBody>, allowRetry: boolean) {
  try {
    const response = await fetch(ACTIVITY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the request outlive a closing tab (page_view /
      // session_end fire on pagehide).
      keepalive: true,
      body: JSON.stringify(body),
    });
    // 4xx is a payload/config problem — retrying the identical body won't help.
    if (!response.ok && response.status >= 500 && allowRetry) throw new Error(String(response.status));
  } catch {
    // The external_ref is the same on retry, and Odoo de-duplicates on it, so
    // a retry after a timeout can never create a duplicate row.
    if (allowRetry) window.setTimeout(() => void send(body, false), 2000);
  }
}

/** Fire-and-forget: never throws, never blocks the caller. */
export function logActivity(action: string, details: string, extras: LogExtras = {}) {
  void getActor()
    .then((actor) => {
      if (actor) return send(buildBody(actor, action, details, extras), true);
    })
    .catch(() => undefined);
}

/** Same as logActivity but synchronous, for pagehide — only uses an already-resolved actor. */
function logActivityNow(action: string, details: string, extras: LogExtras = {}) {
  if (!cachedActor) return;
  void send(buildBody(cachedActor, action, details, extras), false);
}

/* ------------------------------------------------------------------ */
/* Page + session duration                                             */
/* ------------------------------------------------------------------ */

let activePage: string | null = null;
// The screen the user is on, kept even while the timer is paused (tab hidden).
let lastKnownPage: string | null = null;
let activePageSince = 0;
let sessionSince = 0;
let sessionEnded = false;
let started = false;

function flushPage(sync: boolean) {
  if (!activePage) return;
  const seconds = Math.round((Date.now() - activePageSince) / 1000);
  const path = activePage;
  activePage = null;
  if (seconds < MIN_PAGE_SECONDS) return;
  const details = `Viewed ${path} for ${seconds}s`;
  const extras = { pagePath: path, pageDurationSeconds: seconds };
  if (sync) logActivityNow("page_view", details, extras);
  else logActivity("page_view", details, extras);
}

/** Tell the tracker which screen is showing; closes out the previous screen's timer. */
export function setActivePage(path: string) {
  if (!started) return;
  lastKnownPage = path;
  if (activePage === path) return;
  flushPage(false);
  activePage = path;
  activePageSince = Date.now();
}

const PAGE_LABELS: Record<string, string> = {
  chart: "/chart",
  records: "/patient-records",
  review: "/patient-records/review",
  edit: "/chart/edit",
};
export const pagePathForView = (view: string) => PAGE_LABELS[view] ?? `/${view}`;

/* ------------------------------------------------------------------ */
/* Service instrumentation                                             */
/* ------------------------------------------------------------------ */

type AnyFn = (...args: any[]) => any;

/** Wraps obj[key] so `onSuccess` runs after the original resolves; failures pass through untouched. */
function after(obj: Record<string, any> | undefined, key: string, onSuccess: (args: any[], result: any) => void) {
  const original = obj?.[key] as AnyFn | undefined;
  if (!obj || typeof original !== "function") return;
  obj[key] = async (...args: any[]) => {
    const result = await original.apply(obj, args);
    try { onSuccess(args, result); } catch { /* tracking must not affect the caller */ }
    return result;
  };
}

function instrumentServices() {
  const w = window as unknown as Record<string, Record<string, any> | undefined>;

  after(w.dentalPatients, "create", () => {
    logActivity("patient_created", "Created a patient record");
  });

  after(w.dentalCharts, "saveEntry", ([, entry]) => {
    const updated = Boolean(entry?.id && uuidPattern.test(String(entry.id)));
    logActivity(
      updated ? "chart_entry_updated" : "chart_entry_saved",
      `${updated ? "Updated" : "Saved"} chart entry: tooth ${entry?.toothNumber}, ${entry?.treatment} (${entry?.layer ?? "existing"})`,
    );
  });
  after(w.dentalCharts, "deleteEntry", () => {
    logActivity("chart_entry_deleted", "Deleted a chart entry");
  });
  after(w.dentalCharts, "deleteEntries", ([, ids]) => {
    const count = Array.isArray(ids) ? ids.length : 0;
    if (count) logActivity("chart_entries_deleted", `Deleted ${count} chart entr${count === 1 ? "y" : "ies"}`);
  });

  after(w.dentalMaterials, "save", ([materials]) => {
    const count = Array.isArray(materials) ? materials.length : 0;
    logActivity("treatment_materials_saved", `Saved treatment materials (${count} in list)`);
  });
}

function instrumentDom() {
  // The download buttons live in the legacy (non-React) markup and are also
  // clicked programmatically by the record-review toolbar, so one delegated
  // listener covers every path.
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (target?.closest?.("#download-pdf-btn")) {
      logActivity("chart_pdf_downloaded", "Downloaded the dental chart as PDF");
    } else if (target?.closest?.("#download-chart-image-btn")) {
      logActivity("chart_image_downloaded", "Downloaded the dental chart as an image");
    }
  }, true);

  document.addEventListener("dental-chart:finish-visit", () => {
    logActivity("visit_finished", "Finished a patient visit");
  });
  document.addEventListener("dental-chart:open-record", () => {
    logActivity("patient_record_opened", "Opened a saved patient record");
  });
}

/** Call once at startup, after window.dental* services are attached. */
export function startActivityTracking() {
  if (started) return;
  started = true;
  sessionSince = Date.now();

  // Resolve who's logged in up front so pagehide (which can't await) has an actor.
  void getActor().then((actor) => {
    if (actor) logActivity("session_start", "Opened Dental Charting");
  });

  instrumentServices();
  instrumentDom();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushPage(true);
    } else if (!activePage && lastKnownPage && !sessionEnded) {
      // Tab is back — resume timing the screen the user is still on.
      activePage = lastKnownPage;
      activePageSince = Date.now();
    }
  });

  window.addEventListener("pagehide", () => {
    flushPage(true);
    if (sessionEnded) return;
    sessionEnded = true;
    const seconds = Math.round((Date.now() - sessionSince) / 1000);
    logActivityNow("session_end", `Closed Dental Charting after ${seconds}s`, { sessionDurationSeconds: seconds });
  });
}
