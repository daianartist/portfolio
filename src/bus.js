// tiny event bus: bus('NAME').emit(...) / bus('NAME').on(fn) -> off()
const channels = new Map()

export function bus(name) {
  if (!channels.has(name)) channels.set(name, new Set())
  const set = channels.get(name)
  return {
    on(fn) {
      set.add(fn)
      return () => set.delete(fn)
    },
    emit(...args) {
      set.forEach((fn) => fn(...args))
    },
  }
}
