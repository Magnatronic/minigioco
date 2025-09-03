# Accessible Game Platform - Agent Context

## PROJECT OVERVIEW
Building a web-based game compendium for adults (18-25) with severe physical and learning disabilities. Focus on motor skill and computer skill training through accessible, configurable games.

## TARGET USERS
- Adults 18-65 years old
- Severe physical disabilities (limited motor control)
- Learning disabilities (cognitive processing challenges) 
- Need large targets, simple interfaces, flexible timing

## CORE REQUIREMENTS
- React TypeScript with Vite
- Minimum 44px touch targets
- Large, clear fonts (18px+ base)
- High contrast mode support
- WCAG 2.1 AA compliance
- Joystick/mouse/keyboard navigation
- Local storage only (GDPR compliant)
- No time pressure or stress elements
- Simple, consistent UI patterns
- Generous hit detection and error tolerance
- 

## FIRST GAME: Target Collection
- Large moveable cursor (20-100px, configurable)
- Single target appears at a time (50-200px, configurable)
- Slow, predictable movement
- Clear success feedback
- Configurable colors, sizes, speeds
- No time limits

## TECHNICAL CONSTRAINTS
- No external APIs or data collection
- Local storage with clear consent
- Support Windows High Contrast Mode
- Gamepad/joystick API integration
- Screen reader compatibility

/**
 * GAME ARCHITECTURE REQUIREMENTS:
 * - All games must implement standard IGame interface
 * - Consistent configuration system across games
 * - Shared accessibility components and hooks
 * - Plugin-like game registration system
 * - Common game lifecycle (start/pause/reset/configure)
 * - Standardized scoring and progress tracking
 * - Shared input handling abstraction
 */

interface IGame {
  id: string;
  name: string;
  description: string;
  category: 'motor' | 'cognitive' | 'coordination';
  configSchema: GameConfigSchema;
  accessibilityFeatures: AccessibilityFeature[];
  
  // Lifecycle methods
  initialize(config: GameConfig): void;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  cleanup(): void;
  
  // State management
  getState(): GameState;
  updateConfig(config: Partial<GameConfig>): void;
}

## EXTENSIBILITY REQUIREMENTS

### Game Registration System
- Games auto-register themselves in a central registry
- Dynamic game loading without modifying core app
- Hot-swappable game modules for development

### Shared Component Library
- Reusable game canvas component
- Standard configuration panels
- Common accessibility controls (pause, reset, help)
- Shared UI elements (buttons, sliders, color pickers)

### Configuration System
- JSON schema-based game configuration
- Common settings (accessibility, input methods, theme)
- Game-specific settings inheritance
- Configuration presets and profiles

### Input Abstraction Layer
- Unified input handler for all games
- Support for mouse, keyboard, gamepad, switch control
- Input mapping and calibration shared across games
- Custom input method plugins

## EXTENSIBLE ARCHITECTURE REQUIREMENTS

### Core Principles
1. **Separation of Concerns**: Game logic, UI, accessibility, and configuration are separate layers
2. **Plugin Architecture**: New games drop into `/src/games/[GameName]/` folder
3. **Shared Resources**: Common assets, styles, and components in `/src/shared/`
4. **Configuration-Driven**: Game behavior controlled by declarative config objects
5. **Accessibility Inheritance**: New games automatically get accessibility features

### Required Abstractions
- **GameEngine**: Handles common game loop, timing, scoring
- **InputManager**: Abstracts all input methods across games  
- **ConfigManager**: Manages settings persistence and validation
- **AccessibilityManager**: Provides consistent a11y features
- **ThemeManager**: Handles high contrast, fonts, colors globally

### Game Integration Points
- Standard game metadata (name, description, category, difficulty)
- Configuration schema registration
- Accessibility checklist compliance
- Input method compatibility declaration
- Asset management (sounds, images, fonts)

### Development Workflow
- New games created with CLI tool/template
- Automatic accessibility testing integration
- Configuration validation on game registration
- Hot reload during development
- Build-time game discovery and bundling

