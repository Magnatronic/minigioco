import type { ComponentType } from 'react';
export type GameCategory = 'motor' | 'cognitive' | 'coordination';

export type AccessibilityFeature =
  | 'screenReader'
  | 'highContrast'
  | 'reducedMotion'
  | 'largeTargets'
  | 'keyboardSupport'
  | 'gamepadSupport';

export interface GameConfigSchema {
  version: number;
  properties: Record<string, { type: 'number' | 'string' | 'boolean'; min?: number; max?: number }>;
  required?: string[];
}

export type GameState = {
  started: boolean;
  paused: boolean;
  score: number;
  timestamp: number;
};

export type GameConfig = Record<string, unknown>;

export interface IGame {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
  configSchema: GameConfigSchema;
  accessibilityFeatures: AccessibilityFeature[];

  initialize(config: GameConfig): void;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  cleanup(): void;

  getState(): GameState;
  updateConfig(config: Partial<GameConfig>): void;
}

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
  configSchema: GameConfigSchema;
  accessibilityFeatures: AccessibilityFeature[];
  createInstance(): IGame;
  // Optional React component that renders the game's UI and configuration
  component?: ComponentType<any>;
}
