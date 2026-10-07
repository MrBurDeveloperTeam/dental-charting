import { toBlob } from "html-to-image";

let captureQueue: Promise<unknown> = Promise.resolve();

export function chartToBlob(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const capture = captureQueue.then(() => captureChartTab(node, options));
  captureQueue = capture.catch(() => undefined);
  return capture;
}

async function captureChartTab(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const nav = window.navigator;
  const mobile = /Android|iPhone|iPad|iPod/i.test(nav?.userAgent || "") ||
    (nav?.platform === "MacIntel" && nav.maxTouchPoints > 1) ||
    window.matchMedia?.("(max-width: 600px)").matches;
  if (mobile) return captureMobileChart(node, options);
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

// Render the existing desktop CSS in its own viewport. A wide wrapper in the
// mobile document would still inherit mobile media queries and tooth sizes.
const EXPORT_VIEWPORT_WIDTH = 1680;
async function captureMobileChart(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const wait = async <T>(operation: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([operation, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Mobile chart export timed out. Please try again.")), 30000);
      })]);
    } finally { clearTimeout(timer!); }
  };
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${EXPORT_VIEWPORT_WIDTH}px;height:1600px;border:0;pointer-events:none`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    const base = doc.createElement("base");
    base.href = document.baseURI;
    doc.head.appendChild(base);
    const styles = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]')).map(source => {
      const copy = source.cloneNode(true) as HTMLElement;
      const loaded = source.tagName === "LINK" ? new Promise<void>((resolve, reject) => {
        copy.onload = () => resolve();
        copy.onerror = () => reject(new Error("Export stylesheet failed to load."));
      }) : Promise.resolve();
      doc.head.appendChild(copy);
      return loaded;
    });
    // Clone ancestors as well so the existing desktop grid determines geometry.
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelectorAll("iframe,script").forEach(item => item.remove());
    body.classList.remove("patient-record-review");
    body.classList.add("saved-entries-collapsed");
    body.querySelector(".chart-workspace > .entries-panel")?.classList.add("is-collapsed");
    doc.body.replaceWith(body);
    await wait(Promise.all(styles));
    await wait(doc.fonts.ready);
    const chart = doc.getElementById(node.id)!;
    if (!chart) throw new Error("Export chart was not found.");
    await wait(Promise.all(Array.from(chart.querySelectorAll("img")).map(image => image.decode())));
    (window as Window & { positionSpacingMarkers?: (root: HTMLElement) => void }).positionSpacingMarkers?.(chart);
    const properties = Array.from(frame.contentWindow!.getComputedStyle(doc.documentElement)).filter(property => property !== "font-size");
    const captureOptions = { ...options, pixelRatio: 2, includeStyleProperties: [...properties, "font"] };
    await wait(toBlob(chart, captureOptions));
    return await wait(toBlob(chart, captureOptions));
  } finally {
    frame.remove();
  }
}
