const express = require('express')
const post = require('./post')
const profile = require('./profile')

module.exports = express.Router()
  .get('/', profile)
  .get('/:postId', post.get)
