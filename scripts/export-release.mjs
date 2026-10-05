import {mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,unlinkSync} from "node:fs"
import {resolve} from "node:path"
import {spawnSync} from "node:child_process"
import {createHash} from "node:crypto"
import {unzipSync,zipSync,strToU8} from "fflate"
import {checkAssembly} from "./check-assembly.mjs"
import {cameraSupplyReport} from "./check-camera-supply.mjs"
import {schematicStyleReport} from "./check-schematic-style.mjs"
import {alignUsbStep} from "./align-usb-step.mjs"

// Run verify first. This exports the exact verified circuit without rerouting.
const run=(args)=>{const r=spawnSync("bun",args,{stdio:"inherit"});if(r.status!==0)throw Error(`Failed: bun ${args.join(" ")}`)}
const circuit=JSON.parse(readFileSync("dist/index/circuit.json","utf8"))
const assemblyErrors=checkAssembly(circuit)
if(assemblyErrors.length) throw Error(assemblyErrors.join("\n"))
const cameraSupply=cameraSupplyReport(circuit)
if(cameraSupply.errors.length) throw Error(cameraSupply.errors.join("\n"))
const schematicStyle=schematicStyleReport(circuit)
if(schematicStyle.issueCount) throw Error(`Schematic Style Analysis: ${schematicStyle.issueCount} issues`)
mkdirSync("release",{recursive:true})
writeFileSync("release/schematic-style.json",JSON.stringify(schematicStyle,null,2)+"\n")
writeFileSync("release/camera-supply.json",JSON.stringify(cameraSupply,null,2)+"\n")
run(["run","export:assembly"])
run(["run","render:sheets"])
// Resolve imported CAD relative to the repository, not dist/index/.
const exportInput=".release-input.circuit.json"
copyFileSync("dist/index/circuit.json",exportInput)
for(const [format,file] of [
 ["gerbers","museview-v1-gerbers.zip"],
 ["pcb-png","pcb-top.png"],["pcb-svg","pcb-top.svg"],
]) run(["x","tsci","export",exportInput,"-f",format,"-o",resolve("release",file)])
run(["x","tsci","export",exportInput,"-f","pcb-svg","--layer","bottom","-o",resolve("release/pcb-bottom.svg")])
// The GitHub cloud importer copies loose STEP files into a sandbox using a
// size-limited RPC. Our assembled STEP exceeds that limit when serialized.
// Keep the full downloadable model in a ZIP, which the importer excludes;
// individual component STEP/OBJ imports remain available to the renderer.
mkdirSync("dist/release",{recursive:true})
const assembledStep="dist/release/museview-v1.step"
run(["x","tsci","export",exportInput,"-f","step","-o",resolve(assembledStep)])
writeFileSync(assembledStep,alignUsbStep(readFileSync(assembledStep,"utf8"),circuit))
writeFileSync("release/museview-v1-step.zip",zipSync({"museview-v1.step":readFileSync(assembledStep)}))
unlinkSync(exportInput)
run(["scripts/export-cad.mjs"])
// The Gerber exporter also inserts its generic BOM/CPL. Keep one authoritative
// assembly pair with DNP filtering and the same origin as the copper files.
const path="release/museview-v1-gerbers.zip",entries=unzipSync(readFileSync(path))
delete entries["bom.csv"];delete entries["pick_and_place.csv"]
// The pinned converter flashes USB plated shell tabs into both paste layers.
// This board is top-assembled: retain all bottom copper/mask/drill geometry,
// but deliberately provide an empty bottom stencil after top-only validation.
entries["B_Paste.gbr"]=strToU8("G04 MuseView V1.1 - empty bottom stencil; top assembly only*\n%TF.FileFunction,Paste,Bot*%\n%TF.FilePolarity,Positive*%\n%FSLAX46Y46*%\n%MOMM*%\n%LPD*%\nM02*\n")
writeFileSync(path,zipSync(entries))
copyFileSync("dist/index/circuit.json","release/circuit.json")
for(const name of ["usb","power","mcu","camera"]) copyFileSync(`__snapshots__/index.circuit-schematic-${name}.snap.svg`,`release/schematic-${name}.svg`)
copyFileSync("__snapshots__/index.circuit-3d.snap.png","release/3d.png")
const hashes=Object.fromEntries(readdirSync("release").filter(f=>f!=="sha256.json"&&f!=="verification.json").sort().map(f=>[f,createHash("sha256").update(readFileSync(`release/${f}`)).digest("hex")]))
writeFileSync("release/sha256.json",JSON.stringify(hashes,null,2)+"\n")
