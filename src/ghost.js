import pkg from '@tryghost/content-api'
const GhostContentAPI = pkg

export const Ghost = new GhostContentAPI({
  url: `https://${process.env.GHOST_SERVER}`,
  key: process.env.GHOST_CONTENT_API_KEY,
  version: 'v5.0'
})
