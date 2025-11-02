# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tabletop Playground (TTPG) mod for the board game "Arcs" (Base Game, Leaders and Lore, and Campaign). It's built using TypeScript with JSX support for UI components via the `jsx-in-ttpg` library. The mod is published on mod.io as an unofficial implementation.

## Build System

The project uses `ttpg-scripts` for build tooling and Yarn for package management.

**Common Commands:**
- `yarn install` - Install dependencies
- `yarn setup` - Initial setup; prompts for TTPG packages path (e.g., `/Users/username/Library/Application Support/Epic/TabletopPlayground/Packages`)
- `yarn watch` - Development mode with automatic rebuilding
- `yarn dev` - Run development server
- `yarn build` - Production build (runs prebuild steps first)
- `yarn lint` - Type check and lint (runs `tsc --noEmit` and `eslint src`)
- `yarn clean` - Clean build artifacts
- `yarn reset` - Reset build state
- `yarn purge` - Complete cleanup

**Pre-build Steps:**
- `yarn build:cards` - Updates card data from external source (runs `assets/update.ts`)
- `yarn build:states` - Processes game state files through quantize, check, and filter scripts

## Architecture

### Global Setup and Extensions

`src/global.ts` is the entry point that:
- Sets up global error handlers and Sentry integration
- Initializes zones and player slot management
- Registers global event handlers for screenshots, meeples, rules chat, and overlay syncing
- Extends TTPG API classes with custom methods:
  - `GameWorld`: `getObjectsByTemplateName()`, `getObjectByTemplateName()`, `getSlots()`, `isOn()`, `isOnMap()`, `isOnTable()`
  - `Card`: `flip()`
  - `Color`: `saturate()`, `lighten()`
- Defines custom global events: `onActionsDealt`, `onActionsDiscarded`, `onInitiativeMoved`, `onAmbitionDeclared`, `onAmbitionShouldTally`, `onAmbitionTallied`, `onRoundStarted`, `onRoundEnded`, `onChapterEnded`

### Component Structure

The codebase follows a component-based architecture where each game piece is a separate module:

**Core Game Components:**
- `src/map-board.tsx` - Main game board with ambition tracking and zone management
- `src/action-deck.tsx` - Action card deck with custom dealing and shuffling behavior
- `src/player-board.ts` - Individual player boards
- `src/court.tsx` - Court card management
- `src/dice-tray.tsx` - Dice rolling interface

**Game Pieces:**
- `src/ship.ts`, `src/resource.ts`, `src/building-tile.ts` - Physical game pieces
- `src/ambition-marker.ts`, `src/power-marker.ts`, `src/initiative-marker.ts` - Game state markers
- `src/first-regent-tile.ts`, `src/set-tile.ts` - Special tiles

**Card Decks:**
- `src/setup-deck.tsx`, `src/leader-deck.tsx`, `src/lore-deck.tsx`, `src/campaign-fate-card.tsx`, `src/chapter.tsx`, `src/blight-deck.ts` - Various card deck implementations

### Library Utilities

`src/lib/` contains shared utilities:
- `setup.ts` - Game setup helpers (shuffledSlots, coordinate helpers)
- `triggerable-multicast-delegate.ts` - Event system implementation
- `overlay.ts` - Overlay sync functionality with external display
- `screenshots.ts` - Screenshot capture via chat commands
- `rules-chat.ts` - Rules question handling
- `meeples.ts` - Meeple management
- `ai.ts` - AI player support
- `ambition-section.tsx` - Ambition UI component
- `tally.tsx` - Score tallying UI
- `color.ts` - Color conversion utilities (HSL/RGB)
- `local-snaps.ts` - Snap point management
- `discard-to-origin.ts` - Card discard behavior
- `pdfs.ts` - PDF handling

### JSX and UI

The project uses JSX for UI components with custom pragma:
- `jsxFactory: "jsxInTTPG"`
- `jsxFragmentFactory: "jsxFrag"`

UI components use `jsx-in-ttpg` library's `render()` and hooks like `useRef()`.

### Testing

Tests are located in `src/tests/` with a custom test framework:
- `suite.ts` - Test runner with `describe()`, `test()`, `beforeEach()`, `afterEach()`, `skip()`
- `assert.ts` - Custom assertions
- Tests can be triggered in-game using script buttons (triple-press buttons 9 or 10)
- Individual test files follow pattern `*.test.ts`

### Asset Processing

`assets/` contains scripts for preprocessing game assets:
- `update.ts` - Fetches and processes card data from external YAML sources
- `States/quantize.ts` - Processes game state files (sorts objects, rounds coordinates)
- `States/check.ts`, `States/filter.ts` - Additional state validation and filtering

## Development Workflow

1. Make code changes in `src/`
2. `yarn watch` automatically rebuilds and updates the TTPG package
3. Open Tabletop Playground Editor and load the "Arcs (dev)" package
4. Test changes in-game
5. Run `yarn lint` before committing

## TypeScript Configuration

- Target: ES2022
- Module: CommonJS (TTPG requirement)
- JSX: React with custom pragma
- Strict mode enabled
- Output: `./build`

## Key Patterns

- **Object References**: Components use `refObject` or `refCard` from TTPG API to reference the game object they're attached to
- **Event System**: Custom `TriggerableMulticastDelegate` provides advanced event handling beyond TTPG's built-in events
- **Template Names**: Objects are identified by template names (e.g., "map", "board", "ship") for querying
- **Zones**: Dynamic zones created with IDs like `zone-{purpose}-{objectId}` for spatial queries
- **Saved Data**: Components persist state using `.setSavedData()` and `.getSavedData()`

## Coding Style

