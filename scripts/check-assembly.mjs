import { pathToFileURL } from "node:url"
import { model, readCircuit, finish } from "./circuit.mjs"
import stock from "../sourcing/stock-snapshot.json" with {type:"json"}
export function checkAssembly(circuit) {
 const m=model(circuit), errors=[]
 for (const c of m.of("source_component")) {
  const p=m.of("pcb_component").find(x=>x.source_component_id===c.source_component_id)
  if (!p || p.layer!=="top") errors.push(`${c.name}: missing top placement`)
  for(const pad of m.of("pcb_smtpad").filter(pad=>pad.pcb_component_id===p?.pcb_component_id)) if(pad.layer!=="top") errors.push(`${c.name}: bottom-side assembly pad is forbidden`)
  const cad=m.of("cad_component").find(e=>e.source_component_id===c.source_component_id)
  if(cad?.position?.z<0) errors.push(`${c.name}: 3D body is on the bottom side`)
  if (c.name.startsWith("TP")) {if (!p?.do_not_place) errors.push(`${c.name}: probe must be DNP`); continue}
  const id=c.supplier_part_numbers?.jlcpcb?.[0]
  if (!id) errors.push(`${c.name}: missing JLC number`)
  else if (!(stock.find(s=>s.id===id)?.part?.stock>0)) errors.push(`${c.name}: no positive stock evidence for ${id}`)
 }
 for(const pad of m.of("pcb_smtpad")) if(pad.layer!=="top") errors.push(`${pad.pcb_smtpad_id}: bottom SMT pad is forbidden`)
 const j=m.of("pcb_component").find(p=>p.source_component_id===m.component("J2")?.source_component_id)
 const pads=m.of("pcb_smtpad").filter(p=>p.pcb_component_id===j?.pcb_component_id)
 const pad=n=>pads.find(p=>p.port_hints?.includes(`pin${n}`))
 if (pads.length!==26) errors.push("FPC: expected 24 contacts plus two mounting pads")
 for(let n=2;n<=24;n++) if (!pad(n)||!pad(n-1)||Math.abs(Math.hypot(pad(n).x-pad(n-1).x,pad(n).y-pad(n-1).y)-0.5)>0.002) errors.push(`FPC pin ${n}: incorrect 0.5 mm pitch`)
 if(!pad(1)||!pad(24)||pad(1).y>=pad(24).y||Math.abs(pad(1).x-pad(24).x)>.002) errors.push("FPC: pin 1 must be at the south end of the right-edge contact row")
 if (m.of("pcb_hole").filter(h=>!h.pcb_component_id && h.hole_diameter===2.7).length!==4) errors.push("Expected four nonplated mounting holes")
 const b=m.of("pcb_board")[0]
 if(b?.width!==50 || b?.height!==35) errors.push("Expected the independently placed 50 × 35 mm V1.1 board")
 if(j?.rotation!==90 || j?.center.x<20) errors.push("FPC must open at the right board edge on top")
 const buttons=["SW3","SW1","SW2"].map(ref=>m.of("pcb_component").find(p=>p.source_component_id===m.component(ref)?.source_component_id))
 if(buttons.some(p=>Math.abs(p?.center.y+14)>.01) || !(buttons[0]?.center.x<buttons[1]?.center.x && buttons[1]?.center.x<buttons[2]?.center.x)) errors.push("Expected ASK, RESET, BOOT in the bottom-edge top-side row")
 return errors
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) finish("Assembly and stock",checkAssembly(readCircuit()))
