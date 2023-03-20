const express = require('express')
const router = express.Router()

const profileURL = 'https://' + process.env.PROFILE_URL.removeHttpURI()
const accountURL = `https://${process.env.ACCOUNT_DOMAIN}${process.env.API_ROOT_PATH}${global.actorPath}/${process.env.ACCOUNT_NAME}`

const webfingerPayload = {
  subject: 'acct:' + process.env.ACCOUNT_NAME + '@' + process.env.ACCOUNT_DOMAIN,
  aliases: [
    profileURL,
    accountURL
  ],
  links: [
    {
      rel: 'http://webfinger.net/rel/profile-page',
      type: 'text/html',
      href: profileURL
    },
    {
      rel: 'self',
      type: 'application/activity+json',
      href: accountURL
    }/*,
    {
      rel: 'http://ostatus.org/schema/1.0/subscribe',
      template: `https://mastodon.social/authorize_interaction?uri={uri}'
    } */
  ]
}

/* Static webfinger for the Ghost activitypub account. */
router.get('/', function (req, res, next) {
  const resource = req.query.resource
  const accountNotFoundMsg = 'Account not found'

  res.set('Access-Control-Allow-Methods', 'GET')

  if (!resource || resource.length === 0 || !resource.startsWith('acct:')) {
    res.status(400)
    res.send("Bad Request: no 'resource' in request query")
    return
  }

  const account = resource.replace(/^acct:/, '')

  if (account === process.env.ACCOUNT_NAME + '@' + process.env.ACCOUNT_DOMAIN) {
    res.json(webfingerPayload)
  } else {
    res.status(404)
    res.send(accountNotFoundMsg)
  }
})

module.exports = router
