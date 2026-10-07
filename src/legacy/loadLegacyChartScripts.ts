/** Preserve classic-script globals while loading dependencies in a fixed order. */
export async function loadLegacyChartScripts() {
  for (const path of [
    "js/tooth-silhouettes.js",
    "js/inner-anatomy.js",
    "js/materials.js?v=9",
    "js/app.js?v=108",
    "js/supabaseSync.js?v=12",
  ]) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${import.meta.env.BASE_URL}${path}`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${path}`));
      document.body.appendChild(script);
    });
  }
}
