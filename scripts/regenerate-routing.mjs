import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs"
import {join} from "node:path"
import {tmpdir} from "node:os"
import {spawnSync} from "node:child_process"
import {routeFingerprint} from "./route-fingerprint.ts"
const scratch=mkdtempSync(join(tmpdir(),"museview-routing-")),candidate=join(scratch,"routes.json")
try {
 const run=spawnSync(process.env.PYTHON??"python3",["scripts/route-grid.py","--output",candidate],{stdio:"inherit"})
 if(run.error || run.status!==0) throw Error("Routing failed; existing pcb-routes.json was preserved")
 const result=JSON.parse(readFileSync(candidate,"utf8"))
 if(result.failedConnections.length) throw Error("Unrouted connections; refusing to save")
 const input=JSON.parse(readFileSync("routing/input.simple-route.json","utf8"))
 writeFileSync("pcb-routes.json",JSON.stringify({fingerprint:routeFingerprint(input),traces:result.traces},null,2)+"\n")
 console.log("Saved new routing. Native DRC and Gerber verification are still required.")
} finally {rmSync(scratch,{recursive:true,force:true})}
