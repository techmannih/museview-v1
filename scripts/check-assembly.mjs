import { pathToFileURL } from "node:url"
import { model, readCircuit, finish } from "./circuit.mjs"
import stock from "../sourcing/stock-snapshot.json" with {type:"json"}
export function checkAssembly(circuit) {
 const m=model(circuit), errors=[]
 for (const c of m.of("source_component")) {
  const p=m.of("pcb_component").find(x=>x.source_component_id===c.source_component_id)
  if (!p || p.layer!=="top") errors.push(`${c.name}: missing top placement`)
  if (c.name.startsWith("TP")) {if (!p?.do_not_place) errors.push(`${c.name}: probe must be DNP`); continue}
  const id=c.supplier_part_numbers?.jlcpcb?.[0]
  if (!id) errors.push(`${c.name}: missing JLC number`)
  else if (!(stock.find(s=>s.id===id)?.part?.stock>0)) errors.push(`${c.name}: no positive stock evidence for ${id}`)
 }
 const j=m.of("pcb_component").find(p=>p.source_component_id===m.component("J2")?.source_component_id)
 const pads=m.of("pcb_smtpad").filter(p=>p.pcb_component_id===j?.pcb_component_id)
 const pad=n=>pads.find(p=>p.port_hints?.includes(`pin${n}`))
 if (pads.length!==26) errors.push("FPC: expected 24 contacts plus two mounting pads")
 for(let n=2;n<=24;n++) if (!pad(n)||!pad(n-1)||Math.abs(Math.hypot(pad(n).x-pad(n-1).x,pad(n).y-pad(n-1).y)-0.5)>0.002) errors.push(`FPC pin ${n}: incorrect 0.5 mm pitch`)
 if (m.of("pcb_hole").filter(h=>!h.pcb_component_id && h.hole_diameter===2.7).length!==4) errors.push("Expected four nonplated mounting holes")
 return errors
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) finish("Assembly and stock",checkAssembly(readCircuit()))
