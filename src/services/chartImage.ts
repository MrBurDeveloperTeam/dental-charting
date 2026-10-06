import { toBlob } from "html-to-image";

let captureQueue: Promise<unknown> = Promise.resolve();

export function chartToBlob(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const capture = captureQueue.then(() => captureCollapsedChart(node, options));
  captureQueue = capture.catch(() => undefined);
  return capture;
}

async function captureCollapsedChart(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const body = document.body;
  const panel = document.querySelector(".chart-workspace > .entries-panel");
  const bodyCollapsed = body.classList.contains("saved-entries-collapsed");
  const panelCollapsed = panel?.classList.contains("is-collapsed") ?? false;
  // Both PNG and PDF use the wider chart layout, independent of the entry panel.
  // Do not change the saved preference or the toggle's accessibility state.
  body.classList.add("saved-entries-collapsed");
  panel?.classList.add("is-collapsed");
  try {
  // Let pending live-chart layout callbacks finish before taking the snapshot.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  // Copy the exact computed font shorthand. The library rounds font-size down
  // when copying it separately, which changes small badges and tooth numbers.
  const properties = Array.from(getComputedStyle(document.documentElement))
    .filter(property => property !== "font-size");
  return await toBlob(node, {
    ...options,
    includeStyleProperties: [...properties, "font"],
  });
  } finally {
    body.classList.toggle("saved-entries-collapsed", bodyCollapsed);
    panel?.classList.toggle("is-collapsed", panelCollapsed);
  }
}
