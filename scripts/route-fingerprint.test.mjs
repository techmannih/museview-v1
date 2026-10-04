import {it,expect} from "bun:test"
import {routeFingerprint} from "./route-fingerprint.ts"
it("routing replay rejects geometry and connectivity changes",()=>{
 const input={obstacles:[{x:1.2,y:2,width:.5}],connections:[{name:"VDD_IO",pointsToConnect:[{x:2,y:3}]}]}
 const moved=structuredClone(input);moved.obstacles[0].x+=.1
 const rewired=structuredClone(input);rewired.connections[0].name="GND"
 expect(routeFingerprint(moved)).not.toBe(routeFingerprint(input))
 expect(routeFingerprint(rewired)).not.toBe(routeFingerprint(input))
 expect(routeFingerprint({...input,display_name:"new label"})).toBe(routeFingerprint(input))
})
it("routing replay rejects supply contract changes even with identical geometry",()=>{
 const input={obstacles:[],connections:[]}
 expect(routeFingerprint(input,{rails:{CAM_1V3:1.296},resistors:{R8:25500}})).not.toBe(routeFingerprint(input,{rails:{CAM_1V2:1.197},resistors:{R8:20500}}))
})
