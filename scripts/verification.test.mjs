import { describe,it,expect } from "bun:test"
import { model, readCircuit } from "./circuit.mjs"
import { checkContract } from "./check-contract.mjs"
import { checkAssembly } from "./check-assembly.mjs"
import { checkDecoupling } from "./check-decoupling.mjs"
import { checkRouting } from "./check-routing.mjs"
import { checkCameraSupply } from "./check-camera-supply.mjs"
import stock from "../sourcing/stock-snapshot.json" with {type:"json"}
const original=readCircuit("dist/index/circuit.json")
const clone=()=>structuredClone(original)
describe("Generated hardware regressions",()=>{
 it("rejects undersized via drills and annular rings",()=>{
  const small=clone();small.find(e=>e.type==="pcb_via").hole_diameter=0.2
  expect(checkRouting(small).some(e=>e.includes("via drill below 0.30 mm"))).toBe(true)
  const thin=clone();thin.find(e=>e.type==="pcb_via").outer_diameter=0.45
  expect(checkRouting(thin).some(e=>e.includes("annular ring"))).toBe(true)
 })
 it("preserves physical USB pad numbering with the standard schematic",()=>{
  const c=clone(),m=model(c);m.port("J1","DN1").pin_number=8
  expect(checkContract(c).some(e=>e.includes("J1.DN1: C165948 requires physical pin 9"))).toBe(true)
 })
 it("rejects TVS supplier pin polarity mismatch even if semantic nets match",()=>{const c=clone(),d=c.find(e=>e.type==='source_component'&&e.name==='D1');for(const p of c.filter(e=>e.type==='source_port'&&e.source_component_id===d.source_component_id))p.pin_number=3-p.pin_number;expect(checkContract(c).some(e=>e.includes('C193402 requires pin'))).toBe(true);const reversed=clone(),m=model(reversed),a=reversed.find(e=>e.type==='schematic_port'&&e.source_port_id===m.port('D1','anode').source_port_id),k=reversed.find(e=>e.type==='schematic_port'&&e.source_port_id===m.port('D1','cathode').source_port_id);[a.center,k.center]=[k.center,a.center];expect(checkContract(reversed).some(e=>e.includes('schematic cathode'))).toBe(true)})
 it("rejects the obsolete 20.5k camera core divider",()=>{const c=clone();c.find(e=>e.type==='source_component'&&e.name==='R8').resistance=20500;expect(checkCameraSupply(c).some(e=>e.includes('1.30 V'))).toBe(true)})
 it("rejects a legacy camera supply net name",()=>{const c=clone();c.find(e=>e.type==='source_net'&&e.name==='CAM_1V3').name='CAM_1V2';expect(checkCameraSupply(c).some(e=>e.includes('Legacy'))).toBe(true)})
 it("rejects divider tolerance that exceeds the camera voltage budget",()=>{const catalog=structuredClone(stock);catalog.find(e=>e.id==='C22920').part.description=catalog.find(e=>e.id==='C22920').part.description.replace('±1%','±5%');expect(checkCameraSupply(original,catalog).some(e=>e.includes('worst-case'))).toBe(true)})
 it("matches the reviewed electrical and placement contract",()=>{expect(checkContract(original)).toEqual([]);expect(checkAssembly(original)).toEqual([])})
 it("catches a wrong precision divider part",()=>{const c=clone();c.find(e=>e.type==='source_component'&&e.name==='R6').resistance=453000;expect(checkContract(c).some(e=>e.includes('R6'))).toBe(true)})
 it("catches a camera RESET disconnection",()=>{const c=clone(),u=c.find(e=>e.type==='source_component'&&e.name==='U1');const p=c.find(e=>e.type==='source_port'&&e.source_component_id===u.source_component_id&&e.port_hints?.includes('IO18'));const modified=c.filter(e=>!(e.type==='source_trace'&&e.connected_source_port_ids?.includes(p.source_port_id)));expect(checkContract(modified).some(e=>e.includes('IO18'))).toBe(true)})
 it("rejects moving an assembly component to bottom",()=>{const c=clone();c.find(e=>e.type==='pcb_component').layer='bottom';expect(checkAssembly(c).length).toBeGreaterThan(0)})
 it("rejects a bottom pad even if its component claims top placement",()=>{const c=clone();c.find(e=>e.type==='pcb_smtpad').layer='bottom';expect(checkAssembly(c).some(e=>e.includes('bottom-side assembly pad'))).toBe(true)})
 it("catches missing bypass copper",()=>{const c=clone(),s=c.find(e=>e.type==='source_trace'&&e.name==='DECOUPLE_C10');expect(checkDecoupling(c.filter(e=>!(e.type==='pcb_trace'&&e.source_trace_id===s.source_trace_id))).some(e=>e.includes('C10'))).toBe(true)})
 it("rejects an undersized post-ESD USB segment",()=>{const c=clone(),s=c.find(e=>e.type==='source_trace'&&e.name==='USB_DM_TO_R'),t=c.find(e=>e.type==='pcb_trace'&&e.source_trace_id===s.source_trace_id);t.route.find(p=>p.route_type==='wire').width=.15;expect(checkDecoupling(c).some(e=>e.includes('post-ESD USB'))).toBe(true)})
 it("rejects a long camera core bypass detour",()=>{const c=clone(),s=c.find(e=>e.type==='source_trace'&&e.name==='DECOUPLE_C14'),t=c.find(e=>e.type==='pcb_trace'&&e.source_trace_id===s.source_trace_id);t.route.splice(1,0,{route_type:'wire',x:20,y:0,layer:'top',width:.15});expect(checkDecoupling(c).some(e=>e.includes('C14'))).toBe(true)})
 it("rejects an autorouting failure even if a CLI returned success",()=>{const c=clone();c.push({type:'pcb_autorouting_error',message:'unrouted test net'});expect(checkRouting(c).some(e=>e.includes('unrouted test net'))).toBe(true)})
 it("rejects signal routing through a dedicated power plane",()=>{const c=clone();c.find(e=>e.type==='pcb_trace').route.push({route_type:'wire',x:0,y:0,layer:'inner1',width:.2});expect(checkRouting(c).some(e=>e.includes('dedicated inner1 plane'))).toBe(true)})
 it("rejects copper entering the antenna exclusion",()=>{const c=clone();c.find(e=>e.type==='pcb_trace').route.push({route_type:'wire',x:4.5,y:14,layer:'top',width:0.2});expect(checkRouting(c).some(e=>e.includes('antenna'))).toBe(true)})
})
