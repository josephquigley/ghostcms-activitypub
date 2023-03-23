const express = require('express')
const logger = require('morgan')
const GhostContentAPI = require('@tryghost/content-api')
const utils = require('./utils')
const bodyParser = require('body-parser')
const fs = require('fs')

/** Define API paths **/
global.actorPath = `${process.env.API_ROOT_PATH}/actors`
global.subscribePath = `${process.env.API_ROOT_PATH}/subscribe`
/** End Define API paths **/

/** Define Urls **/
global.staticImagesPath = `${process.env.API_ROOT_PATH}/activitypub_static_images`
global.profileURL = 'https://' + utils.removeHttpURI(process.env.PROFILE_URL)
global.accountURL = `https://${process.env.SERVER_DOMAIN}${global.actorPath}/${process.env.ACCOUNT_USERNAME}`
global.inboxURL = `${global.accountURL}/inbox`
global.outboxURL = `${global.accountURL}/outbox`
global.followersURL = `${global.accountURL}/followers`
global.publicKeyPath = `${global.accountURL}/public_key`
global.tagsPath = `${process.env.API_ROOT_PATH}/tags`
global.tagsURL = `https://${process.env.SERVER_DOMAIN}${global.tagsPath}`
/** End Define Urls **/

/** Define Common Messages **/
global.accountNotFoundMsg = 'Account not found'
/** End Define Common Messages **/

const webfingerRouter = require('./routes/webfinger')
const actorRouter = require('./routes/actor')
const Post = require('./routes/post')
const profileHandler = require('./routes/profile')
const Tags = require('./routes/tags')

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json({ type: 'application/activity+json' })) // support json encoded bodies

const ghost = new GhostContentAPI({
  url: `https://${process.env.GHOST_SERVER}`,
  key: process.env.GHOST_CONTENT_API_KEY,
  version: 'v5.0'
})

app.set('ghost', ghost)
app.set('db', utils.db())

try {
  app.set('apiKey', fs.readFileSync(utils.apiKeyPath))
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

app.use('/.well-known/webfinger', webfingerRouter)
app.get(`${global.actorPath}/${process.env.ACCOUNT_USERNAME}.json`, profileHandler)
app.use(`${global.actorPath}/${process.env.ACCOUNT_USERNAME}`, actorRouter)
app.use(global.staticImagesPath, express.static('img'))
app.use(`${process.env.API_ROOT_PATH}/publish`, express.Router().post('/', Post.routers.publish))
app.use(`${process.env.API_ROOT_PATH}/delete`, express.Router().post('/', Post.routers.delete))
app.use(global.tagsPath, Tags.router)

app.get('/', (req, res) => {
  res.redirect(global.profileURL)
})
app.get('*', (req, res) => {
  res.status(404)
  res.send('Resource not found')
})

app.post('*', (req, res) => {
  res.status(404)
  res.send('Resource not found')
})

module.exports = app
