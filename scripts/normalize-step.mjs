import {readdirSync,readFileSync,writeFileSync} from "node:fs"
import {join} from "node:path"
// tscircuit 0.0.2687's STEP parser requires `);` with no intervening space.
// Supplier CAD geometry and entity arguments remain unchanged.
for(const dir of readdirSync("imports",{withFileTypes:true}).filter(d=>d.isDirectory())) {
 for(const file of readdirSync(join("imports",dir.name)).filter(f=>f.endsWith(".step"))) {
  const path=join("imports",dir.name,file),source=readFileSync(path,"utf8")
  writeFileSync(path,source.replace(/\)\s+;/g,");").replace(/[\t ]+$/gm,""))
 }
}
