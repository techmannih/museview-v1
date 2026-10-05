import objPath from "./SMF5_0A.obj"
import stepPath from "./SMF5_0A.step"
import type { DiodeProps } from "@tscircuit/props"
import { TVSSymbol } from "./TVSSymbol"

const pinLabels = {
  pin1: ["cathode", "C", "neg"],
  pin2: ["anode", "A", "pos"]
} as const

export const SMF5_0A = (props: DiodeProps) => {
  return (
    <diode
      variant="avalanche"
      symbol={<TVSSymbol />}
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C193402"
  ]
}}
      manufacturerPartNumber="SMF5.0A"
      footprint={<footprint>
        <smtpad portHints={["pin2", "anode"]} pcbX="1.634998mm" pcbY="0mm" width="1.1999976mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin1", "cathode"]} pcbX="-1.634998mm" pcbY="0mm" width="1.1999976mm" height="1.1999976mm" shape="rect" />
<silkscreenpath route={[{"x":-0.7167625999999245,"y":0.8762238000001616},{"x":-0.7167625999999245,"y":-0.876223800000048}]} />
<silkscreenpath route={[{"x":-1.3762228000000505,"y":-0.9262363999999934},{"x":1.3762227999999368,"y":-0.9262363999999934}]} />
<silkscreenpath route={[{"x":-1.3762228000000505,"y":0.9262364000001071},{"x":1.3762227999999368,"y":0.9262364000001071}]} />
<silkscreenpath route={[{"x":1.3762227999999368,"y":0.9262364000001071},{"x":1.3762227999999368,"y":0.7331963999999971}]} />
<silkscreenpath route={[{"x":1.3762227999999368,"y":-0.9262363999999934},{"x":1.3762227999999368,"y":-0.7331963999999971}]} />
<silkscreentext text="{NAME}" pcbX="0mm" pcbY="1.9906mm" anchorAlignment="center" fontSize="1mm" />
<fabricationnotepath route={[{"x":-2.032000000000039,"y":0.1270000000000664},{"x":-2.032000000000039,"y":-0.06502399999988029},{"x":-1.2640056000001323,"y":-0.06502399999988029},{"x":-1.2640056000001323,"y":0.1270000000000664},{"x":-2.032000000000039,"y":0.1270000000000664}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":2.0349972000000207,"y":0.09603740000000016},{"x":2.0349972000000207,"y":-0.09598659999994652},{"x":1.2670027999998865,"y":-0.09598659999994652},{"x":1.2670027999998865,"y":0.09603740000000016},{"x":2.0349972000000207,"y":0.09603740000000016}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":1.7470374000000675,"y":-0.3839972000000671},{"x":1.5550133999998934,"y":-0.3839972000000671},{"x":1.5550133999998934,"y":0.3839972000000671},{"x":1.7470374000000675,"y":0.3839972000000671},{"x":1.7470374000000675,"y":-0.3839972000000671}]} strokeWidth="0.254mm" />
<courtyardoutline outline={[{"x":-2.4849967999998626,"y":1.1499982000000273},{"x":2.4849967999998626,"y":1.1499982000000273},{"x":2.4849967999998626,"y":-1.1499981999999136},{"x":-2.4849967999998626,"y":-1.1499981999999136},{"x":-2.4849967999998626,"y":1.1499982000000273}]} />
      </footprint>}
      cadModel={{
        objUrl: objPath,
        stepUrl: stepPath,
        pcbRotationOffset: 180,
        modelOriginPosition: { x: 0, y: 0, z: 0.09 },
      }}
      {...props}
    />
  )
}
