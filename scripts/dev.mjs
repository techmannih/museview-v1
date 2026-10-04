import {readFileSync,existsSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {join} from "node:path"
import {spawn} from "node:child_process"

// Never fall back to an unrelated global CLI: its browser renderer can change
// the native routing input and correctly invalidate the saved copper.
const root=fileURLToPath(new URL("../",import.meta.url))
const expected=JSON.parse(readFileSync(join(root,"package.json"))).devDependencies.tscircuit
const local=join(root,"node_modules/tscircuit")
let installed
try {installed=JSON.parse(readFileSync(join(local,"package.json"))).version} catch {}
if(installed!==expected || !existsSync(join(local,"cli.mjs"))) {
 console.error(`MuseView requires local tscircuit ${expected}; found ${installed??"none"}. Run bun install --frozen-lockfile, then bun run dev.`)
 process.exit(1)
}
console.log(`MuseView preview: local tscircuit ${installed}`)
const child=spawn(process.execPath,[join(local,"cli.mjs"),"dev","index.circuit.tsx",...process.argv.slice(2)],{cwd:root,stdio:"inherit"})
for(const signal of ["SIGINT","SIGTERM"]) process.on(signal,()=>child.kill(signal))
child.on("error",error=>{console.error(error);process.exitCode=1})
child.on("exit",code=>{process.exitCode=code??1})
