import { ensureInitialData } from './init'

ensureInitialData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
