/**
 * myPilotPost — Memory Event Consumer
 * Processes a single emitted event into features + brand memory.
 * Called async after emit() — never blocks requests.
 */

import { updateFeatures } from '../memory/features.js';
import { updateMemory }   from '../memory/engine.js';

export async function consume(env, event) {
  try {
    await updateFeatures(env, event);
    await updateMemory(env, event);
  } catch (e) {
    console.error('[MEMORY CONSUME]', e.message);
  }
}
