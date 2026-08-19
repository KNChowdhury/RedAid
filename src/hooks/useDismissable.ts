import { useEffect } from 'react';

/**
 * Makes an overlay behave the way people expect it to.
 *
 * While `isOpen` is true this hook:
 *  - closes on Escape
 *  - closes on the browser / Android hardware back button, instead of letting
 *    back navigate away from the app entirely
 *  - locks background scrolling so the page behind doesn't move
 *
 * It works by pushing one history entry when the overlay opens and popping it
 * when the overlay closes, so the back stack stays balanced no matter how the
 * overlay was dismissed.
 */
export function useDismissable(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    // Marker entry so "back" has something to pop other than the page itself.
    window.history.pushState({ overlay: true }, '');
    let closedByBack = false;

    const onPopState = () => {
      closedByBack = true;
      onClose();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;

      // If the overlay was closed by a button rather than by "back", remove the
      // marker entry we added, otherwise the user would need two taps of back
      // to actually leave the page.
      if (!closedByBack && window.history.state?.overlay) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
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