src/
├── core/                    # Core platform code
│   ├── GameEngine.ts       # Base game engine
│   ├── InputManager.ts     # Input abstraction
│   ├── ConfigManager.ts    # Settings management
│   └── GameRegistry.ts     # Game registration
├── shared/                 # Shared resources
│   ├── components/         # Reusable UI components
│   ├── hooks/             # Common React hooks  
│   ├── styles/            # Global themes/styles
│   └── assets/            # Shared images/sounds
├── games/                 # Individual games
│   ├── TargetCollection/  # Your first game
│   ├── MemoryMatch/      # Future game
│   └── ReactionTime/     # Future game
├── accessibility/         # A11y utilities
├── types/                # TypeScript definitions
└── utils/                # Helper functions

### Edge Case Handling
- **Cursor Stuck**: Reset to center button always available
- **Input Device Disconnected**: Graceful fallback to mouse control
- **Very Slow Users**: Optional hint system after extended time
- **Accidental Settings Changes**: "Reset to Default" always available
- **Screen Size Changes**: Game area adapts while maintaining proportions

### Visual Design Requirements
- **Color Palette**: Limit to 8 high-contrast combinations:
  - White cursor on black background
  - Black cursor on white background  
  - Yellow cursor on blue background
  - Blue cursor on yellow background
  - Red cursor on white background
  - Green cursor on white background
  - White cursor on dark gray background
  - Black cursor on light gray background

- **Game Area**: Clean, uncluttered design
  - Solid background colors only
  - Clear borders around game area
  - Score display in corner (large, readable font)
  - No decorative elements that distract

- **Animation**: Minimal and purposeful
  - Cursor moves smoothly without lag
  - Target collection shows brief success animation
  - All animations respect "reduced motion" accessibility setting

## RESPONSIVE DESIGN SPECIFICATION

### Core Responsive Principles
- **Mobile-First Approach**: Design starts with smallest screens, scales up
- **Accessibility at All Sizes**: 44px minimum touch targets maintained across all breakpoints
- **Flexible Game Area**: Game scales proportionally while maintaining playability
- **Content Priority**: Essential controls always visible, secondary features adapt
- **Touch-Friendly**: All interactions work on touch devices (tablets, touch monitors)

