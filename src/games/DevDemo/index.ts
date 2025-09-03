import type { GameDefinition, IGame, GameState, AccessibilityFeature } from '../../types/game';

class DevDemoGame implements IGame {
  id = 'dev-demo';
  name = 'Dev Demo';
  description = 'Simple score incrementer for platform validation';
  category = 'motor' as const;
  configSchema = { version: 1, properties: {} };
  accessibilityFeatures: AccessibilityFeature[] = [
    'keyboardSupport',
    'screenReader',
    'highContrast',
    'largeTargets',
    'reducedMotion'
  ];

  private state: GameState = { started: false, paused: false, score: 0, timestamp: 0 };

  initialize() {}
  start() {
    this.state.started = true;
  }
  pause() {
    this.state.paused = true;
  }
  resume() {
    this.state.paused = false;
  }
  reset() {
    this.state = { started: false, paused: false, score: 0, timestamp: 0 };
  }
  cleanup() {}
  getState() {
    return this.state;
  }
  updateConfig() {}
}

const def: GameDefinition = {
  id: 'dev-demo',
  name: 'Dev Demo',
  description: 'Simple score incrementer for platform validation',
  category: 'motor',
  configSchema: { version: 1, properties: {} },
  accessibilityFeatures: ['keyboardSupport', 'screenReader', 'highContrast', 'largeTargets'],
  createInstance: () => new DevDemoGame()
};

export default def;
