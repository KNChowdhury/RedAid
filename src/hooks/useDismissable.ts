import { useEffect, useRef } from 'react';

/**
 * Makes an overlay behave the way people expect it to.
 *
 * While `isOpen` is true this hook:
 *  - closes on Escape
 *  - closes on the browser / Android hardware back button, instead of letting
 *    back navigate away from the app entirely
 *  - locks background scrolling so the page behind doesn't move
 *
 * It works by pushing one history entry when the overlay opens and restoring
 * the previous one when it closes, so the back stack stays balanced no
 * matter how the overlay was dismissed.
 *
 * `confirmDiscard`: pass a message while the overlay holds unsaved input.
 * Back / Escape / the returned `requestClose` then ask before closing, so a
 * stray mouse back-button or swipe doesn't silently throw away a half-filled
 * form. Pass null when there is nothing to lose.
 */
export function useDismissable(isOpen: boolean, onClose: () => void, confirmDiscard: string | null = null) {
  // Callers pass an inline `() => ...}` that's a new reference every render.
  // Keeping the latest one in a ref (instead of the effect below depending on
  // `onClose` directly) means an unrelated re-render while the overlay is
  // open can't retrigger this effect -- it would otherwise tear down and
  // re-push/pop the history entry, toggle body scroll lock, and re-add the
  // listeners on every render, not just on real open/close transitions.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const confirmRef = useRef(confirmDiscard);
  confirmRef.current = confirmDiscard;

  useEffect(() => {
    if (!isOpen) return;

    // Marker entry so "back" has something to pop other than the page itself.
    // The id is unique per open (not just a generic `overlay: true` flag) so
    // a sibling overlay's own marker can never be mistaken for ours.
    const previousState = window.history.state;
    const marker = { overlay: true, id: Math.random() };
    window.history.pushState(marker, '');
    let closedByBack = false;

    const onPopState = () => {
      const message = confirmRef.current;
      if (message && !window.confirm(message)) {
        // Stay open: the browser already popped our marker, so put it back
        // to keep the back stack balanced for the next back press.
        window.history.pushState(marker, '');
        return;
      }
      closedByBack = true;
      onCloseRef.current();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const message = confirmRef.current;
      if (message && !window.confirm(message)) return;
      onCloseRef.current();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;

      // Closed by a button (or Escape) rather than a physical back-navigation:
      // restore the entry that was current before we opened, so the user
      // doesn't need an extra back-tap to actually leave the page.
      //
      // This restores synchronously via replaceState rather than calling
      // history.back() -- back() is asynchronous, and if another overlay
      // opens in the very same render (e.g. a guest action closes this one
      // and opens the sign-in modal in one handler), that sibling's
      // synchronous pushState can land on top before our queued back() call
      // actually resolves. When it then fires, it pops the sibling's fresh
      // entry instead of ours, which fires the sibling's popstate listener
      // and closes it immediately after it opened. replaceState can't race
      // like this: it never queues a navigation or fires popstate, so
      // there's nothing for a sibling's pushState to land in front of.
      if (!closedByBack && window.history.state?.id === marker.id) {
        window.history.replaceState(previousState, '');
      }
    };
  }, [isOpen]);

  /** Close from a backdrop click etc., asking first if there is unsaved input. */
  return () => {
    const message = confirmRef.current;
    if (message && !window.confirm(message)) return;
    onCloseRef.current();
  };
}

/**
 * Click handler for a full-screen backdrop: closes only when the click landed
 * on the backdrop itself, not on the dialog sitting inside it.
 */
export function backdropClose(onClose: () => void) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
}
