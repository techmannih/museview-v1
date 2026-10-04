import objPath from "./BSMD0603_075_6V.obj"
import stepPath from "./BSMD0603_075_6V.step"
import type { FuseProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

export const BSMD0603_075_6V = (props: Omit<FuseProps, "currentRating">) => {
  return (
    <fuse
      currentRating="750mA" voltageRating="6V"

      supplierPartNumbers={{
  "jlcpcb": [
    "C914092"
  ]
}}
      manufacturerPartNumber="BSMD0603-075-6V"
      footprint={<footprint>
        <smtpad portHints={["pin2"]} pcbX="0.753364mm" pcbY="0mm" width="0.8064754mm" height="0.8640064mm" shape="rect" />
<smtpad portHints={["pin1"]} pcbX="-0.753364mm" pcbY="0mm" width="0.8064754mm" height="0.8640064mm" shape="rect" />
<silkscreenpath route={[{"x":1.3969999999999345,"y":0.3809999999999718},{"x":1.3969999999999345,"y":-0.3810000000000855}]} />
<silkscreenpath route={[{"x":-1.397000000000162,"y":0.3809999999999718},{"x":-1.397000000000162,"y":-0.3810000000000855}]} />
<silkscreenpath route={[{"x":-0.3810000000000855,"y":-0.6349999999999909},{"x":-1.143000000000029,"y":-0.6349999999999909}]} />
<silkscreenpath route={[{"x":-0.3810000000000855,"y":0.6349999999999909},{"x":-1.143000000000029,"y":0.6349999999999909}]} />
<silkscreenpath route={[{"x":0.3809999999999718,"y":-0.6349999999999909},{"x":1.1429999999999154,"y":-0.6349999999999909}]} />
<silkscreenpath route={[{"x":0.3809999999999718,"y":0.6349999999999909},{"x":1.1429999999999154,"y":0.6349999999999909}]} />
<silkscreenpath route={[{"x":-0.03175000000010186,"y":-0.06349999999997635},{"x":-0.14440783308521077,"y":0.11518298207374755},{"x":-0.07336247487728542,"y":0.31410998505577936},{"x":0.1269999999999527,"y":0.3809999999999718}]} />
<silkscreenpath route={[{"x":-0.030861000000072636,"y":-0.06349999999997635},{"x":0.1143536728128538,"y":-0.21879178332346783},{"x":0.06940849682075623,"y":-0.42659642793705643},{"x":-0.1269999999999527,"y":-0.5080000000000382}]} />
<silkscreentext text="{NAME}" pcbX="0mm" pcbY="1.635mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-1.4066016999998965,"y":0.7000117999999702},{"x":1.4066016999997828,"y":0.7000117999999702},{"x":1.4066016999997828,"y":-0.6999863999999434},{"x":-1.4066016999998965,"y":-0.6999863999999434},{"x":-1.4066016999998965,"y":0.7000117999999702}]} />
      </footprint>}
      cadModel={{
        objUrl: objPath,
        stepUrl: stepPath,
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.000012700000070253736, y: -0.000012700000070253736, z: 0 },
      }}
      {...props}
    />
  )
}