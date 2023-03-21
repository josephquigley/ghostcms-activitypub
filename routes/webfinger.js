const express = require('express')
const router = express.Router()

const subject = 'acct:' + process.env.ACCOUNT_USERNAME + '@' + process.env.SERVER_DOMAIN

const webfingerPayload = {
  subject,
  aliases: [
    subject,
    global.profileURL,
    global.accountURL
  ],
  links: [
    {
      rel: 'http://webfinger.net/rel/profile-page',
      type: 'text/html',
      href: global.profileURL
    },
    {
      rel: 'self',
      type: 'application/activity+json',
      href: global.accountURL
    }

    /*
    {
      rel: 'http://ostatus.org/schema/1.0/subscribe',
      template: `${global.accountURL}/ostatus_subscribe?uri={uri}`
    } */
  ]
}

/* Static webfinger for the Ghost activitypub account. */
router.get('/', function (req, res, next) {
  const resource = req.query.resource

  res.set('Access-Control-Allow-Methods', 'GET')

  if (!resource || resource.length === 0 || !resource.startsWith('acct:')) {
    res.status(400)
    res.send("Bad Request: no 'resource' in request query")
    return
  }

  const account = resource.replace(/^acct:/, '')

  const debugAccount = process.env.NODE_ENV === 'dev' && account === process.env.ACCOUNT_USERNAME + '@' + process.env.SERVER_DOMAIN

  if (account === process.env.ACCOUNT_USERNAME + '@' + process.env.GHOST_SERVER || debugAccount) {
    res.json(webfingerPayload)
  } else {
    res.status(404)
    res.send(global.accountNotFoundMsg)
  }
})

module.exports = router
