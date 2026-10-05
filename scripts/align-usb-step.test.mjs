import {test,expect} from "bun:test"
import {alignUsbStep} from "./align-usb-step.mjs"

const circuit = [
  {type:"source_component",name:"J1",source_component_id:"j1"},
  {type:"pcb_component",pcb_component_id:"pcb1",layer:"top"},
  {type:"cad_component",source_component_id:"j1",pcb_component_id:"pcb1",model_step_url:"./usb.step",position:{x:10,y:20,z:0.8},rotation:{x:0,y:0,z:90},model_origin_position:{x:1,y:-2.35,z:0.1}},
]
const step = `#1 = ADVANCED_BREP_SHAPE_REPRESENTATION('./usb.step',(#90),#91);
#2 = REPRESENTATION_MAP(#92,#1);
#3 = MAPPED_ITEM('',#2,#4);
#4 = AXIS2_PLACEMENT_3D('',#5,#6,#7);
#5 = CARTESIAN_POINT('',(10.,20.,0.8));
#6 = DIRECTION('',(0.,0.,1.));
#7 = DIRECTION('',(0.,1.,0.));
#90 = MANIFOLD_SOLID_BREP('untouched',#93);`

test("STEP J1 placement maps its explicit model origin to the board anchor", () => {
  const result = alignUsbStep(step,circuit)
  // Rotate (1,-2.35,0.1) by +90 degrees, then translate to (10,20,0.8).
  expect(result).toContain("#5 = CARTESIAN_POINT('',(7.65,19,0.7000000000000001));")
  expect(result.split("\n").filter(l=>!l.startsWith("#5"))).toEqual(step.split("\n").filter(l=>!l.startsWith("#5")))
  expect(alignUsbStep(result,circuit)).toBe(result)
})
test("STEP J1 correction follows a subsequent origin adjustment", () => {
  const changed = structuredClone(circuit)
  changed[2].model_origin_position.y = -2.75
  expect(alignUsbStep(step,changed)).toContain("#5 = CARTESIAN_POINT('',(7.25,19,0.7000000000000001));")
})
test("STEP J1 alignment rejects missing, ambiguous or rotated model mappings", () => {
  expect(()=>alignUsbStep(step.replace("./usb.step","./other.step"),circuit)).toThrow("J1 STEP shape")
  expect(()=>alignUsbStep(step+"\n#8 = MAPPED_ITEM('',#2,#4);",circuit)).toThrow("J1 mapped instance")
  expect(()=>alignUsbStep(step.replace("DIRECTION('',(0.,1.,0.))","DIRECTION('',(1.,0.,0.))"),circuit)).toThrow("rotation differs")
})
