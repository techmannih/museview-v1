import {readFileSync,writeFileSync} from "node:fs"
const c=JSON.parse(readFileSync("hardware-contract.json","utf8"))
const gpio=Object.fromEntries(Object.entries(c.nets.U1).filter(([p])=>p.startsWith("IO")).map(([p,n])=>[n,Number(p.slice(2))]))
const names={CAM_SDA:"SDA",CAM_SCL:"SCL",CAM_RESET:"RESET",CAM_PWDN:"PWDN",CAM_XCLK:"XCLK",CAM_VSYNC:"VSYNC",CAM_HREF:"HREF",CAM_PCLK:"PCLK",ASK:"ASK",LED_DRIVE:"LED"}
for(let i=0;i<8;i++) names[`CAM_D${i+2}`]=`D${i}`
const limits=c.cameraCore.designLimitsV
const railHeader=`// Hardware divider values only; no ADC measurement is available.\n#define MV_CAMERA_CORE_TARGET_MV ${Math.round(c.rails.CAM_1V3*1000)}\n#define MV_CAMERA_CORE_MIN_MV ${Math.round(limits.min*1000)}\n#define MV_CAMERA_CORE_MAX_MV ${Math.round(limits.max*1000)}\n`
const header="// Generated from hardware-contract.json. Do not edit manually.\n#pragma once\n"+Object.entries(names).map(([net,name])=>`#define MV_${name} ${gpio[net]}\n`).join("")+railHeader
const file="firmware/main/board_pins.h"
if(process.argv.includes("--check")) {if(readFileSync(file,"utf8")!==header) throw Error("Stale firmware pin header")} else writeFileSync(file,header)
