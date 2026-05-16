import type { OtelSdkHandle } from './otel-sdk.js';

const STATE_KEY = Symbol.for('breadthwise.otel.runtime');

export type OtelRuntimeState = {
  initStarted: boolean;
  sdk: OtelSdkHandle | undefined;
  initGeneration: number;
  processHooksRegistered: boolean;
};

export function getOtelRuntimeState(): OtelRuntimeState {
  const globalState = globalThis as typeof globalThis & {
    [STATE_KEY]?: OtelRuntimeState;
  };
  if (!globalState[STATE_KEY]) {
    globalState[STATE_KEY] = {
      initStarted: false,
      sdk: undefined,
      initGeneration: 0,
      processHooksRegistered: false,
    };
  }
  return globalState[STATE_KEY];
}
