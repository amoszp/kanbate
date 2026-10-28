/**
 * Blocks pinch-zoom.
 *
 * iOS Safari and iOS home-screen PWAs ignore `user-scalable=no` /
 * `maximum-scale` in the viewport meta, so pinch has to be stopped in JS:
 * - WebKit `gesture*` events fire for pinch/rotate; cancelling them stops the zoom.
 * - A `touchmove` with more than one finger (or a scale != 1) is a pinch on
 *   other engines; one-finger moves are left alone, so scrolling and dragging
 *   keep working.
 * Double-tap zoom is handled in CSS (`touch-action: manipulation`), and
 * focus-zoom by keeping form fields at 16px on touch screens (index.css).
 * Ctrl+wheel / Ctrl+plus on desktop are browser-level and deliberately untouched.
 */
let installed = false;

export function installZoomGuard(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const cancel = (e: Event) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, cancel, { passive: false });
  }

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      const scale = (e as TouchEvent & { scale?: number }).scale;
      if (e.touches.length > 1 || (scale !== undefined && scale !== 1)) e.preventDefault();
    },
    { passive: false }
  );
}
