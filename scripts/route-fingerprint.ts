// Stable across runtimes; only routing geometry and electrical identities enter
// the fingerprint. A changed footprint, net, via, trace or board rejects replay.
export function routeFingerprint(input: any): string {
  const normalize=(value:any):any => {
    if(typeof value==='number') return Math.round(value*1e6)/1e6
    if(Array.isArray(value)) return value.map(normalize)
    if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().filter(k=>!['circuitJsonMetadata','display_name','isPointToPoint','cacheKey'].includes(k)).map(k=>[k,normalize(value[k])]))
    if(typeof value==='string' && /^connectivity_net\d+$/.test(value)) return 'connectivity-net'
    return value
  }
  const text=JSON.stringify(normalize(input));let a=2166136261,b=0x9e3779b9
  for(let i=0;i<text.length;i++) {a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),2246822519)}
  return `${(a>>>0).toString(16)}-${(b>>>0).toString(16)}-${text.length}`
}
