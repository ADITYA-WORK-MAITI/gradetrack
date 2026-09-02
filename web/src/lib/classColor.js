// Deterministic class colour: a small fixed palette indexed by class id.
// Red is deliberately absent — it's reserved for at-risk / absent semantics.
export const CLASS_PALETTE = [
  '#1967d2', // blue
  '#188038', // green
  '#8430ce', // purple
  '#007b83', // teal
  '#e37400', // orange
  '#b06000', // brown
  '#d01884', // pink
]

export const classColor = (id) => CLASS_PALETTE[Math.abs(Number(id) || 0) % CLASS_PALETTE.length]