**Philosophy**: This is a single-author codebase that values brevity, cleverness, and convention over verbosity. Code should be short and concise. Prefer implicit understanding through established patterns over explicit documentation. Trust that idiomatic TypeScript and functional patterns communicate intent. Leverage language features and conventions to write dense, expressive code rather than explanatory prose.

### Import Organization

- **Type imports separated**: Use `import type` for type-only imports (enforced by ESLint rule `@typescript-eslint/consistent-type-imports`)
- **Import sorting**: Imports are automatically sorted using `@ianvs/prettier-plugin-sort-imports`
- **API aliasing pattern**: TTPG API references are aliased with underscore prefix then reassigned:
  ```typescript
  import { refObject as _refObject } from "@tabletop-playground/api";
  const refObject = _refObject;
  ```

### Naming Conventions

- **Variables and functions**: camelCase (e.g., `updateAmbitions`, `zone`, `refObject`)
- **Types and interfaces**: PascalCase (e.g., `GameData`, `CourtZone`, `Ambition`)
- **Constants**: Regular camelCase, not SCREAMING_SNAKE_CASE (e.g., `captivePercent`, `courtZoneHeight`)
- **Short names in callbacks**: Single letters or abbreviations are common (e.g., `d` for data/object, `p` for position, `i` for index, `s` for snap point)
- **Descriptive function names**: Use clear verbs (e.g., `maybeRotateCard`, `canSecureCard`, `tallyAgents`)

### TypeScript Usage

- **Strict mode enabled**: All strict TypeScript checks are on
- **Explicit type annotations**: Parameters and return types are explicitly typed
- **Type predicates**: Use for type guards (e.g., `isCourtCard(object): object is Card`)
- **`as const` assertions**: For literal arrays that should be readonly tuples
- **Module augmentation**: Extend TTPG API types using `declare module` pattern
- **Type intersection**: Extend types inline (e.g., `CourtZone = Zone & { widget?: VerticalBox }`)
- **Const parameters**: Tuple types for coordinate arrays (e.g., `type N = [number, number, number]`)

### Function Style

- **Top-level functions**: Use function declarations (enables hoisting)
- **Callbacks**: Use arrow functions (e.g., `obj.onGrab.add((obj) => ...)`)
- **Inline event handlers**: Define named functions in module scope, attach to events
- **Implicit returns**: Arrow functions use implicit returns where appropriate
- **Destructuring**: Common in function parameters and assignments

### Code Organization

- **Module-level setup**: Side effects happen at module scope (event registration, zone creation)
- **No classes**: Prefer functional approach with module-scoped state
- **Cleanup registration**: Always register cleanup handlers immediately after resource creation:
  ```typescript
  refObject.onDestroyed.add(() => zone.destroy());
  ```
- **Related code grouping**: Use section comments to separate logical blocks (e.g., `// Board zone`, `// Captives zone`)
- **WeakMap/WeakSet for associations**: Track object relationships without preventing garbage collection

### Comments

- **Sparse and purposeful**: Only comment non-obvious logic
- **Section headers**: Single-line comments to separate major sections
- **Implementation notes**: Explain "why" not "what" (e.g., `// Bug workaround: make sure card is intersecting zone`)
- **No JSDoc**: Don't use JSDoc comments; TypeScript types provide documentation

### Formatting

- **Semicolons**: Always use semicolons (enforced by prettier)
- **2-space indentation**: Standard prettier default
- **Single quotes**: For strings (prettier default)
- **Trailing commas**: In multiline structures (prettier default)
- **Optional chaining**: Use `?.` extensively (e.g., `zone?.getOverlappingObjects()`)
- **Nullish coalescing**: Use `??` for default values (e.g., `world.getZoneById(id) ?? world.createZone(p)`)
- **Ternary operators**: For simple conditionals (may chain for multiple conditions)

### Control Flow

- **Array methods over loops**: Prefer `map`, `filter`, `find`, `some`, `every` over `for` loops
- **Early returns**: Use guard clauses to reduce nesting
- **Switch statements**: Use for multi-case logic with fall-through where appropriate (mark with `// eslint-disable-next-line no-fallthrough`)
- **`process.nextTick()`**: For deferred execution when object IDs aren't ready yet

### Patterns and Idioms

- **ID patterns**: Follow consistent naming: `zone-{purpose}-{objectId}`, template names as identifiers
- **Object registration**: Use WeakSet to track whether objects have had handlers attached
- **Zone creation idiom**: `world.getZoneById(id) ?? world.createZone(position)`
- **Template matching**: Regex for card types (e.g., `/^(bc|cc|lore|f\d+)$/`)
- **Vector operations**: Chain vector operations (e.g., `obj.getPosition().add([0, 0, 1])`)
- **Slot-based player tracking**: Use player slots (0-3) as indices for arrays
- **Math for conditionals**: Use `Math.max()` / `Math.min()` to simplify conditional index logic (e.g., `array[Math.max(index, 0)]` instead of ternary)

### ESLint Configuration

Enforced rules:
- `@typescript-eslint/consistent-type-imports`: Error
- `@typescript-eslint/no-unused-vars`: Error (except `jsxFrag`, `jsxInTTPG`, and `_`-prefixed args)
- `no-sparse-arrays`: Off (allows `[, value1, value2]` syntax)

### JSX Style

- **Lowercase tags**: Built-in components are lowercase (e.g., `<verticalbox>`, `<text>`)
- **PascalCase custom components**: Custom components use PascalCase (e.g., `<Tally>`, `<AmbitionSection>`)
- **Self-closing tags**: Use for elements without children
- **Inline props**: Keep props on same line unless many props exist
