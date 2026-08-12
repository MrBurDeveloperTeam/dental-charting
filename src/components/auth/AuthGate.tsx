import { useCallback, useEffect, useState, type ReactNode } from "react";

const SNABBB_APP_URL = "https://app.snabbb.com";
const VERIFY_URL = `${SNABBB_APP_URL}/api/verify-token`;

type AuthState = "checking" | "authenticated" | "unauthenticated" | "error";

export function AuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("checking");

  const verifySession = useCallback(async () => {
    setAuthState("checking");

    try {
      const response = await fetch(VERIFY_URL, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401 || response.status === 403) {
        setAuthState("unauthenticated");
        return;
      }

      if (!response.ok) {
        setAuthState("error");
        return;
      }

      const data = await response.json();
      setAuthState(data?.loggedIn === true ? "authenticated" : "unauthenticated");
    } catch {
      setAuthState("error");
    }
  }, []);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  const isChecking = authState === "checking";
  const isError = authState === "error";

  return (
    <>
      {children}
      {authState !== "authenticated" && (
        <main className="auth-gate" aria-busy={isChecking}>
          <section className="auth-gate-dialog" role={isChecking ? "status" : "alertdialog"} aria-modal={!isChecking}>
            <div className="auth-gate-icon" aria-hidden="true">{isChecking ? "…" : "🔒"}</div>
            <h1>{isChecking ? "Checking your session" : isError ? "Unable to verify your session" : "Login required"}</h1>
            <p>
              {isChecking
                ? "Please wait while we confirm your Snabbb account."
                : isError
                  ? "We could not connect to Snabbb to verify your login. Please try again."
                  : "You are not logged in. Please log in to the main Snabbb app to access Dental Charting."}
            </p>
            {!isChecking && (
              <div className="auth-gate-actions">
                {isError && <button className="btn secondary" type="button" onClick={() => void verifySession()}>Retry</button>}
                <button className="btn primary" type="button" onClick={() => { window.location.href = `${SNABBB_APP_URL}/login`; }}>
                  Go to Snabbb Login
                </button>
              </div>
            )}
          </section>
        </main>
      )}
    </>
  );
}