### Breakpoint Strategy
```css
/* Mobile Portrait: 320px - 479px */
- Single column layout
- Game area: 300x400px minimum
- Large buttons stack vertically
- Settings in collapsible panels

/* Mobile Landscape / Small Tablet: 480px - 767px */
- Game area: 400x300px minimum
- Side-by-side button layout where space allows
- Simplified configuration panels

/* Tablet Portrait: 768px - 1023px */
- Game area: 500x600px
- Configuration sidebar alongside game
- Larger touch targets (50px+)

/* Tablet Landscape / Desktop: 1024px+ */
- Game area: 800x600px optimal
- Full sidebar with all configuration options
- Standard 44px touch targets sufficient


### Target Collection Game - Responsive Adaptations

**Game Canvas Scaling:**
- Maintains aspect ratio at all screen sizes
- Minimum playable area: 300x300px
- Maximum area: 1200x800px
- Scales cursor and target sizes proportionally
- Preserves collision detection accuracy

**Element Size Calculations:**
- Cursor size: Base size × screen scale factor
- Target size: Base size × screen scale factor  
- Minimum cursor: 30px on smallest screens
- Minimum target: 60px on smallest screens
- Movement speed: Adjusted for screen density

**Position Mapping:**
- Touch/click coordinates properly mapped to game area
- Edge boundaries account for scaled elements
- Random positioning respects scaled element sizes

### Responsive Control Design

**Small Screens (320-479px):**
- Configuration accessed via modal/drawer
- Large "Settings" button (60px height)
- One setting per screen with "Next/Previous" navigation
- Game controls: Large pause button in corner
- Score display: Top center, large font

**Medium Screens (480-767px):**
- Settings panel slides in from side/bottom
- 2-3 settings visible at once
- Grouped related settings (cursor, target, game)
- Tab navigation between setting groups

**Large Screens (768px+):**
- Persistent sidebar with all settings
- Live preview alongside controls
- Advanced options visible
- Multiple games accessible via navigation

### Multi-Input Responsive Design

**Touch Devices:**
- All controls minimum 44px (60px on small screens)
- Increased spacing between interactive elements
- Touch-friendly sliders with large thumbs
- Swipe gestures for navigation where appropriate
- Visual feedback for touch interactions

**Desktop/Mouse:**
- Hover states on all interactive elements
- Precise cursor control for fine movements
- Keyboard shortcuts displayed prominently
- Right-click context menus where helpful

**Gamepad/Joystick:**
- Controller button prompts adapt to screen space
- D-pad navigation optimized for current layout
- Button mapping displayed contextually
- Controller disconnection handled gracefully

### Responsive Typography System

**Base Font Sizes by Screen:**
- Mobile: 18px base (minimum for accessibility)
- Tablet: 20px base
- Desktop: 18px base
- Large displays: 22px base

**Scaling Rules:**
- Headings: 1.5x to 2.5x base size
- Body text: 1x to 1.2x base size
- UI labels: 0.9x to 1.1x base size
- Game score: 2x to 3x base size
- Button text: 1.1x to 1.3x base size

**Line Height and Spacing:**
- Line height: 1.4-1.6 across all sizes
- Paragraph spacing: 1rem minimum
- Button padding: 0.75rem minimum
- Section spacing: 1.5rem minimum

### Responsive CSS Architecture

**CSS Grid/Flexbox Layout:**
```css
.game-container {
  display: grid;
  grid-template-areas: 
    "header header"
    "game settings"
    "footer footer";
  gap: 1rem;
}

.game-area {
  width: min(100vw - 2rem, 800px);
  height: min(75vh, 600px);
  aspect-ratio: 4/3;
  container-type: inline-size;
}

/* Container queries for game elements */
@container (max-width: 400px) {
  .cursor { min-width: 30px; min-height: 30px; }
  .target { min-width: 60px; min-height: 60px; }
}

/* Mobile: Stack vertically */
@media (max-width: 767px) {
  .game-container {
    grid-template-areas:
      "header"
      "game"  
      "settings"
      "footer";
  }
}

### Responsive Accessibility Requirements

**Focus Management:**
- Focus rings scale with element size
- Skip links adapt to layout changes
- Tab order logical on all screen sizes
- Focus trapping in modals/drawers

**Screen Reader Adaptations:**
- Layout change announcements
- Orientation change handling
- Context updates when UI reorganizes
- Landmark navigation works on all layouts

**Zoom and Scaling:**
- Support 200% browser zoom minimum
- Text reflow at high zoom levels
- No horizontal scrolling required
- Interactive elements remain accessible

**High Contrast Mode:**
- Border definitions for all screen sizes
- Sufficient contrast maintained when scaled
- Custom properties adapt to system settings
- No reliance on color alone for information


## COMPREHENSIVE TESTING STRATEGY

### Core Testing Principles
- **Accessibility-First Testing**: Every feature tested with assistive technologies
- **Real User Simulation**: Test with actual disability scenarios in mind
- **Cross-Platform Validation**: Test on multiple devices, browsers, input methods
- **Automated + Manual**: Combine automated tools with human testing
- **Continuous Testing**: Testing integrated into development workflow

### Accessibility Testing Requirements

**Screen Reader Testing:**
- Test with NVDA (Windows), JAWS (Windows), VoiceOver (Mac)
- Verify all game actions are announced clearly
- Test navigation with screen reader shortcuts
- Validate ARIA labels, roles, and live regions
- Test with screen reader + keyboard navigation only

