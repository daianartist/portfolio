// global app state
export const store = {
  theme: 'white', // 'white' | 'black'
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  sceneReady: false,
  scene: null,
}
