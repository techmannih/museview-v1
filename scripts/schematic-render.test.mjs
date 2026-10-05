import { it, expect } from "bun:test"
import { readCircuit, model } from "./circuit.mjs"
import { checkSchematicRender } from "./check-schematic-render.mjs"

it("renders every sheet and embeds the TVS symbol without a catalog dependency", () => {
  expect(checkSchematicRender(readCircuit("dist/index/circuit.json"))).toEqual([])
})

it("rejects missing viewer symbols, including a locally valid compact TVS name", () => {
  const circuit = readCircuit("dist/index/circuit.json"), m = model(circuit)
  const diode = m.of("schematic_component").find(e => e.source_component_id === m.component("D1").source_component_id)
  diode.symbol_name = "avalanche_diode_sm_up"
  expect(checkSchematicRender(circuit).some(e => e.includes("portable drawing paths"))).toBe(true)
  const resistor = m.of("schematic_component").find(e => e.source_component_id === m.component("R1").source_component_id)
  resistor.symbol_name = "missing_test_symbol_up"
  expect(checkSchematicRender(circuit).some(e => e.includes("Symbol not found: missing_test_symbol_up"))).toBe(true)
})

it("rejects a missing TVS cathode bar while electrical connectivity still passes", () => {
  const circuit = readCircuit("dist/index/circuit.json"), m = model(circuit)
  const diode = m.of("schematic_component").find(e => e.source_component_id === m.component("D1").source_component_id)
  const broken = circuit.filter(e => !(e.type === "schematic_path" && e.schematic_component_id === diode.schematic_component_id && e.points.length === 4 && JSON.stringify(e.points[0]) !== JSON.stringify(e.points[3])))
  expect(m.on("D1", "cathode", "VBUS_5V")).toBe(true)
  expect(checkSchematicRender(broken).some(e => e.includes("TVS bar"))).toBe(true)
})
