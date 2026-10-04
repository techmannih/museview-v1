import objPath from "./XC6206P282MR.obj"
import stepPath from "./XC6206P282MR.step"
import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["VSS"],
  pin2: ["VOUT"],
  pin3: ["VIN"]
} as const

const pinAttributes = {
  pin1: {requiresGround: true},
  pin3: {requiresPower: true}
} as const

export const XC6206P282MR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C347374"
  ]
}}
      manufacturerPartNumber="XC6206P282MR"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="1.101344mm" pcbY="-0.94996mm" width="1.0374884mm" height="0.532003mm" shape="rect" />
<smtpad portHints={["pin2"]} pcbX="1.101344mm" pcbY="0.94996mm" width="1.0374884mm" height="0.532003mm" shape="rect" />
<smtpad portHints={["pin3"]} pcbX="-1.101344mm" pcbY="0mm" width="1.0374884mm" height="0.532003mm" shape="rect" />
<silkscreenpath route={[{"x":0.8586978000000727,"y":1.5262098000000606},{"x":-0.8586978000000727,"y":1.5262098000000606},{"x":-0.8586978000000727,"y":0.49458879999997407}]} />
<silkscreenpath route={[{"x":0.8586978000000727,"y":-1.5262097999999469},{"x":-0.8586978000000727,"y":-1.5262097999999469},{"x":-0.8586978000000727,"y":-0.49458879999997407}]} />
<silkscreenpath route={[{"x":0.8586978000000727,"y":0.45539659999997184},{"x":0.8586978000000727,"y":-0.45539659999985815}]} />
<silkscreentext text="{NAME}" pcbX="0.0635mm" pcbY="2.524mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-1.8700882000000547,"y":1.700009800000089},{"x":1.870088199999941,"y":1.700009800000089},{"x":1.870088199999941,"y":-1.6999843999999484},{"x":-1.8700882000000547,"y":-1.6999843999999484},{"x":-1.8700882000000547,"y":1.700009800000089}]} />
      </footprint>}
      cadModel={{
        objUrl: objPath,
        stepUrl: stepPath,
        pcbRotationOffset: 90,
        modelOriginPosition: { x: -0.000012700000070253736, y: 0, z: 0 },
      }}
      {...props}
    />
  )
}