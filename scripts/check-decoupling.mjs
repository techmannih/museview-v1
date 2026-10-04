import { pathToFileURL } from "node:url"
import { model, readCircuit, finish } from "./circuit.mjs"
export function wireLength(route) {return route.slice(1).reduce((l,p,i)=>l+Math.hypot(p.x-route[i].x,p.y-route[i].y),0)}
export function checkDecoupling(circuit) {
 const m=model(circuit),errors=[]
 const check=(name,limit)=>{
  const s=m.of("source_trace").find(t=>t.name===name)
  const routes=m.of("pcb_trace").filter(t=> {
    if(t.source_trace_id!==s?.source_trace_id) return false
    const r=t.route, ids=[r[0]?.start_pcb_port_id,r.at(-1)?.end_pcb_port_id]
    const endpoints=ids.map(id=>m.of("pcb_port").find(p=>p.pcb_port_id===id)?.source_port_id)
    return s.connected_source_port_ids.every(id=>endpoints.includes(id))
  })
  if(!s || routes.length!==1) {errors.push(`${name}: expected dedicated copper between its exact endpoints`);return}
  const r=routes[0].route
  if(r.some(p=>p.route_type!=="wire" || p.layer!=="top")) errors.push(`${name}: local bypass must stay on top`)
  const minWidth=name==="DECOUPLE_C10"?0.3:name==="BUCK_SWITCH"?0.5:name==="BUCK_OUTPUT"?0.3:0.149
  if(r.some(p=>p.width<minWidth-0.00001)) errors.push(`${name}: local copper below ${minWidth} mm`)
  if(wireLength(r)>limit+0.001) errors.push(`${name}: exceeds ${limit} mm`)
  const endpoints=[r[0]?.start_pcb_port_id,r.at(-1)?.end_pcb_port_id].map(id=>m.of("pcb_port").find(p=>p.pcb_port_id===id))
  if(endpoints.some(p=>!p) || !s.connected_source_port_ids.every(id=>endpoints.some(p=>p?.source_port_id===id))) errors.push(`${name}: copper endpoints do not match source pins`)
 }
 for(const cap of ["C3","C6","C8","C10","C18"]) check(`DECOUPLE_${cap}`,3)
 for(const cap of ["C2","C3","C4","C6","C7","C8","C9","C10","C11","C12","C13","C14","C15","C16","C17","C18"]) {
  check(`RETURN_${cap}`,1.6)
  if(!m.on(cap,"pin2","GND")) errors.push(`${cap}: return is not GND`)
 }
 check("BUCK_SWITCH",3);check("BUCK_OUTPUT",3)
 return errors
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) finish("Local bypass routing",checkDecoupling(readCircuit()))
