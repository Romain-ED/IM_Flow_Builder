import { createApp } from './app.js'

const port = Number(process.env.VCR_PORT || process.env.PORT || 3000)
const host = process.env.VCR_HOST || '0.0.0.0'
const server = createApp()

server.listen(port, host, () => {
  console.log(`IM Flow Builder listening on http://${host}:${port}`)
})
