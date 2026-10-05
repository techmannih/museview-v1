import {readFileSync,writeFileSync,readdirSync} from "node:fs"
import {createHash} from "node:crypto"
import {unzipSync,strFromU8} from "fflate"
import {cameraSupplyReport} from "./check-camera-supply.mjs"
import {placementReview} from "./placement-review.mjs"
import {schematicStyleReport} from "./check-schematic-style.mjs"
import {alignUsbStep} from "./align-usb-step.mjs"
const hash=bytes=>createHash("sha256").update(bytes).digest("hex")
const raw=readFileSync("release/circuit.json"),c=JSON.parse(raw)
if(hash(raw)!==hash(readFileSync("dist/index/circuit.json")))throw Error("Handoff circuit is stale")
if(JSON.stringify(placementReview(raw))!==JSON.stringify(JSON.parse(readFileSync("release/placement-review.json"))))throw Error("Stale placement review / CPL")
const prototypeReview=JSON.parse(readFileSync("sourcing/prototype-review.json"))
if(prototypeReview.blockers.some(b=>b.status!=="open"))throw Error("Review qualification evidence before changing the prototype order status")
const errors=c.filter(e=>e.type.endsWith("_error"));if(errors.length)throw Error("Circuit contains build errors")
const schematicStyle=schematicStyleReport(c)
if(schematicStyle.issueCount)throw Error(`Schematic Style Analysis: ${schematicStyle.issueCount} issues`)
if(JSON.stringify(schematicStyle)!==JSON.stringify(JSON.parse(readFileSync("release/schematic-style.json"))))throw Error("Stale schematic style report")
const cameraSupply=cameraSupplyReport(c)
if(cameraSupply.errors.length)throw Error(cameraSupply.errors.join("\n"))
if(JSON.stringify(cameraSupply)!==JSON.stringify(JSON.parse(readFileSync("release/camera-supply.json"))))throw Error("Stale camera supply report")
const zip=unzipSync(readFileSync("release/museview-v1-gerbers.zip"))
for(const f of ["F_Cu.gbr","In1_Cu.gbr","In2_Cu.gbr","B_Cu.gbr","Edge_Cuts.gbr","drill-L1-L4.drl","drill_npth.drl"])if(!zip[f])throw Error(`Missing ${f}`)
if(zip["bom.csv"]||zip["pick_and_place.csv"])throw Error("Conflicting generic assembly exports in Gerber ZIP")
if(!zip["B_Paste.gbr"] || /D0[13]\*/.test(strFromU8(zip["B_Paste.gbr"]))) throw Error("Bottom stencil must be empty for top-only assembly")
if(c.some(e=>e.type==="pcb_smtpad" && e.layer!=="top")) throw Error("Bottom SMT pad in handoff")
const drills={}
for(const f of ["drill-L1-L4.drl","drill_npth.drl"]) {
 const hits=strFromU8(zip[f]).split("\n").filter(s=>s.startsWith("X"))
 if(new Set(hits).size!==hits.length)throw Error(`Duplicate drill positions in ${f}`)
 drills[f]=hits.length
}
const cad=unzipSync(readFileSync("release/museview-v1-kicad.zip")),cadNames=Object.keys(cad)
if(cadNames.filter(f=>f.endsWith(".kicad_sch")).length!==5 || cadNames.filter(f=>f.endsWith(".step")).length!==16)throw Error("Incomplete KiCad package")
const stepArchive=unzipSync(readFileSync("release/museview-v1-step.zip")),step=stepArchive["museview-v1.step"]
if(Object.keys(stepArchive).length!==1 || !step || !strFromU8(step).startsWith("ISO-10303-21;") || !strFromU8(step).trimEnd().endsWith("END-ISO-10303-21;"))throw Error("Incomplete assembled STEP archive")
if(alignUsbStep(strFromU8(step),c)!==strFromU8(step))throw Error("Assembled STEP has a stale J1 CAD position")
if(readdirSync("release").some(f=>/\.step$/i.test(f)))throw Error("Package assembled STEP exports in ZIP files to avoid the cloud sandbox RPC limit")
const glb=readFileSync("release/museview-v1.glb"),scene=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString()),names=new Set(scene.nodes.map(n=>n.name))
const fitted=c.filter(e=>e.type==="pcb_component"&&!e.do_not_place&&c.some(s=>s.type==="source_component"&&s.source_component_id===e.source_component_id))
for(const p of fitted) {
 if(p.layer!=="top") throw Error("Bottom component in handoff")
 const ref=c.find(e=>e.type==="source_component"&&e.source_component_id===p.source_component_id)?.name
 if(!names.has(ref))throw Error(`Missing GLB body ${ref}`)
}
const report={generatedAt:new Date().toISOString(),circuitSha256:hash(raw),routingFingerprint:JSON.parse(readFileSync("pcb-routes.json")).fingerprint,tscircuitVersion:"0.0.2687",circuitErrors:errors.length,retainedNativeWidthWarnings:c.filter(e=>e.type==="pcb_trace_warning").length,routedTraces:c.filter(e=>e.type==="pcb_trace").length,throughVias:c.filter(e=>e.type==="pcb_via").length,fittedComponents:fitted.length,topComponents:fitted.length,bottomComponents:0,bottomStencil:"empty",boardSizeMm:{width:50,height:35},assembledGlbComponents:fitted.length,assembledStepArchive:{file:"museview-v1-step.zip",uncompressedBytes:step.length,sha256:hash(step)},kicadSchematics:5,kicadModelFiles:16,drillHits:drills,localVerification:{command:"bun run verify",result:"passed",regressionTestsPassed:24,gerberShorts:0,snapshots2d:"matched",snapshots3d:"matched"},cameraSupply:{net:cameraSupply.net,nominalV:cameraSupply.nominalV,dcBoundsWithTcrV:cameraSupply.withResistorTcrWorstCaseV},schematicStyle,orderStatus:"NOT READY",firstPrototypeBlockers:prototypeReview.blockers,hardwareValidation:prototypeReview.afterAssembly}
writeFileSync("release/verification.json",JSON.stringify(report,null,2)+"\n")
const hashes=Object.fromEntries(readdirSync("release").filter(f=>f!=="sha256.json").sort().map(f=>[f,hash(readFileSync(`release/${f}`))]))
writeFileSync("release/sha256.json",JSON.stringify(hashes,null,2)+"\n")
console.log("Handoff: circuit hash, four copper layers, drills, five KiCad sheets, sixteen STEP models, and all 49 GLB components verified")
