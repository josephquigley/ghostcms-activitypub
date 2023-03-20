const express = require('express')
const post = require('./post')
const profile = require('./profile')
const outbox = require('./outbox')
const inbox = require('./inbox')
const utils = require('../utils')

module.exports = express.Router()
  .get('/', profile)
  .get('/public_key', (req, res) => {
    res.set('Content-Type', 'application/pgp-keys').send(utils.pubKey)
  })
  .get('/outbox/first', outbox.outboxFirst)
  .get('/outbox/last', outbox.outboxLast)
  .get('/outbox', outbox.outbox)
  .get('/inbox', (req, res) => {
    res.status(501).send('Not implemented')
  })
  .get('/:postId', post.get)
  .post('/inbox', inbox)
  .post('/outbox', (req, res) => {
    res.status(501).send('Not implemented')
  })
