import { readFileSync } from "node:fs"
export const readCircuit = (path = process.argv[2] ?? "dist/index/circuit.json") => JSON.parse(readFileSync(path,"utf8"))
export function model(circuit) {
  const of = type => circuit.filter(e => e.type === type)
  const component = ref => of("source_component").find(e => e.name === ref)
  const port = (ref,pin) => of("source_port").find(e => e.source_component_id === component(ref)?.source_component_id && (e.port_hints?.includes(String(pin)) || e.pin_number === pin))
  // Recompute connectivity from the source graph; do not trust cached net keys.
  const parent = new Map()
  const find = x => { if (!parent.has(x)) parent.set(x,x); if (parent.get(x)!==x) parent.set(x,find(parent.get(x))); return parent.get(x) }
  const join = ids => { for (const id of ids.slice(1)) parent.set(find(id),find(ids[0])) }
  for (const t of of("source_trace")) join([...(t.connected_source_port_ids??[]),...(t.connected_source_net_ids??[])])
  for (const c of of("source_component")) for (const pair of c.internally_connected_source_port_ids??[]) join(pair)
  const net = name => of("source_net").find(e => e.name===name)
  const on = (ref,pin,name) => {const p=port(ref,pin), n=net(name); return !!p && !!n && find(p.source_port_id)===find(n.source_net_id)}
  return {of,component,port,net,on,find}
}
export function finish(label,errors) {
  for (const e of errors) console.error(e)
  console.log(`${label}: ${errors.length} errors`)
  if (errors.length) process.exitCode=1
}
