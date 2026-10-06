import { toBlob } from "html-to-image";

let captureQueue: Promise<unknown> = Promise.resolve();

export function chartToBlob(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const capture = captureQueue.then(() => captureDesktopChart(node, options));
  captureQueue = capture.catch(() => undefined);
  return capture;
}

async function captureDesktopChart(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  // A separate viewport evaluates desktop media queries even on an iPhone.
  // Never resize or restyle the live chart while an export is being prepared.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1440px;height:1600px;border:0;pointer-events:none";
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    const view = frame.contentWindow!;
    const base = doc.createElement("base");
    base.href = document.baseURI;
    doc.head.appendChild(base);
    const styles = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]'));
    await Promise.all(styles.map(style => new Promise<void>((resolve, reject) => {
      const copy = style.cloneNode(true) as HTMLElement;
      if (copy.tagName === "LINK") {
        copy.onload = () => resolve();
        copy.onerror = () => reject(new Error("Export stylesheet could not be loaded."));
      }
      doc.head.appendChild(copy);
      if (copy.tagName !== "LINK") resolve();
    })));
    doc.body.className = "saved-entries-collapsed";
    const chart = node.cloneNode(true) as HTMLElement;
    chart.style.width = "1100px";
    chart.style.minWidth = "1100px";
    chart.style.maxWidth = "none";
    doc.body.appendChild(chart);
    await doc.fonts.ready;
    await new Promise<void>(resolve => view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve())));
    // These annotations carry measured inline positions from the live viewport.
    const positionMarkers = (window as Window & { positionSpacingMarkers?: (root: HTMLElement) => void }).positionSpacingMarkers;
    positionMarkers?.(chart);
    const properties = Array.from(view.getComputedStyle(doc.documentElement))
      .filter(property => property !== "font-size");
    // Safari may need a warm-up pass for embedded SVGs and fonts.
    const captureOptions = { ...options, pixelRatio: 2, includeStyleProperties: [...properties, "font"] };
    await toBlob(chart, captureOptions);
    return await toBlob(chart, captureOptions);
  } finally {
    frame.remove();
  }
}
