const express = require('express')
// const path = require('path')
const logger = require('morgan')

// Load config
require('dotenv').config()

/* eslint no-extend-native: ["error", { "exceptions": ["String"] }] */
String.prototype.removeHttpURI = function () {
  return this.replace(/^http[s]*:\/\//, '')
}

/** Sanitize user inputs **/
process.env.ACCOUNT_DOMAIN = process.env.ACCOUNT_DOMAIN.removeHttpURI().replace(/\s+/g, '')

if (process.env.ACCOUNT_DOMAIN === '') {
  throw new Error('.env ACCOUNT_DOMAIN value is required. Got empty.')
}

process.env.API_ROOT_PATH = process.env.API_ROOT_PATH.replace(/\s+/g, '')
if (!process.env.API_ROOT_PATH.startsWith('/')) {
  process.env.API_ROOT_PATH = '/' + process.env.API_ROOT_PATH
}

process.env.API_ROOT_PATH = process.env.API_ROOT_PATH.replace(/\/\s*$/g, '')

if (process.env.SERVER_DOMAIN === '') {
  process.env.SERVER_DOMAIN = process.env.ACCOUNT_DOMAIN
}
process.env.SERVER_DOMAIN = process.env.SERVER_DOMAIN.replace(/\s+/g, '')

if (process.env.PROFILE_URL === '') {
  process.env.PROFILE_URL = 'https://' + process.env.ACCOUNT_DOMAIN
}
/** End Sanitize user inputs **/

/** Define API paths **/
global.actorPath = '/actor'
global.subscribePath = '/subscribe'
/** End Define API paths **/

const webfingerRouter = require('./routes/webfinger')

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*'])
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.append('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use('/.well-known/webfinger', webfingerRouter)

module.exports = app