**Keyboard Navigation Testing:**
- Tab order logical and complete
- All functionality accessible via keyboard
- Focus indicators visible and high contrast
- No keyboard traps
- Skip links functional
- Game controls work with arrow keys, WASD, spacebar

**Motor Impairment Testing:**
- Test with Windows sticky keys, filter keys enabled
- Verify 44px minimum touch targets
- Test with reduced dexterity scenarios (single finger, head pointer)
- Validate generous collision detection works
- Test pause/resume functionality extensively

**Visual Impairment Testing:**
- Windows High Contrast Mode compatibility
- Color blindness simulation (deuteranopia, protanopia, tritanopia)
- Test at 200% browser zoom minimum
- Verify sufficient color contrast ratios (4.5:1 minimum)
- Test with custom system fonts and large text settings

**Cognitive Load Testing:**
- Interface remains simple and uncluttered
- Instructions clear and minimal
- No time pressure elements function correctly
- Error prevention and recovery works
- Settings save and restore properly

### Input Method Testing

**Mouse Testing:**
- Smooth cursor movement at all speeds
- Accurate collision detection
- Right-click functionality where applicable
- Drag operations (if implemented)

**Gamepad/Joystick Testing:**
- Test with Xbox, PlayStation, and generic controllers
- Analog stick sensitivity and dead zones
- Button mapping consistency
- Controller disconnect/reconnect handling
- Multiple controller support if needed

**Touch Testing:**
- Test on tablets and touch monitors
- Touch targets appropriate size (44px+)
- Touch feedback responsive
- Multi-touch handling (prevent accidental inputs)
- Orientation change handling

**Alternative Input Testing:**
- Switch control simulation
- Eye tracking compatibility (basic)
- Voice control compatibility
- Head pointer simulation

### Device and Browser Testing

**Browser Compatibility:**
- Chrome, Firefox, Safari, Edge (current versions)
- Test with browser accessibility features enabled
- High contrast mode, large text, reduced motion
- Local storage functionality across browsers

**Device Testing:**
- Desktop: Windows 10+, macOS, Linux
- Tablets: iPad, Android tablets, Windows tablets
- Large displays: 4K monitors, accessibility monitors
- Touch monitors and interactive displays

**Performance Testing:**
- 60fps gameplay on minimum spec devices
- Responsive performance during configuration changes
- Memory usage with extended gameplay
- Battery usage on mobile devices

### Automated Testing Implementation

**Unit Tests for Accessibility:**
```typescript
// Testing patterns to implement
describe('TargetCollectionGame Accessibility', () => {
  test('maintains 44px minimum touch targets', () => {
    // Test cursor and target sizing
  });
  
  test('announces game events to screen readers', () => {
    // Test ARIA live regions
  });
  
  test('keyboard navigation works completely', () => {
    // Test all keyboard interactions
  });
  
  test('high contrast mode applies correctly', () => {
    // Test CSS custom properties
  });
});

## **Testing Tools Integration**

Add this to your context for specific tool recommendations:

```markdown
### Recommended Testing Tools Stack

**Automated Accessibility:**
- @axe-core/react for runtime accessibility testing
- jest-axe for unit test accessibility validation
- lighthouse-ci for continuous accessibility auditing
- pa11y for command-line accessibility testing

**Visual Testing:**
- Storybook for component isolation testing
- Chromatic for visual regression testing
- BackstopJS for cross-browser visual comparison

**Performance:**
- React DevTools Profiler for performance monitoring
- Web Vitals for core performance metrics
- Lighthouse for comprehensive performance auditing

**Cross-Browser:**
- Playwright for automated cross-browser testing
- BrowserStack for device and browser matrix testing

## TARGET COLLECTION GAME - DETAILED SPECIFICATION

### Game Flow & Mechanics
- **Single Target Mode**: Only one target visible at a time (primary mode)
- **Target Lifecycle**: 
  1. Target appears at random location (not near edges)
  2. Target remains until collected (no time pressure)
  3. Success feedback plays (visual pulse + optional sound)
  4. Brief pause (0.5-1 second)
  5. New target appears at different location
  6. Score increments by 1

