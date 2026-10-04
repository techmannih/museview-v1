import {readFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {model} from "./circuit.mjs"

// Board-space landmarks, not supplier feeder-angle corrections. Record both
// supplier pin numbers and semantic polarity for the TVS.
const landmarks = {
 U1: ["pin1", "pin2", "pin40"],
 J1: ["CC1", "CC2", "GND1", "GND2"],
 J2: ["pin1", "pin2", "pin10", "pin11", "pin24"],
 D1: ["pin1", "cathode", "pin2", "anode"],
 LED1: ["cathode", "anode"],
 U2: ["pin1", "GND", "VBUS"],
 U3: ["pin1", "GND", "VIN", "FB"],
 U4: ["pin1", "VOUT", "VIN"],
 U5: ["pin1", "GND", "OUT", "FB"],
}
const hash = data => createHash("sha256").update(data).digest("hex")
export function placementReview(rawCircuit) {
 const m=model(JSON.parse(rawCircuit)),cpl=readFileSync("release/jlc-cpl.csv")
 const parts=Object.entries(landmarks).map(([ref,pins])=>{
  const s=m.component(ref),p=m.of("pcb_component").find(p=>p.source_component_id===s?.source_component_id)
  if(!p || p.layer!=="top") throw Error(`Missing top placement: ${ref}`)
  const row=[ref,p.center.x.toFixed(4)+"mm",p.center.y.toFixed(4)+"mm","Top",String(p.rotation??0)].map(v=>`"${v}"`).join(",")
  if(!cpl.toString().split("\n").includes(row)) throw Error(`CPL does not match reviewed board placement: ${ref}`)
  return {ref,jlcPart:s.supplier_part_numbers.jlcpcb[0],footprintRotationDeg:p.rotation??0,cplCenterMm:p.center,landmarks:pins.map(pin=>{
   const source=m.port(ref,pin),pad=m.of("pcb_port").find(p=>p.source_port_id===source?.source_port_id)
   if(!pad) throw Error(`Missing landmark ${ref}.${pin}`)
   const nets=m.of("source_net").filter(n=>m.on(ref,pin,n.name)).map(n=>n.name)
   return {pin,sourceName:source.name,positionMm:{x:pad.x,y:pad.y},nets}
  }),jlcPreviewStatus:"pending"}
 })
 return {circuitSha256:hash(rawCircuit),cplSha256:hash(cpl),view:"top; +X east/right, +Y north/up; millimetres; board-centre origin",status:"Board-side pin/polarity landmarks recorded. JLC rotation and centroid calibration are NOT approved.",parts}
}
