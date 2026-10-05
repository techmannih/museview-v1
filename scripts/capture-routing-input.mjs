import {Circuit} from "tscircuit"
import {cloneElement} from "react"
import {writeFileSync} from "node:fs"
import {MuseViewV1} from "../index.circuit.tsx"

// Capture native prerouting state, without running or accepting an autorouter.
// Only regenerate:routing followed by verify can validate the resulting copper.
const circuit=new Circuit()
let captured=false
const algorithmFn=async input=>{
  writeFileSync("routing/input.simple-route.json",JSON.stringify(input,null,2)+"\n")
  const types=new Set(["source_net","source_port","source_component","source_trace","pcb_component","pcb_port","pcb_via","pcb_trace"])
  const geometry=circuit.getCircuitJson().filter(e=>types.has(e.type) && (e.type!=="pcb_trace" || e.pcb_trace_id==="pcb_trace_8"))
  if(geometry.filter(e=>e.type==="pcb_via").length!==39 || !geometry.some(e=>e.type==="pcb_trace"&&e.pcb_trace_id==="pcb_trace_8")) throw Error("Fixed copper changed; review grid-router fixture assumptions")
  writeFileSync("routing/geometry.json",JSON.stringify(geometry,null,2)+"\n")
  captured=true
  const callbacks=[]
  return {on(event,fn){if(event==="complete")callbacks.push(fn)},start(){for(const fn of callbacks)fn({traces:[]})},stop(){}}
}
const board=MuseViewV1()
circuit.add(cloneElement(board,{autorouter:{...board.props.autorouter,algorithmFn}}))
await circuit.renderUntilSettled()
if(!captured) {
  const errors=circuit.getCircuitJson().filter(e=>e.type.endsWith("_error"))
  for(const error of errors) console.error(JSON.stringify(error))
  throw Error("Native routing input was not captured; resolve prerouting errors first")
}
console.log("Captured fresh routing input and fixed geometry; regenerate and verify before export")
