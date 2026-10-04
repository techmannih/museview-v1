import {pathToFileURL} from "node:url"
import {model,readCircuit,finish} from "./circuit.mjs"
import contract from "../hardware-contract.json" with {type:"json"}
import stock from "../sourcing/stock-snapshot.json" with {type:"json"}

export function cameraSupplyReport(circuit,catalog=stock) {
 const m=model(circuit),s=contract.cameraCore,errors=[],resistors={}
 for(const ref of [s.upperResistor,s.lowerResistor]) {
  const component=m.component(ref),id=component?.supplier_part_numbers?.jlcpcb?.[0],part=catalog.find(e=>e.id===id)?.part
  const tolerance=Number(part?.description.match(/±([\d.]+)%/)?.[1])/100
  const tcr=Number(part?.description.match(/±([\d.]+)ppm/)?.[1])
  if(!part || !(part.stock>0) || part.package!=="0603" || !Number.isFinite(tolerance) || tolerance>s.resistorTolerance || !Number.isFinite(tcr) || tcr>s.resistorTcrPpmPerC) errors.push(`${ref}: missing stocked 0603 divider identity/tolerance/TCR evidence`)
  resistors[ref]={ohms:component?.resistance,lcsc:id,tolerance,tcrPpmPerC:tcr}
 }
 const upper=resistors[s.upperResistor],lower=resistors[s.lowerResistor]
 const temperatureExcursion=Math.max(...Object.values(s.sensorDcTemperatureC).map(t=>Math.abs(t-s.referenceTemperatureC)))
 const bounds=withTcr=>{
  const a=upper.tolerance+(withTcr?upper.tcrPpmPerC*temperatureExcursion/1e6:0),b=lower.tolerance+(withTcr?lower.tcrPpmPerC*temperatureExcursion/1e6:0)
  return {min:s.feedbackV.min*(1+upper.ohms*(1-a)/(lower.ohms*(1+b))),max:s.feedbackV.max*(1+upper.ohms*(1+a)/(lower.ohms*(1-b)))}
 }
 const nominal=s.feedbackV.typ*(1+upper.ohms/lower.ohms),initial=bounds(false),withTcr=bounds(true)
 if(!Number.isFinite(nominal) || Math.abs(nominal-contract.rails.CAM_1V3)>1e-9 || Math.abs(nominal-s.nominalTargetV)>.01) errors.push("CAM_1V3: divider must target approximately 1.30 V and match the rail contract")
 if(!Number.isFinite(withTcr.min) || !Number.isFinite(withTcr.max) || withTcr.min<s.designLimitsV.min || withTcr.max>s.designLimitsV.max) errors.push("CAM_1V3: worst-case DC divider range exceeds 1.24–1.36 V")
 if(m.net("CAM_1V2")) errors.push("Legacy CAM_1V2 rail is forbidden")
 for(const [ref,pin] of [["U5","OUT"],["J2","pin10"],["C9","pin1"],["C14","pin1"],["C17","pin1"],["TP7","pin1"]]) if(!m.on(ref,pin,"CAM_1V3")) errors.push(`${ref}.${pin}: must connect to CAM_1V3`)
 return {module:s.module,net:s.net,nominalV:nominal,initialWorstCaseV:initial,withResistorTcrWorstCaseV:withTcr,temperatureRangeC:s.sensorDcTemperatureC,moduleLimitsV:s.moduleLimitsV,designLimitsV:s.designLimitsV,resistors,errors,scope:"Calculated DC bounds only; verify ripple, transient and measurement margin on hardware. Firmware has no rail ADC."}
}
export const checkCameraSupply=(circuit,catalog)=>cameraSupplyReport(circuit,catalog).errors
if(import.meta.url===pathToFileURL(process.argv[1]).href) {
 const report=cameraSupplyReport(readCircuit())
 console.log(JSON.stringify(report,null,2));finish("M0031 camera supply",report.errors)
}
