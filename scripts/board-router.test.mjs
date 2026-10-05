import {it,expect} from "bun:test"
import input from "../routing/input.simple-route.json"
import saved from "../pcb-routes.json"
import {boardRouter} from "./board-router.ts"
import {routeFingerprint} from "./route-fingerprint.ts"

// Exact delta reproduced with tscircuit 0.0.2744 / core 0.0.2079.
// Do not normalize arbitrary shapes: a physical pad/keepout edit must fail.
function hostedInput() {
  const result=structuredClone(input)
  const centers=[[-22.25,14.75],[22.25,14.75],[-22.25,-14.75],[22.25,-14.75]]
  for(const [i,[x,y]] of centers.entries()) {
    const obstacle=result.obstacles[257+i]
    expect(obstacle).toEqual({type:"oval",layers:["top","inner1","inner2","bottom"],center:{x,y},width:4.6,height:4.6,connectedTo:[]})
    obstacle.type="rect"
  }
  return result
}

it("replays identical reviewed copper for the two captured renderer inputs",async()=>{
  expect(routeFingerprint(input)).toBe(saved.fingerprint)
  const hosted=hostedInput()
  expect(routeFingerprint(hosted)).toBe("a0bc121d-ba645161-1060753")
  for(const capture of [input,hosted]) {
    const router=await boardRouter(capture)
    let traces
    router.on("complete",event=>{traces=event.traces})
    router.start()
    expect(traces).toEqual(saved.traces)
    expect(traces).not.toBe(saved.traces)
  }
})

it("both renderer inputs still reject moved/resized keepouts, changed pads and changed nets",async()=>{
  for(const capture of [input,hostedInput()]) {
    for(const mutate of [
      c=>{c.obstacles[257].center.x+=.1},
      c=>{c.obstacles[257].width+=.1},
      c=>{c.obstacles[257].layers=["top"]},
      c=>{c.obstacles[0].type=c.obstacles[0].type==="rect"?"oval":"rect"},
      c=>{c.connections[0].name="rewired-net"},
    ]) {
      const changed=structuredClone(capture)
      mutate(changed)
      await expect(boardRouter(changed)).rejects.toThrow("PCB routing is stale")
    }
  }
})
