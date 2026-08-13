// Adds jest-dom matchers (toBeInTheDocument, toBeDisabled, …) to Vitest's expect.
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library auto-cleans only when Vitest globals are enabled. They are
// not (tests import describe/it/expect explicitly), so unmount by hand —
// otherwise each render stacks up and queries find duplicate elements.
afterEach(cleanup)