### Cursor Behavior
- **Movement**: Smooth, continuous movement following input
- **Visual Design**: Large, clearly visible shape (circle, arrow, or custom)
- **Positioning**: Always starts at center of game area
- **Boundaries**: Cannot move outside game area (soft collision)
- **Trail Option**: Optional visual trail behind cursor (configurable)

### Target Specifications
- **Appearance**: Large, high-contrast circles or squares
- **Positioning**: Random placement with minimum distance from edges (target radius + 50px)
- **Collision Detection**: Generous - triggers when cursor overlaps target by any amount
- **Visual States**: Normal, "cursor nearby" (subtle highlight), "collected" (brief animation)
- **Anti-frustration**: If user struggles, optional "magnetic attraction" when very close

### Configuration Options (All Must Be Implemented)
**Cursor Settings:**
- Size: 20-100px (slider with live preview)
- Speed: 1-10 scale (1=very slow for severe motor issues, 10=normal)
- Shape: Circle, Arrow, Cross, Square, Custom color square
- Color: High contrast palette (6-8 colors max)
- Trail: On/Off toggle, trail length if on

**Target Settings:**
- Size: 50-200px (slider with live preview) 
- Color: Same palette as cursor, must contrast with background
- Shape: Circle, Square (keep simple)
- Attraction: Off, Subtle, Strong (magnetic pull when cursor nearby)

**Game Settings:**
- Background: Solid colors only (white, black, dark blue, gray)
- Success Sound: On/Off, volume control
- Success Animation: Pulse, Sparkle, or Simple flash
- Score Display: On/Off, position (top-left, top-center, top-right)

### Accessibility Implementation Details
- **Screen Reader**: 
  - "Target appeared at [general location]" 
  - "Target collected, score now [X]"
  - "Game paused" / "Game resumed"
  - Settings changes announced
- **Keyboard Controls**: 
  - Arrow keys or WASD for movement
  - Spacebar to pause/resume
  - Enter to restart game
- **Focus Management**: 
  - Game area receives focus when active
  - Settings panel properly manages focus
  - Clear focus indicators on all controls

### Success Feedback System
- **Visual**: Target pulses/flashes briefly before disappearing
- **Audio**: Optional pleasant "ding" or "chime" (not startling)
- **Score**: Large, clear number increment with brief highlight
- **Celebration**: Every 5 or 10 targets, show "Great job!" message

### Error Prevention & Assistance
- **No Fail States**: Impossible to lose or make mistakes
- **Generous Timing**: No time pressure whatsoever
- **Helpful Features**: 
  - Optional subtle arrow pointing to target after 30+ seconds
  - Optional "glow" effect around target edges
  - Cursor position indicator (coordinates) for severe motor issues

### Technical Implementation Requirements
- **Performance**: 60fps smooth movement, no lag or stuttering
- **Responsive**: Works on different screen sizes (minimum 800x600 game area)
- **State Management**: Pause preserves exact cursor position and game state
- **Settings Persistence**: All configurations save to localStorage immediately
- **Input Handling**: 
  - Mouse: Direct position mapping
  - Keyboard: Smooth acceleration/deceleration movement
  - Gamepad: Analog stick with dead zone handling

## PLANNED FUTURE GAMES (Design Architecture Around These)

### Memory Games
- Card matching with large, clear images
- Sequence repetition with audio/visual cues
- Pattern recognition with customizable complexity

### Coordination Games  
- Drag and drop with large targets
- Drawing/tracing paths with motor assistance
- Multi-step sequential tasks

### Reaction Time Games
- Simple stimulus-response (large button press)
- Color/shape matching under gentle time pressure
- Progressive difficulty with user pacing

### Typing/Input Games
- Large keyboard practice
- Word completion with predictive text
- Switch scanning practice modes

### Navigation Games
- Menu navigation practice
- File system exploration simulation
- Web browsing skill training

