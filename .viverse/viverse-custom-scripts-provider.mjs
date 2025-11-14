import { createQuest, onBeforeInit, onReady } from '../scripts/index.mjs'

const customScriptsProvider = () => ({
  createQuest,
  createBeforeInitCallback: onBeforeInit,
  createReadyCallback: onReady,
})

export default customScriptsProvider
