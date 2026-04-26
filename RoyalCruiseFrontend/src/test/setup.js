// Ez a fájl a Vitest környezet alapbeállításait és globális teszt-segédeit inicializálja.
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
if (typeof globalThis.afterEach === 'function') {
  // Csak akkor regisztraljuk a cleanup hookot, ha a teszt runner mar inicializalta az afterEach globalt.
  globalThis.afterEach(() => {
    cleanup();
  });
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

globalThis.localStorage = localStorageMock;

// Mock fetch
globalThis.fetch = vi.fn();
