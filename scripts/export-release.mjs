import {mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,unlinkSync} from "node:fs"
import {resolve} from "node:path"
import {spawnSync} from "node:child_process"
import {createHash} from "node:crypto"
import {unzipSync,zipSync} from "fflate"

// Run verify first. This exports the exact verified circuit without rerouting.
const run=(args)=>{const r=spawnSync("bun",args,{stdio:"inherit"});if(r.status!==0)throw Error(`Failed: bun ${args.join(" ")}`)}
mkdirSync("release",{recursive:true})
run(["run","export:assembly"])
run(["run","render:sheets"])
// Resolve imported CAD relative to the repository, not dist/index/.
const exportInput=".release-input.circuit.json"
copyFileSync("dist/index/circuit.json",exportInput)
for(const [format,file] of [
 ["gerbers","museview-v1-gerbers.zip"],
 ["step","museview-v1.step"],
 ["pcb-png","pcb-top.png"],["pcb-svg","pcb-top.svg"],
]) run(["x","tsci","export",exportInput,"-f",format,"-o",resolve("release",file)])
run(["x","tsci","export",exportInput,"-f","pcb-svg","--layer","bottom","-o",resolve("release/pcb-bottom.svg")])
unlinkSync(exportInput)
run(["scripts/export-cad.mjs"])
// The Gerber exporter also inserts its generic BOM/CPL. Keep one authoritative
// assembly pair with DNP filtering and the same origin as the copper files.
const path="release/museview-v1-gerbers.zip",entries=unzipSync(readFileSync(path))
delete entries["bom.csv"];delete entries["pick_and_place.csv"]
writeFileSync(path,zipSync(entries))
copyFileSync("dist/index/circuit.json","release/circuit.json")
for(const name of ["usb","power","mcu","camera"]) copyFileSync(`__snapshots__/index.circuit-schematic-${name}.snap.svg`,`release/schematic-${name}.svg`)
copyFileSync("__snapshots__/index.circuit-3d.snap.png","release/3d.png")
const hashes=Object.fromEntries(readdirSync("release").filter(f=>f!=="sha256.json"&&f!=="verification.json").sort().map(f=>[f,createHash("sha256").update(readFileSync(`release/${f}`)).digest("hex")]))
writeFileSync("release/sha256.json",JSON.stringify(hashes,null,2)+"\n")
