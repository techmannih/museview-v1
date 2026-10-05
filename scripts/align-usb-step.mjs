// The pinned circuit-json-to-step 0.0.36 recentres external STEP models and
// ignores model_origin_position. Correct J1's mapped placement using the same
// explicit origin as the browser/GLB and KiCad exports, without editing solids.
export function alignUsbStep(step, circuit) {
  const one = (items, label) => {
    if (items.length !== 1) throw Error(`Expected one ${label}, found ${items.length}`)
    return items[0]
  }
  const source = one(circuit.filter(e => e.type === "source_component" && e.name === "J1"), "J1")
  const cad = one(circuit.filter(e => e.type === "cad_component" && e.source_component_id === source.source_component_id), "J1 CAD model")
  const pcb = one(circuit.filter(e => e.type === "pcb_component" && e.pcb_component_id === cad.pcb_component_id), "J1 footprint")
  const origin = cad.model_origin_position, rotation = cad.rotation ?? {x:0,y:0,z:0}
  if (!origin || pcb.layer !== "top" || rotation.x || rotation.y ||
      (cad.model_unit_to_mm_scale_factor ?? 1) !== 1 ||
      ![undefined,"z+"].includes(cad.model_board_normal_direction)) {
    throw Error("Unsupported J1 STEP transform; review the exporter before release")
  }
  const entities = [...step.matchAll(/^#(\d+)\s*=\s*([^\n]+);$/gm)].map(m => ({id:m[1],value:m[2],line:m[0]}))
  const refs = e => [...e.value.matchAll(/#(\d+)/g)].map(m => m[1])
  const entity = id => one(entities.filter(e => e.id === id), `STEP entity #${id}`)
  const shape = one(entities.filter(e => e.value.startsWith(`ADVANCED_BREP_SHAPE_REPRESENTATION('${cad.model_step_url}',`)), "J1 STEP shape")
  const map = one(entities.filter(e => e.value.startsWith("REPRESENTATION_MAP(") && refs(e)[1] === shape.id), "J1 representation map")
  const item = one(entities.filter(e => e.value.startsWith("MAPPED_ITEM(") && refs(e)[0] === map.id), "J1 mapped instance")
  const placement = entity(refs(item)[1])
  if (!placement.value.startsWith("AXIS2_PLACEMENT_3D(")) throw Error("Unsupported J1 STEP placement")
  const [pointId,axisId,referenceId] = refs(placement)
  const point = entity(pointId)
  const vector = e => {
    const m = e.value.match(/^(?:DIRECTION|CARTESIAN_POINT)\('[^']*',\(([^)]+)\)\)$/)
    if (!m) throw Error("Unsupported STEP coordinate")
    return m[1].split(",").map(Number)
  }
  const close = (a,b) => a.length === b.length && a.every((v,i) => Number.isFinite(v) && Math.abs(v-b[i]) < 1e-9)
  const rad = rotation.z * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad)
  if (!close(vector(entity(axisId)),[0,0,1]) || !close(vector(entity(referenceId)),[cos,sin,0])) {
    throw Error("J1 STEP rotation differs from the verified circuit")
  }
  if (entities.filter(e => refs(e).includes(pointId)).length !== 1) throw Error("J1 STEP placement point is shared")
  const target = [cad.position.x - (cos*origin.x-sin*origin.y),cad.position.y - (sin*origin.x+cos*origin.y),cad.position.z-origin.z]
  if (target.some(v => !Number.isFinite(v))) throw Error("Invalid J1 STEP origin")
  if (close(vector(point),target)) return step
  return step.replace(point.line,`#${pointId} = CARTESIAN_POINT('',(${target.map(v => String(v).replace(/e/g,"E")).join(",")}));`)
}
