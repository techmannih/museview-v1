import { mkdirSync,writeFileSync } from "node:fs"
import { convertCircuitJsonToSchematicSvg,convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { readCircuit } from "./circuit.mjs"
const circuit=readCircuit();mkdirSync("__snapshots__",{recursive:true})
for(const sheet of circuit.filter(e=>e.type==="schematic_sheet")) {
 const svg=convertCircuitJsonToSchematicSvg(circuit,{schematicSheetId:sheet.schematic_sheet_id,width:1800,height:1200})
 writeFileSync(`__snapshots__/index.circuit-schematic-${sheet.name}.snap.svg`,svg)
}
