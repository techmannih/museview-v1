import { checkEachPcbPortConnectedToPcbTraces, checkTracesAreContiguous } from "@tscircuit/checks"
import { pathToFileURL } from "node:url"
import { model, readCircuit, finish } from "./circuit.mjs"
export function checkRouting(circuit) {
 const m=model(circuit), errors=circuit.filter(e=>e.type.endsWith("_error")).map(e=>`${e.type}: ${e.message??e.error_type}`)
 for(const e of [...checkEachPcbPortConnectedToPcbTraces(circuit),...checkTracesAreContiguous(circuit)]) errors.push(e.message??e.type)
 const traces=m.of("pcb_trace")
 if(traces.length<50) errors.push("Incomplete PCB: too few routed copper traces")
 const b=m.of("pcb_board")[0]
 if(b?.num_layers!==4 && b?.layers?.length!==4) errors.push("Expected four copper layers")
 if(b?.min_via_hole_diameter!==0.3 || b?.min_via_pad_diameter!==0.6) errors.push("Board via rules must specify 0.30 mm drill / 0.60 mm pad")
 for(const via of m.of("pcb_via")) {
  if(via.hole_diameter<0.3-1e-7) errors.push(`${via.pcb_via_id}: via drill below 0.30 mm`)
  if(via.outer_diameter<0.6-1e-7 || (via.outer_diameter-via.hole_diameter)/2<0.15-1e-7) errors.push(`${via.pcb_via_id}: via pad must retain at least 0.15 mm annular ring`)
  // from/to describe the route transition (for example top to a plane).
  // The physical barrel span is defined by layers, including both outer faces.
  if(via.layers?.length!==4 || !["top","inner1","inner2","bottom"].every(layer=>via.layers.includes(layer))) errors.push(`${via.pcb_via_id}: expected a through via spanning all four layers`)
 }
 for(const t of traces) for(const p of t.route??[]) {
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y)) errors.push(`${t.pcb_trace_id}: invalid coordinates`)
  if(p.x>-19.5 && p.x<25 && p.y>11.05) errors.push(`${t.pcb_trace_id}: copper in antenna keepout`)
  if(p.route_type==="wire" && ["inner1","inner2"].includes(p.layer) && t.connection_name!==m.net(p.layer==="inner1"?"GND":"VDD_IO")?.source_net_id) errors.push(`${t.pcb_trace_id}: signal copper splits the dedicated ${p.layer} plane`)
  if(p.route_type==="wire" && p.width<0.1499) errors.push(`${t.pcb_trace_id}: track below 0.15 mm`)
 }
 for(const [layer,net] of [["inner1","GND"],["inner2","VDD_IO"]]) if(!m.of("pcb_copper_pour").some(p=>p.layer===layer && p.source_net_id===m.net(net)?.source_net_id)) errors.push(`Missing ${layer} ${net} plane`)
 return errors
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) finish("Routing and build diagnostics",checkRouting(readCircuit()))
