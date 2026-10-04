import { describe,it,expect } from "bun:test"
import { readCircuit } from "./circuit.mjs"
import { checkContract } from "./check-contract.mjs"
import { checkAssembly } from "./check-assembly.mjs"
import { checkDecoupling } from "./check-decoupling.mjs"
import { checkRouting } from "./check-routing.mjs"
const original=readCircuit("dist/index/circuit.json")
const clone=()=>structuredClone(original)
describe("Generated hardware regressions",()=>{
 it("matches the reviewed electrical and placement contract",()=>{expect(checkContract(original)).toEqual([]);expect(checkAssembly(original)).toEqual([])})
 it("catches a wrong precision divider part",()=>{const c=clone();c.find(e=>e.type==='source_component'&&e.name==='R6').resistance=453000;expect(checkContract(c).some(e=>e.includes('R6'))).toBe(true)})
 it("catches a camera RESET disconnection",()=>{const c=clone(),u=c.find(e=>e.type==='source_component'&&e.name==='U1');const p=c.find(e=>e.type==='source_port'&&e.source_component_id===u.source_component_id&&e.port_hints?.includes('IO18'));const modified=c.filter(e=>!(e.type==='source_trace'&&e.connected_source_port_ids?.includes(p.source_port_id)));expect(checkContract(modified).some(e=>e.includes('IO18'))).toBe(true)})
 it("rejects moving an assembly component to bottom",()=>{const c=clone();c.find(e=>e.type==='pcb_component').layer='bottom';expect(checkAssembly(c).length).toBeGreaterThan(0)})
 it("catches missing bypass copper",()=>{const c=clone(),s=c.find(e=>e.type==='source_trace'&&e.name==='DECOUPLE_C10');expect(checkDecoupling(c.filter(e=>!(e.type==='pcb_trace'&&e.source_trace_id===s.source_trace_id))).some(e=>e.includes('C10'))).toBe(true)})
 it("rejects an autorouting failure even if a CLI returned success",()=>{const c=clone();c.push({type:'pcb_autorouting_error',message:'unrouted test net'});expect(checkRouting(c).some(e=>e.includes('unrouted test net'))).toBe(true)})
 it("rejects copper entering the antenna exclusion",()=>{const c=clone();c.find(e=>e.type==='pcb_trace').route.push({route_type:'wire',x:4,y:19,layer:'top',width:0.2});expect(checkRouting(c).some(e=>e.includes('antenna'))).toBe(true)})
})
