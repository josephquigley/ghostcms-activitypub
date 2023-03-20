const express = require('express')
const post = require('./post')
const profile = require('./profile')
const utils = require('../utils')

module.exports = express.Router()
  .get('/', profile)
  .get('/public_key', (req, res) => {
    res.set('Content-Type', 'application/pgp-keys').send(utils.pubKey)
  })
  .get('/:postId', post.get)
