import saved from "../pcb-routes.json"
import {routeFingerprint} from "./route-fingerprint"

/** Replay this board's independently generated, locally corrected routing.
 * Native connectivity/placement/short checks still execute on every build.
 * Editing the circuit requires fresh routing, never silent stale-cache reuse.
 */
export async function boardRouter(input:any) {
  const actual=routeFingerprint(input)
  if(actual!==saved.fingerprint) throw new Error(`PCB routing is stale (${actual}, expected ${saved.fingerprint}). Regenerate and verify pcb-routes.json.`)
  const listeners:Record<string,((event:any)=>void)[]>={}
  return {
    on(event:string,callback:(event:any)=>void) { (listeners[event]??=[]).push(callback) },
    start() { for(const callback of listeners.complete??[]) callback({traces:structuredClone(saved.traces)}) },
    stop() {},
  }
}
