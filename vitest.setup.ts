import { expect } from 'vitest';
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// @ts-expect-error Custom matcher from jest-axe
expect.extend({ toHaveNoViolations });

// Ensure jsdom test environment when using Vitest programmatically
// Vitest CLI can also be configured via vite config, but we set env here for safety
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.VITEST_SETUP_ENV = 'jsdom';

// Basic document semantics for axe in tests
if (typeof document !== 'undefined') {
	document.documentElement.lang = document.documentElement.lang || 'en';
	if (!document.title) {
		document.title = 'Accessible Game Platform';
	}
}
