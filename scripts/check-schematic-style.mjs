import { pathToFileURL } from "node:url"
import { analyzeSchematicPlacement } from "@tscircuit/circuit-json-schematic-placement-analysis"
import { readCircuit } from "./circuit.mjs"

// Match the hosted viewer's Style Analysis, independently of the older CLI
// check, which prints suggestions without failing its process.
export function schematicStyleReport(circuit) {
  const analysis = analyzeSchematicPlacement(circuit)
  const issues = analysis.getIssues()
  return {
    analyzer: "@tscircuit/circuit-json-schematic-placement-analysis",
    analyzerVersion: "0.0.39",
    sheetsChecked: circuit.filter(e => e.type === "schematic_sheet").length,
    issueCount: issues.length,
    issues,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = schematicStyleReport(readCircuit())
  console.log(JSON.stringify(report, null, 2))
  if (report.issueCount) process.exitCode = 1
}
