/**
 * Print with a meaningful document title.
 *
 * Browsers stamp the tab title + URL + date on every printed page
 * (Chrome: "Headers and footers"). We can't switch that off from code,
 * so at least the stamped title says what the paper is —
 * "Fee Receipt - R-1023" instead of "School Management Software".
 * Title is restored right after the print dialog opens.
 */
export function printWithTitle(title: string): void {
  const prev = document.title
  document.title = title
  window.print()
  window.setTimeout(() => {
    document.title = prev
  }, 500)
}
