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
 // Connector-local HF bypasses: check the actual endpoint pair, not every
 // distribution branch on the rail (the upstream checker groups by net).
 const pcbPort=(ref,pin)=>m.of("pcb_port").find(p=>p.source_port_id===m.port(ref,pin)?.source_port_id)
 for(const [cap,pin,maxVias] of [["C13","pin4",2],["C14","pin10",0]]) {
  const a=pcbPort(cap,"pin1"),b=pcbPort("J2",pin)
  const routes=m.of("pcb_trace").filter(t=>{
   const ids=[t.route[0]?.start_pcb_port_id,t.route.at(-1)?.end_pcb_port_id]
   return ids.includes(a?.pcb_port_id)&&ids.includes(b?.pcb_port_id)
  })
  if(routes.length!==1) {errors.push(`${cap}: missing dedicated camera supply bypass`);continue}
  const r=routes[0].route
  if(wireLength(r)>5.1 || r.filter(p=>p.route_type==="via").length>maxVias || r.some(p=>p.route_type==="wire"&&p.width<.149)) errors.push(`${cap}: camera bypass exceeds length/via/width budget`)
 }
 // DOVDD and C15 connect to the uninterrupted common I/O plane via short
 // local spurs. Native copper/connectivity checks cover the plane itself.
 for(const [ref,pin] of [["C15","pin1"],["J2","pin11"]]) {
  const p=pcbPort(ref,pin)
  const spur=m.of("pcb_trace").find(t=>{
   const r=t.route;return (r[0]?.start_pcb_port_id===p?.pcb_port_id || r.at(-1)?.end_pcb_port_id===p?.pcb_port_id) && r.some(q=>q.route_type==="via"&&(q.to_layer==="inner2"||q.from_layer==="inner2")) && wireLength(r)<=1.6
  })
  if(!spur) errors.push(`${ref}.${pin}: missing short DOVDD plane connection`)
 }
 return errors
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) finish("Local bypass routing",checkDecoupling(readCircuit()))
