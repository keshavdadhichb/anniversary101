'use client';

export const triggerSync = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sheet-sync'));
  }
};
