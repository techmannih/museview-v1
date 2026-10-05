// Self-contained unidirectional TVS symbol, facing up. Explicit supplier pin
// numbers keep the schematic cathode aligned with SMF5.0A pad 1.
// Primitive paths render without a viewer-side schematic-symbols catalog.
export const TVSSymbol = () => (
  <symbol>
    <port name="cathode" pinNumber={1} aliases={["C", "neg"]} schX={0} schY={0.25} direction="up" />
    <port name="anode" pinNumber={2} aliases={["A", "pos"]} schX={0} schY={-0.25} direction="down" />
    <schematicpath points={[{x:0,y:-0.25},{x:0,y:-0.12}]} strokeWidth={0.02} />
    <schematicpath points={[{x:-0.12,y:-0.12},{x:0,y:0.12},{x:0.12,y:-0.12},{x:-0.12,y:-0.12}]} strokeWidth={0.02} />
    <schematicpath points={[{x:-0.14,y:0.07},{x:-0.12,y:0.12},{x:0.12,y:0.12},{x:0.14,y:0.17}]} strokeWidth={0.02} />
    <schematicpath points={[{x:0,y:0.12},{x:0,y:0.25}]} strokeWidth={0.02} />
    <schematictext text="{REF}" schX={0.14} schY={0.2} fontSize={0.18} anchor="left" color="#006464" />
    <schematictext text="SMF5.0A" schX={0.2} schY={-0.14} fontSize={0.18} anchor="left" color="#006464" />
  </symbol>
)
