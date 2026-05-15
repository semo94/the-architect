/**
 * OpenTelemetry bootstrap — must load before application code.
 *
 * Production: node --import dist/src/modules/shared/observability/instrumentation-preload.js ...
 * Dev: tsx --import src/modules/shared/observability/instrumentation-preload.ts ...
 */
import { initUptraceInstrumentation } from './instrumentation.js';

initUptraceInstrumentation();
