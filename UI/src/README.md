# TypeScript Source Files

This directory contains the TypeScript source files for the custom UI.

## File Structure

- `script.ts` - Main TypeScript file with UI logic and GSAP animations

## Development

### Editing TypeScript

1. Edit `script.ts` with full TypeScript type safety
2. GSAP is imported and available - use it for animations
3. The file is automatically compiled and bundled when you save (if watch mode is running)

### Building

```bash
# One-time build
npm run build:js

# Watch mode (auto-rebuild on save)
npm run build:js:watch
```

### GSAP Usage

GSAP is already imported and ready to use:

```typescript
import { gsap } from "gsap";

// Simple animation
gsap.to(element, { x: 100, duration: 1 });

// Timeline
const tl = gsap.timeline();
tl.to(element1, { opacity: 0 })
  .to(element2, { opacity: 1 });
```

### Type Definitions

The project includes:
- DOM types (built-in)
- GSAP types (from the GSAP package)
- Custom TTS message interfaces

### Output

The compiled and bundled JavaScript is output to `../script.js` and includes:
- All your TypeScript code
- GSAP library (bundled)
- Everything needed to run in TTS

No need to include GSAP separately in HTML - it's all bundled!

