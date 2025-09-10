import type { GameDefinition } from '../../types/game';
import Component from './template.component';

const def: GameDefinition = {
  id: 'template-game',
  name: 'Template Game',
  description: 'Starting point for a new mini game.',
  category: 'motor',
  configSchema: {
    version: 1,
    properties: {
      // add your game-specific config here
      exampleNumber: { type: 'number', min: 1, max: 10 },
    }
  },
  accessibilityFeatures: [
    'keyboardSupport',
    'gamepadSupport',
    'screenReader',
    'highContrast',
    'largeTargets',
    'reducedMotion'
  ],
  createInstance: () => ({
    id: 'template-game',
    name: 'Template Game',
    description: 'Starting point for a new mini game.',
    category: 'motor',
    configSchema: { version: 1, properties: {} },
    accessibilityFeatures: [],
    initialize() {},
    start() {}, pause() {}, resume() {}, reset() {}, cleanup() {},
    getState() { return { started: false, paused: false, score: 0, timestamp: 0 }; },
    updateConfig() {}
  }),
  component: Component
};

export default def;
