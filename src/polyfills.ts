// Must run BEFORE any TON SDK module is evaluated.
// ES module imports are evaluated before the importing module's body, so the
// Buffer global has to be installed from a side-effect module that main.tsx
// imports first — otherwise @ton/core (e.g. Address.parse at module top level)
// runs while `Buffer` is still undefined and the whole app crashes.
import { Buffer } from 'buffer'

;(globalThis as unknown as { Buffer: typeof Buffer }).Buffer =
  (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer || Buffer
