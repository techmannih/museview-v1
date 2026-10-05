import { pathToFileURL } from "node:url"
import { model, readCircuit, finish } from "./circuit.mjs"
import contract from "../hardware-contract.json" with { type:"json" }
import { checkTvsSymbol } from "./check-schematic-render.mjs"
export function checkContract(circuit) {
 const m=model(circuit), errors=[]
 if(m.component("J1")?.standard!=="usb_c") errors.push("J1: use the standard USB-C schematic")
 for(const [pin,number] of Object.entries({EH2:1,EH1:2,EH4:3,EH3:4,SBU2:5,CC1:6,DN2:7,DP1:8,DN1:9,DP2:10,SBU1:11,CC2:12,GND1:13,GND2:14,VBUS1:15,VBUS2:16})) {
  if(m.port("J1",pin)?.pin_number!==number) errors.push(`J1.${pin}: C165948 requires physical pin ${number}`)
 }
 for (const [polarity,pin] of [["cathode",1],["anode",2]]) if (m.port("D1",polarity)?.pin_number!==pin) errors.push(`D1.${polarity}: supplier C193402 requires pin ${pin}`)
 errors.push(...checkTvsSymbol(circuit))
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
