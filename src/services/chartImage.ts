import { toBlob, toSvg } from "html-to-image";

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
// Width of #split-stage in the existing collapsed desktop layout at 1680px.
const EXPORT_CHART_WIDTH = 726;
async function captureMobileChart(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  const wait = async <T>(operation: Promise<T>, stage: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([operation, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Mobile chart export timed out while ${stage}. Please try again.`)), 30000);
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
    await wait(Promise.all(styles), "loading styles");
    await wait(doc.fonts.ready, "loading fonts");
    const chart = doc.getElementById(node.id)!;
    if (!chart) throw new Error("Export chart was not found.");
    chart.style.width = `${EXPORT_CHART_WIDTH}px`;
    chart.style.minWidth = `${EXPORT_CHART_WIDTH}px`;
    chart.style.maxWidth = `${EXPORT_CHART_WIDTH}px`;
    await inlineMobileChartImages(chart);
    await wait(Promise.all(Array.from(chart.querySelectorAll("img")).map(image => image.decode())), "loading tooth images");
    (window as Window & { positionSpacingMarkers?: (root: HTMLElement) => void }).positionSpacingMarkers?.(chart);
    const properties = Array.from(frame.contentWindow!.getComputedStyle(doc.documentElement)).filter(property => property !== "font-size");
    const height = chart.offsetHeight;
    if (!height) throw new Error("The export chart has no visible layout.");
    const captureOptions = { ...options, width: EXPORT_CHART_WIDTH, height, pixelRatio: 2, includeStyleProperties: [...properties, "font"] };
    const svg = await wait(toSvg(chart, captureOptions), "preparing chart artwork");
    // html-to-image's toBlob waits for requestAnimationFrame after image decode.
    // Opening Safari's PDF tab backgrounds the source tab, where that callback
    // may be suspended indefinitely. Rasterize without a foreground-frame wait.
    return await wait(rasterizeMobileChart(svg, EXPORT_CHART_WIDTH, height), "creating the PNG");
  } finally {
    frame.remove();
  }
}

async function inlineMobileChartImages(chart: HTMLElement): Promise<void> {
  const images = Array.from(chart.querySelectorAll<HTMLImageElement | SVGImageElement>("img,svg image"));
  const resources = new Map<string, typeof images>();
  for (const image of images) {
    const source = image.tagName.toLowerCase() === "img"
      ? (image as HTMLImageElement).currentSrc || image.getAttribute("src")
      : image.getAttribute("href") || image.getAttribute("xlink:href");
    if (!source || source.startsWith("data:")) continue;
    const url = new URL(source, chart.ownerDocument.baseURI).href;
    resources.set(url, [...(resources.get(url) || []), image]);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const jobs = Array.from(resources);
  const worker = async () => {
    while (jobs.length) {
      const [url, targets] = jobs.shift()!;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Tooth artwork request failed (${response.status}).`);
      const blob = await response.blob();
      if (!blob.size) throw new Error("A tooth artwork file was empty.");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("A tooth artwork file could not be read."));
        reader.readAsDataURL(blob);
      });
      for (const image of targets) {
        if (image.tagName.toLowerCase() === "img") {
          image.removeAttribute("srcset");
          image.setAttribute("src", data);
        } else {
          image.setAttribute("href", data);
          image.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
        }
      }
    }
  };
  try {
    // Limit concurrent requests on phones and reuse each asset across arches.
    // html-to-image skips its detached SVG-image load wait for data URLs.
    await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
  } catch (error) {
    controller.abort();
    throw new Error(`Could not embed tooth artwork: ${error instanceof Error ? error.message : String(error)}`);
  } finally { clearTimeout(timeout); }
}

async function rasterizeMobileChart(svg: string, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The chart image canvas could not be created.");
  const load = () => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The chart SVG could not be loaded."));
    image.src = svg;
  });
  try {
    // Preserve the existing Safari warm-up pass, without re-cloning the chart.
    context.drawImage(await load(), 0, 0, canvas.width, canvas.height);
    const image = await load();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
      if (blob?.size) resolve(blob);
      else reject(new Error("The chart image canvas returned an empty PNG."));
    }, "image/png"));
  } finally {
    canvas.width = canvas.height = 0;
  }
}
