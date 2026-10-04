import {readFileSync,writeFileSync} from "node:fs"
import {basename} from "node:path"
import {zipSync,strToU8} from "fflate"
import {CircuitJsonToKicadSchConverter,CircuitJsonToKicadPcbConverter,CircuitJsonToKicadProConverter,resolveAndLoadKicad3dModelFiles} from "circuit-json-to-kicad"
import {convertCircuitJsonToGltf} from "circuit-json-to-gltf"

const circuit=JSON.parse(readFileSync("dist/index/circuit.json","utf8")),name="museview-v1",files={}
const sch=new CircuitJsonToKicadSchConverter(circuit);sch.runUntilFinished()
for(const f of sch.getOutputFiles({schematicFilename:`${name}.kicad_sch`}))files[f.filename]=strToU8(f.content)
if(Object.keys(files).length!==5)throw Error("Expected root and four child schematic files")
const pcb=new CircuitJsonToKicadPcbConverter(circuit,{includeBuiltin3dModels:true,projectName:name});pcb.runUntilFinished()
files[`${name}.kicad_pcb`]=strToU8(pcb.getOutputString())
const pro=new CircuitJsonToKicadProConverter(circuit,{projectName:name,schematicFilename:`${name}.kicad_sch`,pcbFilename:`${name}.kicad_pcb`});pro.runUntilFinished()
files[`${name}.kicad_pro`]=strToU8(pro.getOutputString())
await resolveAndLoadKicad3dModelFiles({
 model3dSourcePaths:pcb.getModel3dSourcePaths(),projectName:name,
 readFile:async path=>readFileSync(path),
 fetch:async url=>{
  if(!url.startsWith("https://modelcdn.tscircuit.com/jscad_models/"))throw Error(`Uncached CAD: ${url}`)
  const data=readFileSync(`imports/builtin/${basename(url)}`)
  return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}
 },
 onModelFile:({outputPath,content})=>{files[outputPath]=content},
 onError:({sourcePath,error})=>{throw Error(`Missing CAD ${sourcePath}: ${error}`)},
})
if(Object.keys(files).filter(f=>f.endsWith(".step")).length!==16)throw Error("Expected all twelve imported and four native STEP models")
writeFileSync(`release/${name}-kicad.zip`,zipSync(files))

// Inline local OBJ data for the GLB exporter. The generic CLI's registry base
// URL cannot resolve private/local imports, and can silently omit the bodies.
const models=structuredClone(circuit)
for(const e of models)if(e.type==="cad_component"&&e.model_obj_url?.startsWith("./imports/"))e.model_obj_url=`data:text/plain;base64,${readFileSync(e.model_obj_url).toString("base64")}`
const glb=Buffer.from(await convertCircuitJsonToGltf(models,{format:"glb",includeModels:true,boardTextureResolution:2048}))
if(glb.length<5_000_000)throw Error("Assembled GLB is unexpectedly small; check imported bodies")
const scene=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString())
const names=new Set(scene.nodes.map(n=>n.name))
for(const p of circuit.filter(e=>e.type==="pcb_component"&&!e.do_not_place&&circuit.some(s=>s.type==="source_component"&&s.source_component_id===e.source_component_id))) {
 const ref=circuit.find(e=>e.type==="source_component"&&e.source_component_id===p.source_component_id)?.name
 if(!names.has(ref))throw Error(`Missing assembled GLB component: ${ref}`)
}
writeFileSync(`release/${name}.glb`,glb)
console.log("CAD: five schematic files, sixteen STEP assets and embedded OBJ assembly exported")
