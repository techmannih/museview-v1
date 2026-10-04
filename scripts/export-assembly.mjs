import { mkdirSync,writeFileSync,readFileSync } from "node:fs"
import { model,readCircuit } from "./circuit.mjs"
import { placementReview } from "./placement-review.mjs"
const m=model(readCircuit()),stock=JSON.parse(readFileSync("sourcing/stock-snapshot.json","utf8"))
const rows=new Map(),placements=[];const b=m.of("pcb_board")[0]
const quote=s=>`"${String(s??"").replaceAll('"','""')}"`
const csv=rows=>rows.map(r=>r.map(quote).join(",")).join("\n")+"\n"
for(const c of m.of("source_component")) {
 const p=m.of("pcb_component").find(e=>e.source_component_id===c.source_component_id)
 if(!p||p.do_not_place) continue
 if(p.layer!=="top") throw Error(`${c.name}: bottom assembly is prohibited`)
 const id=c.supplier_part_numbers?.jlcpcb?.[0];if(!id) throw Error(`${c.name}: no JLC part`)
 if(!rows.has(id)) rows.set(id,{id,mpn:c.manufacturer_part_number,refs:[],stock:stock.find(e=>e.id===id)})
 rows.get(id).refs.push(c.name)
 placements.push([c.name,p.center.x.toFixed(4)+"mm",p.center.y.toFixed(4)+"mm",p.layer==='top'?'Top':'Bottom',p.rotation??0])
}
mkdirSync("release",{recursive:true})
const groups=[...rows.values()].sort((a,b)=>a.refs[0].localeCompare(b.refs[0],undefined,{numeric:true}))
writeFileSync("release/jlc-bom.csv",csv([["Comment","Designator","Footprint","LCSC Part #"],...groups.map(g=>[g.mpn,g.refs.join(","),g.stock?.part?.package,g.id])]))
writeFileSync("release/jlc-cpl.csv",csv([["Designator","Mid X","Mid Y","Layer","Rotation"],...placements]))
writeFileSync("sourcing/bom-with-stock.csv",csv([["LCSC","Manufacturer part","References","Quantity per board","Stock snapshot","Checked UTC","Evidence"],...groups.map(g=>[g.id,g.mpn,g.refs.join(" "),g.refs.length,g.stock?.part?.stock,g.stock?.checkedAt,g.stock?.url])]))
const summary={fittedComponents:placements.length,uniqueParts:groups.length,topComponents:placements.length,bottomComponents:0,boardSizeMm:{width:b.width,height:b.height},probePads:m.of("source_component").filter(c=>c.name.startsWith("TP")).length,stockUnavailable:groups.filter(g=>!(g.stock?.part?.stock>0)).map(g=>g.id),cplOrigin:"board center; same unshifted origin as Gerber/drill exports",rotationStatus:"Footprint rotation; JLC preview still requires physical orientation review"}
writeFileSync("release/assembly-summary.json",JSON.stringify(summary,null,2)+"\n")
writeFileSync("release/placement-review.json",JSON.stringify(placementReview(readFileSync("dist/index/circuit.json")),null,2)+"\n")
console.log(summary)
