// src/utils/modalNavigation.ts

type ModalCloseHandler = () => void;

interface ModalStackItem {
  id: string;
  onClose: ModalCloseHandler;
  closedByPopState: boolean;
}

const modalStack: ModalStackItem[] = [];
let isProgrammaticBack = false;

/**
 * Updates document.body style to prevent background scrolling when any modal is open
 */
function syncBodyScrollLock() {
  if (typeof document === 'undefined') return;

  if (modalStack.length > 0) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'pan-x pan-y';
  } else {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

/**
 * Register a modal into the history navigation stack.
 * Returns an unregister cleanup function.
 */
export function registerModal(id: string, onClose: ModalCloseHandler): () => void {
  // Push state to browser history
  const stateData = { isModalOpen: true, modalId: id, timestamp: Date.now() };
  window.history.pushState(stateData, '');

  const item: ModalStackItem = {
    id,
    onClose,
    closedByPopState: false,
  };
  modalStack.push(item);
  syncBodyScrollLock();

  let isCleanedUp = false;

  return () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    const idx = modalStack.findIndex((m) => m === item || m.id === id);
    const wasClosedByPopState = item.closedByPopState;

    if (idx !== -1) {
      modalStack.splice(idx, 1);
    }
    syncBodyScrollLock();

    // If closed programmatically (e.g. click "X" or "Selesai & Tutup" button),
    // revert the pushed history entry so browser history doesn't pile up.
    if (!wasClosedByPopState) {
      isProgrammaticBack = true;
      try {
        window.history.back();
      } catch (e) {
        isProgrammaticBack = false;
      }
    }
  };
}

/**
 * Intercepts popstate from mobile/browser back button.
 * Returns true if a modal handled the back action, preventing navigation/exit.
 */
export function handleModalPopState(): boolean {
  if (isProgrammaticBack) {
    isProgrammaticBack = false;
    return true;
  }

  if (modalStack.length === 0) {
    syncBodyScrollLock();
    return false;
  }

  // Pop the topmost active modal
  const topModal = modalStack.pop();
  syncBodyScrollLock();

  if (topModal) {
    topModal.closedByPopState = true;
    try {
      topModal.onClose();
    } catch (err) {
      console.error('Error closing modal on popstate:', err);
    }
    return true;
  }

  return false;
}

/**
 * React hook to register modal back button and body scroll lock
 */
import { useEffect, useRef } from 'react';

export function useModalNavigation(id: string, isOpen: boolean, onClose: ModalCloseHandler) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerModal(id, () => {
      onCloseRef.current();
    });

    return () => {
      unregister();
    };
  }, [id, isOpen]);
}
