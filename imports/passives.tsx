import type { CapacitorProps, ResistorProps } from "@tscircuit/props"

// Native tscircuit passives, with exact JLCPCB identity. Values are not inferred
// by a parts engine at build time. See sourcing/stock-snapshot.json.
export const resistorParts = {
  r33: ["33", "C23140", "0603WAF330JT5E", 0.01],
  r1k: ["1k", "C21190", "0603WAF1001T5E", 0.01],
  r4k7: ["4.7k", "C23162", "0603WAF4701T5E", 0.01],
  r5k1: ["5.1k", "C23186", "0603WAF5101T5E", 0.01],
  r10k: ["10k", "C25804", "0603WAF1002T5E", 0.01],
  r20k5: ["20.5k", "C2930074", "FRC0603F2052TS", 0.01],
  r40k2: ["40.2k", "C2933218", "FRC0603F4022TS", 0.01],
  r100k: ["100k", "C335088", "ARG03BTC1003", 0.001],
  r432k: ["432k", "C861402", "RT0603BRD07432KL", 0.001],
  r1m: ["1M", "C22935", "0603WAF1004T5E", 0.01],
} as const

export const capacitorParts = {
  c6p8: ["6.8pF", "C1679", "0603CG6R8C500NT", "0603", 50],
  c4n7: ["4.7nF", "C106076", "C1206X472K202T", "1206", 2000],
  c100n: ["100nF", "C14663", "CC0603KRX7R9BB104", "0603", 50],
  c1u: ["1uF", "C113807", "CC0603KRX7R6BB105", "0603", 16],
  c4u7: ["4.7uF", "C2857993", "0805B475K100NT", "0805", 10],
  c10u: ["10uF", "C86038", "GRM21BR71A106KE51L", "0805", 10],
} as const

export const R = ({ part, ...props }: Omit<ResistorProps, "resistance"> & { part: keyof typeof resistorParts }) => {
  const [resistance, lcsc, manufacturerPartNumber] = resistorParts[part]
  return <resistor resistance={resistance} footprint="0603" manufacturerPartNumber={manufacturerPartNumber} supplierPartNumbers={{ jlcpcb: [lcsc] }} {...props} />
}

export const C = ({ part, ...props }: Omit<CapacitorProps, "capacitance"> & { part: keyof typeof capacitorParts }) => {
  const [capacitance, lcsc, manufacturerPartNumber, footprint, maxVoltageRating] = capacitorParts[part]
  // CLI 0.0.2687 applies the capacitor limit to unrelated branches on a shared
  // power net. Local IC-to-cap copper is instead checked strictly (3 mm) by
  // scripts/check-decoupling.mjs; this is the maximum distribution-branch length.
  return <capacitor maxDecouplingTraceLength="80mm" capacitance={capacitance} footprint={footprint} maxVoltageRating={maxVoltageRating} manufacturerPartNumber={manufacturerPartNumber} supplierPartNumbers={{ jlcpcb: [lcsc] }} {...props} />
}
