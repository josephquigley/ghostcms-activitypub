import express from 'express'
import pkg from 'morgan'

import { url, key } from './src/constants.js'
import bodyParser from 'body-parser'

import wellKnownRouter from './src/routes/wellKnown.js'
import { actorRouter } from './src/routes/actor.js'
import { postDeleteRoute, postPublishRoute } from './src/routes/post.js'
import { profileRoute } from './src/routes/profile.js'
import { router as tagsRouter } from './src/routes/tags.js'
const logger = pkg

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json({ type: 'application/activity+json' })) // support json encoded bodies

try {
  app.set('apiKey', key.api)
} catch (err) {
  console.error('ERROR: Could not load API key\n', err)
  process.exit(1)
}

app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*'])
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.append('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use('/.well-known', wellKnownRouter)
app.get(`${url.path.actor}/${process.env.ACCOUNT_USERNAME}.json`, profileRoute)
app.use(`${url.path.actor}/${process.env.ACCOUNT_USERNAME}`, actorRouter)
app.use(url.path.staticImages, express.static('img'))
app.use(url.path.publish, express.Router().post('/', postPublishRoute))
app.use(url.path.delete, express.Router().post('/', postDeleteRoute))
app.use(url.path.tags, tagsRouter)

app.get('/', (req, res) => {
  res.redirect(url.profile)
})
app.get('*', (req, res) => {
  res.status(404)
  res.send('Resource not found')
})

app.post('*', (req, res) => {
  res.status(404)
  res.send('Resource not found')
})

export default app
