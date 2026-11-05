import { Modal } from '@mantine/core';
import type { ReactNode } from 'react';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * App-wide modal. Thin adapter over Mantine's Modal, which provides the accessibility behaviour
 * (role=dialog, labelled by title, focus trap, Escape, focus restore, scroll lock) so features stay UI-library agnostic.
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  return (
    <Modal opened onClose={onClose} title={title} centered size="md" trapFocus returnFocus closeOnEscape>
      {children}
    </Modal>
  );
}
