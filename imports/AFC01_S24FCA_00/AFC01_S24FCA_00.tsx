import objPath from "./AFC01_S24FCA_00.obj"
import stepPath from "./AFC01_S24FCA_00.step"
import type { ConnectorProps } from "@tscircuit/props"

const pinLabels = {pin1:["STROBE_NC"],pin2:["AGND"],pin3:["SDA"],pin4:["AVDD"],pin5:["SCL"],pin6:["RESET_N"],pin7:["VSYNC"],pin8:["PWDN"],pin9:["HREF"],pin10:["DVDD"],pin11:["DOVDD"],pin12:["D9"],pin13:["XCLK"],pin14:["D8"],pin15:["DGND"],pin16:["D7"],pin17:["PCLK"],pin18:["D6"],pin19:["D2"],pin20:["D5"],pin21:["D3"],pin22:["D4"],pin23:["D1_NC"],pin24:["D0_NC"],pin25:["MP1"],pin26:["MP2"]} as const

export const AFC01_S24FCA_00 = (props: ConnectorProps) => {
  return (
    <connector
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C262669"
  ]
}}
      manufacturerPartNumber="AFC01-S24FCA-00"
      footprint={<footprint>
        <smtpad portHints={["pin25"]} pcbX="7.44982mm" pcbY="-1.25011815mm" width="1.999996mm" height="1.5999968mm" shape="rect" />
<smtpad portHints={["pin26"]} pcbX="-7.44982mm" pcbY="-1.25011815mm" width="1.999996mm" height="1.5999968mm" shape="rect" />
<smtpad portHints={["pin24"]} pcbX="5.750052mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin23"]} pcbX="5.25018mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin22"]} pcbX="4.750054mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin21"]} pcbX="4.250182mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin20"]} pcbX="3.750056mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin19"]} pcbX="3.250184mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin18"]} pcbX="2.750058mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin17"]} pcbX="2.250186mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin16"]} pcbX="1.75006mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin15"]} pcbX="1.250188mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin14"]} pcbX="0.750062mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin13"]} pcbX="0.25019mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin12"]} pcbX="-0.249936mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin11"]} pcbX="-0.749808mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin10"]} pcbX="-1.249934mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin9"]} pcbX="-1.749806mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin8"]} pcbX="-2.249932mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin7"]} pcbX="-2.749804mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin6"]} pcbX="-3.24993mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin5"]} pcbX="-3.749802mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin4"]} pcbX="-4.249928mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin3"]} pcbX="-4.7498mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin2"]} pcbX="-5.249926mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin1"]} pcbX="-5.749798mm" pcbY="1.40011785mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<silkscreenpath route={[{"x":-8.26389000000006,"y":-2.280088149999983},{"x":-8.26389000000006,"y":-4.370508149999864},{"x":8.256269999999972,"y":-4.370508149999864},{"x":8.256269999999972,"y":-4.243508149999911}]} />
<silkscreenpath route={[{"x":8.250046999999881,"y":-4.275080349999826},{"x":8.263000999999917,"y":-2.2813327499998195}]} />
<silkscreenpath route={[{"x":8.263000999999917,"y":-0.21900514999981624},{"x":8.263000999999917,"y":1.1629834500000698},{"x":6.131102800000008,"y":1.1629834500000698}]} />
<silkscreenpath route={[{"x":-6.131026599999927,"y":1.1630088500000966},{"x":-8.26287400000001,"y":1.1630088500000966},{"x":-8.26287400000001,"y":-0.21892894999996315}]} />
<silkscreencircle pcbX="-6.549898mm" pcbY="1.77502185mm" radius="0.199898mm" />
<silkscreentext text="{NAME}" pcbX="0.00635mm" pcbY="3.04299185mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-8.69981800000005,"y":2.300116550000098},{"x":8.69981800000005,"y":2.300116550000098},{"x":8.69981800000005,"y":-4.557033550000028},{"x":-8.69981800000005,"y":-4.557033550000028},{"x":-8.69981800000005,"y":2.300116550000098}]} />
      </footprint>}
      cadModel={{
        objUrl: objPath,
        stepUrl: stepPath,
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.0000762000000804619, y: 1.6320396499999106, z: -0.03 },
      }}
      {...props}
    />
  )
}