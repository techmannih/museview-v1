import { pathToFileURL } from "node:url"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { model, readCircuit, finish } from "./circuit.mjs"

const near = (a, b) => Math.abs(a - b) < 1e-7
const same = (a, b) => a && b && near(a.x, b.x) && near(a.y, b.y)

export function checkTvsSymbol(circuit) {
  const m = model(circuit), errors = []
  const component = m.of("schematic_component").find(e => e.source_component_id === m.component("D1")?.source_component_id)
  if (!component) return ["D1: missing schematic component"]
  const paths = m.of("schematic_path").filter(e => e.schematic_component_id === component.schematic_component_id)
  // A catalog name alone can build locally but fail in the published viewer.
  if (component.symbol_name || !paths.length) errors.push("D1: TVS symbol must include portable drawing paths")
  const port = name => m.of("schematic_port").find(e => e.source_port_id === m.port("D1", name)?.source_port_id)?.center
  const cathode = port("cathode"), anode = port("anode")
  if (!cathode || !anode || !near(cathode.x, anode.x) || cathode.y <= anode.y) {
    return [...errors, "D1: schematic cathode must meet the upper bar of the reviewed avalanche symbol"]
  }
  const segments = paths.flatMap(p => p.points.slice(1).map((b, i) => [p.points[i], b]))
  const bar = segments.find(([a, b]) => near(a.y, b.y) && a.y > (cathode.y + anode.y) / 2 && a.y < cathode.y && Math.min(a.x, b.x) < cathode.x && Math.max(a.x, b.x) > cathode.x)
  const barCenter = bar && { x: cathode.x, y: bar[0].y }
  if (!barCenter || !segments.some(([a, b]) => same(a, cathode) && same(b, barCenter) || same(b, cathode) && same(a, barCenter))) errors.push("D1: schematic cathode is disconnected from the TVS bar")
  const triangle = paths.find(p => p.points.length === 4 && same(p.points[0], p.points[3]) && p.points.some(p => same(p, barCenter)))
  if (!triangle || !segments.some(([a, b]) => (same(a, anode) && near(b.x, anode.x) && near(b.y, triangle.points[0].y)) || (same(b, anode) && near(a.x, anode.x) && near(a.y, triangle.points[0].y)))) errors.push("D1: incomplete TVS triangle or anode lead")
  return errors
}

export function checkSchematicRender(circuit) {
  const errors = checkTvsSymbol(circuit)
  for (const sheet of circuit.filter(e => e.type === "schematic_sheet")) {
    try {
      const svg = convertCircuitJsonToSchematicSvg(circuit, { schematicSheetId: sheet.schematic_sheet_id, width: 1800, height: 1200 })
      for (const match of svg.matchAll(/Symbol not found:[^<]+/g)) errors.push(`${sheet.name}: ${match[0]}`)
    } catch (error) { errors.push(`${sheet.name}: ${error.message}`) }
  }
  for (const e of circuit.filter(e => e.type === "schematic_component_styling_warning")) errors.push(e.message)
  return errors
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) finish("Schematic rendering", checkSchematicRender(readCircuit()))
