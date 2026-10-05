import { it, expect } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { readCircuit, model } from "./circuit.mjs"
import { schematicStyleReport } from "./check-schematic-style.mjs"

it("passes style analysis on all four released schematic sheets", () => {
  const report = schematicStyleReport(readCircuit("dist/index/circuit.json"))
  expect(report.sheetsChecked).toBe(4)
  expect(report.issues).toEqual([])
})

it("fails the command on oversized symbols and separated bypass capacitors", () => {
  const circuit = readCircuit("dist/index/circuit.json"), m = model(circuit)
  const schematic = ref => m.of("schematic_component").find(e => e.source_component_id === m.component(ref).source_component_id)
  schematic("U3").size.width += 2
  schematic("C6").center.x -= 20
  const dir = mkdtempSync(join(tmpdir(), "museview-style-"))
  try {
    const path = join(dir, "bad-layout.json")
    writeFileSync(path, JSON.stringify(circuit))
    const result = spawnSync("bun", ["scripts/check-schematic-style.mjs", path], { encoding: "utf8" })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("GenericSchematicBoxTooWide")
    expect(result.stdout).toContain("DecouplingCapacitorsNotCloseTogether")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
