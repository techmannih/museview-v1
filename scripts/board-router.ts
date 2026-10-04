import saved from "../pcb-routes.json"
import {routeFingerprint} from "./route-fingerprint"

// @tscircuit/core 0.0.2079 represents circular keepouts by their bounding
// rectangles; 0.0.2021 used "oval". The complete captured inputs differ ONLY
// in the type of the four 4.6 mm mounting-hole obstacles (257..260).
// route-grid.py already treated these as rectangles. Accept the reviewed
// complete input, bound to its original routing revision, without ignoring
// obstacle shapes or weakening the fingerprint for any other input.
// Re-capture and review compatibility if either runtime or routing changes.
const reviewedRendererInput = {
  referenceFingerprint: "23261100-7517b7e4-1060840",
  boundingRectangleFingerprint: "231d9bac-3bc68c90-1060840",
}

/** Replay this board's independently generated, locally corrected routing.
 * Native connectivity/placement/short checks still execute on every build.
 * Editing the circuit requires fresh routing, never silent stale-cache reuse.
 */
export async function boardRouter(input:any) {
  const actual=routeFingerprint(input)
  const reviewedEquivalent = saved.fingerprint===reviewedRendererInput.referenceFingerprint &&
    actual===reviewedRendererInput.boundingRectangleFingerprint
  if(actual!==saved.fingerprint && !reviewedEquivalent) throw new Error(`PCB routing is stale (${actual}, expected ${saved.fingerprint}). Regenerate and verify pcb-routes.json.`)
  const listeners:Record<string,((event:any)=>void)[]>={}
  return {
    on(event:string,callback:(event:any)=>void) { (listeners[event]??=[]).push(callback) },
    start() { for(const callback of listeners.complete??[]) callback({traces:structuredClone(saved.traces)}) },
    stop() {},
  }
}
