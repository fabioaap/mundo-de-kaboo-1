import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseModalA11yOptions {
  isOpen?: boolean;
  onClose: () => void;
}

/**
 * Keyboard/focus accessibility for modals: closes on Escape, traps Tab/Shift+Tab
 * focus inside the container while open, moves initial focus into the modal on
 * open, and restores focus to the previously-focused element on close.
 *
 * Attach the returned ref to the modal's outermost container element.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  isOpen = true,
  onClose,
}: UseModalA11yOptions) {
  const containerRef = useRef<T>(null);
  // Stable ref to onClose so the effect doesn't re-bind on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Move focus into the modal so keyboard/screen-reader users land inside it.
    const focusables = getFocusable();
    (focusables[0] ?? container)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        container?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container?.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return containerRef;
}
