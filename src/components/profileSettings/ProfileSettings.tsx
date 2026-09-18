import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";

const SNABBB_APP_URL = "https://app.snabbb.com";

type ProfileUser = {
  id?: string;
  partnerId?: string;
  email?: string;
  name?: string;
};

type Destination = "reward" | "channel" | "support" | "settings";

function readUser(payload: unknown): ProfileUser {
  const data = payload as Record<string, any> | null;
  const user = data?.user ?? data?.data?.user ?? data?.profile ?? data?.data ?? {};
  const profileUser = user?.profiles?.user ?? user?.profile ?? {};
  const metadata = profileUser?.user_metadata ?? user?.user_metadata ?? {};
  const firstAndLastName = [
    metadata.first_name ?? profileUser.first_name ?? user.first_name,
    metadata.last_name ?? profileUser.last_name ?? user.last_name,
  ].filter(Boolean).join(" ").trim();
  return {
    id: profileUser.user_id ?? profileUser.id ?? user.id ?? user.user_id ?? user.supabase_user_id,
    partnerId: String(user.partner_id?.[0] ?? user.partner_id ?? profileUser.partner_id?.[0] ?? profileUser.partner_id ?? "") || undefined,
    email: user.email ?? profileUser.email,
    name: firstAndLastName || metadata.full_name || metadata.name
      || profileUser.full_name || profileUser.name || user.full_name || user.name,
  };
}

function readActiveCompany() {
  try {
    const session = JSON.parse(localStorage.getItem("odoo_session") || "null");
    const companyCodes = session?.company_codes || {};
    const current = session?.user_companies?.current_company?.[0]
      ?? session?.user_companies?.current_company ?? session?.company_id ?? session?.current_company;
    const companyId = current && companyCodes[current]
      ? String(current)
      : Object.keys(companyCodes).sort((a, b) => Number(a) - Number(b))[0];
    if (!companyId) return { companyId: 2, companyCode: undefined };
    const rawCode = String(companyCodes[companyId] || "").toUpperCase();
    return { companyId: Number(companyId), companyCode: companyId === "4" ? "MID" : rawCode || undefined };
  } catch {
    return { companyId: 2, companyCode: undefined };
  }
}

function Icon({ type }: { type: Destination | "logout" }) {
  const paths = {
    reward: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/></>,
    channel: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m9 9 6 3-6 3Z"/></>,
    support: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m6.4 6.4 3.5 3.5m4.2 4.2 3.5 3.5m0-11.2-3.5 3.5m-4.2 4.2-3.5 3.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

export function ProfileSettings() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<ProfileUser>({});
  const [credits, setCredits] = useState<string>("Loading…");
  const [busy, setBusy] = useState<Destination | "logout" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${SNABBB_APP_URL}/api/verify-token`, { credentials: "include", headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setUser(readUser(payload)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !user.email) return;
    const controller = new AbortController();
    const company = readActiveCompany();
    const params = new URLSearchParams({ email: user.email });
    if (user.partnerId) params.set("partner_id", user.partnerId);
    if (company.companyCode) {
      params.set("website_scope", company.companyCode);
      params.set("website_domain", company.companyCode);
    }
    setCredits("Loading…");
    fetch(`/api/wallet?${params.toString()}`, {
      credentials: "include", headers: { Accept: "application/json" }, signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error();
        const value = result?.data?.snabbb_balance ?? result?.data?.balance
          ?? result?.result?.snabbb_balance ?? result?.result?.balance
          ?? result?.snabbb_balance ?? result?.balance;
        if (!Number.isFinite(Number(value))) throw new Error();
        setCredits(`${Number(value)} credits`);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.warn("[Wallet] Unable to load Snabbb Credit", error);
          setCredits("Balance unavailable");
        }
      });
    return () => controller.abort();
  }, [open, user.email, user.partnerId]);

  const createAppLink = async (app: string) => {
    const company = readActiveCompany();
    const response = await fetch(`${SNABBB_APP_URL}/api/v1/sso/userid`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json", Accept: "application/json",
        ...(company.companyCode ? { "X-Company-Code": company.companyCode, "X-Company-Id": String(company.companyId) } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0", method: "call",
        params: { app_code: app, email: user.email, name: user.name, company_id: company.companyId, portal: true }, id: 1,
      }),
    });
    if (!response.ok) throw new Error("Unable to open this page.");
    return response.json();
  };

  const goTo = async (destination: Destination) => {
    if (busy) return;
    setBusy(destination);
    try {
      if (destination === "support") {
        const response = await fetch(`${SNABBB_APP_URL}/api/ticketing/sso`, { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.redirectUrl) throw new Error();
        window.location.assign(result.redirectUrl);
        return;
      }
      const app = destination === "reward" ? "reward" : destination === "channel" ? "e-learning" : "snabbb";
      const result = await createAppLink(app);
      const id = result?.result?.supabase_user_id ?? result?.data?.result?.supabase_user_id ?? result?.supabase_user_id ?? user.id;
      const url = destination === "reward"
        ? "https://reward.snabbb.com"
        : destination === "channel"
          ? id ? `https://e-learning.snabbb.com/channel/${encodeURIComponent(id)}` : "https://e-learning.snabbb.com"
          : `${SNABBB_APP_URL}/profile-settings`;
      window.location.assign(url);
    } catch {
      window.alert("We couldn't open that page. Please try again.");
      setBusy(null);
    }
  };

  const logout = async () => {
    if (busy) return;
    setBusy("logout");
    try { await fetch(`${SNABBB_APP_URL}/api/logout`, { method: "POST", credentials: "include" }); } catch { /* best effort */ }
    try { await getSupabaseClient().auth.signOut(); } catch { /* SSO logout still redirects safely */ }
    window.location.href = SNABBB_APP_URL;
  };

  const items: Array<{ type: Destination; title: string; subtitle: string }> = [
    { type: "reward", title: "Snabbb Credit", subtitle: credits },
    { type: "channel", title: "My Channel", subtitle: "Manage your channel" },
    { type: "support", title: "Support Tickets", subtitle: "Create and track your support tickets" },
    { type: "settings", title: "Account Settings", subtitle: "Account & preferences" },
  ];

  return (
    <div className="profile-settings" ref={containerRef}>
      <button className="profile-settings-trigger" type="button" aria-label="Open profile settings" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20v-2a6.5 6.5 0 0 1 13 0v2"/></svg>
      </button>
      {open && (
        <section className="profile-settings-menu" role="menu" aria-label="Profile settings">
          <header className="profile-settings-info">
            <span>Profile info</span>
            <strong>{user.name || user.email?.split("@")[0] || "Your profile"}</strong>
            {user.email && <p><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM3 7l9 7 9-7"/></svg>{user.email}</p>}
          </header>
          <div className="profile-settings-items">
            {items.map((item) => (
              <button key={item.type} type="button" role="menuitem" disabled={busy !== null} onClick={() => void goTo(item.type)}>
                <i className={`profile-settings-item-icon ${item.type}`}><Icon type={item.type} /></i>
                <span><strong>{item.title}</strong><small>{busy === item.type ? "Opening…" : item.subtitle}</small></span>
                <b aria-hidden="true">›</b>
              </button>
            ))}
          </div>
          <footer><button type="button" role="menuitem" disabled={busy !== null} onClick={() => void logout()}><Icon type="logout" />{busy === "logout" ? "Logging out…" : "Log Out"}</button></footer>
        </section>
      )}
    </div>
  );
}
