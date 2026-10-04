import { pathToFileURL } from "node:url"
import { model, readCircuit, finish } from "./circuit.mjs"
import contract from "../hardware-contract.json" with { type:"json" }
export function checkContract(circuit) {
 const m=model(circuit), errors=[]
 for (const [ref,pins] of Object.entries(contract.nets)) for (const [pin,net] of Object.entries(pins)) if (!m.on(ref,pin,net)) errors.push(`${ref}.${pin}: expected ${net}`)
 for (const [ref,value] of Object.entries(contract.resistors)) if (m.component(ref)?.resistance !== value) errors.push(`${ref}: expected ${value} ohms`)
 for (const [ref,lcsc] of Object.entries(contract.fixedParts)) if (!m.component(ref)?.supplier_part_numbers?.jlcpcb?.includes(lcsc)) errors.push(`${ref}: wrong JLC part, expected ${lcsc}`)
 for (const pin of [35,36,37]) {
  const p=m.port("U1",`IO${pin}`)
  if (p && m.of("source_trace").some(t=>t.connected_source_port_ids?.includes(p.source_port_id))) errors.push(`PSRAM GPIO${pin} must remain unused`)
 }
 for (const [a,b] of [["GND","VDD_IO"],["CAM_2V8","VDD_IO"],["CAM_1V3","VDD_IO"],["USB_RAW_5V","VBUS_5V"],["CC1","CC2"]]) {
  if (m.net(a) && m.net(b) && m.find(m.net(a).source_net_id)===m.find(m.net(b).source_net_id)) errors.push(`${a}/${b}: unintended source-net merge`)
 }
 if (m.of("schematic_sheet").length!==4) errors.push("Expected four schematic sheets")
 const pd=/HUSB|FUSB|STUSB|CH224|IP272|CYPD/i
 if (m.of("source_component").some(c=>pd.test(c.manufacturer_part_number??""))) errors.push("USB-PD controller is forbidden by design contract")
 return errors
}
if (import.meta.url===pathToFileURL(process.argv[1]).href) finish("Hardware contract",checkContract(readCircuit()))
