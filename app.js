const express = require('express')
const logger = require('morgan')
const GhostContentAPI = require('@tryghost/content-api')
const utils = require('./utils')
const bodyParser = require('body-parser')

/** Define API paths **/
global.actorPath = '/actors'
global.subscribePath = '/subscribe'
/** End Define API paths **/

/** Define Urls **/
global.staticImagesPath = '/activitypub_static_images'
global.profileURL = 'https://' + utils.removeHttpURI(process.env.PROFILE_URL)
global.accountURL = `https://${process.env.SERVER_DOMAIN}${process.env.API_ROOT_PATH}${global.actorPath}/${process.env.ACCOUNT_USERNAME}`
global.inboxURL = `${global.accountURL}/inbox`
global.outboxURL = `${global.accountURL}/outbox`
global.followersURL = `${global.accountURL}/followers`
global.publicKeyPath = `${global.accountURL}/public_key`
/** End Define Urls **/

/** Define Common Messages **/
global.accountNotFoundMsg = 'Account not found'
/** End Define Common Messages **/

const webfingerRouter = require('./routes/webfinger')
const actorRouter = require('./routes/actor')
const postHandler = require('./routes/post')
const profileHandler = require('./routes/profile')

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
app.set('db', utils.db)

function setAccountCreationDate (dateStr) {
  app.set('account_created_at', dateStr)
}

// Default account creation time if Ghost takes too long to respond before the first account query
setAccountCreationDate(new Date().toISOString())

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
app.use('/publish', express.Router().post('/', postHandler.post))

app.get('*', (req, res) => {
  res.status(404)
  res.send('Resource not found')
})

app.post('*', (req, res) => {
  res.status(404)
  res.send('Resource not found')
})

// Fetch the last 5000 posts and find the oldest
ghost.posts.browse({ limit: 5000 })
  .then((posts) => {
    const oldestPost = posts[posts.length - 1]
    setAccountCreationDate(oldestPost.published_at)
  })
  .catch((err) => {
    // Ignore error
    console.warn('Could not fetch oldest Ghost post')
    console.warn(err)
  })

ghost.settings.browse().then((settings) => {
  app.set('language', settings.lang)
}).catch((err) => {
  console.warn('Could not fetch Ghost language')
  console.warn(err)
})

module.exports = app
