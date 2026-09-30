import { toBlob } from "html-to-image";

export async function chartToBlob(node: HTMLElement, options: Parameters<typeof toBlob>[1]) {
  // Let pending live-chart layout callbacks finish before taking the snapshot.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  // Copy the exact computed font shorthand. The library rounds font-size down
  // when copying it separately, which changes small badges and tooth numbers.
  const properties = Array.from(getComputedStyle(document.documentElement))
    .filter(property => property !== "font-size");
  return toBlob(node, {
    ...options,
    includeStyleProperties: [...properties, "font"],
  });
}
