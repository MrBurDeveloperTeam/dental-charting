import { useEffect } from "react";

/** Keeps the proven DOM chart engine active while sections move to React. */
export function LegacyChartBridge() {
  useEffect(() => {
    document.documentElement.dataset.reactMigration = "active";
    return () => { delete document.documentElement.dataset.reactMigration; };
  }, []);
  return null;
}
