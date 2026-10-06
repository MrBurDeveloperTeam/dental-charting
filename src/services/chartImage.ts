import { toBlob } from "html-to-image";

let captureQueue: Promise<unknown> = Promise.resolve();

export function chartToBlob(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const capture = captureQueue.then(() => captureChartTab(node, options));
  captureQueue = capture.catch(() => undefined);
  return capture;
}

async function captureChartTab(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const body = document.body;
  const panel = document.querySelector(".chart-workspace > .entries-panel");
  const wasReview = body.classList.contains("patient-record-review");
  const wasCollapsed = body.classList.contains("saved-entries-collapsed");
  const panelWasCollapsed = panel?.classList.contains("is-collapsed") ?? false;
  const positionMarkers = (window as Window & { positionSpacingMarkers?: (root: HTMLElement) => void }).positionSpacingMarkers;
  try {
    // Use the real Chart-tab container, including its responsive dimensions.
    // Safari's popup/save handling stays independent of chart geometry.
    body.classList.remove("patient-record-review");
    body.classList.add("saved-entries-collapsed");
    panel?.classList.add("is-collapsed");
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    positionMarkers?.(node);
    const properties = Array.from(getComputedStyle(document.documentElement))
      .filter(property => property !== "font-size");
    const captureOptions = { ...options, pixelRatio: 2, includeStyleProperties: [...properties, "font"] };
    // Retain the Safari SVG/font warm-up pass without substituting a new layout.
    await toBlob(node, captureOptions);
    return await toBlob(node, captureOptions);
  } finally {
    body.classList.toggle("patient-record-review", wasReview);
    body.classList.toggle("saved-entries-collapsed", wasCollapsed);
    panel?.classList.toggle("is-collapsed", panelWasCollapsed);
    positionMarkers?.(node);
  }
}
