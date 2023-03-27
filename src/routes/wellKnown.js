import express from 'express'
import { url } from '../constants.js'
const wellKnownRouter = express.Router()

const subject = 'acct:' + process.env.ACCOUNT_USERNAME + '@' + process.env.SERVER_DOMAIN

const webfingerPayload = {
  subject,
  aliases: [
    subject,
    url.profile,
    url.account
  ],
  links: [
    {
      rel: 'http://webfinger.net/rel/profile-page',
      type: 'text/html',
      href: url.profile
    },
    {
      rel: 'self',
      type: 'application/activity+json',
      href: url.account
    }

    /*
    {
      rel: 'http://ostatus.org/schema/1.0/subscribe',
      template: `${url.account}/ostatus_subscribe?uri={uri}`
    } */
  ]
}

/* Static webfinger for the Ghost activitypub account. */
wellKnownRouter.get('/webfinger', function (req, res, next) {
  const resource = req.query.resource

  res.set('Access-Control-Allow-Methods', 'GET')

  if (!resource || resource.length === 0 || !resource.startsWith('acct:')) {
    res.status(400)
    res.send("Bad Request: no 'resource' in request query")
    return
  }

  const account = resource.replace(/^acct:/, '')

  if (account === (process.env.ACCOUNT_USERNAME + '@' + process.env.SERVER_DOMAIN)) {
    res.json(webfingerPayload)
  } else {
    res.status(404)
    res.send('Account not found')
  }
})

wellKnownRouter.get('/host-meta', function (req, res, next) {
  res.set('Access-Control-Allow-Methods', 'GET')
  res.set('Content-Type', 'application/xml')
  res.send(`
  <?xml version="1.0" encoding="UTF-8"?>
  <XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
    <Link rel="lrdd" template="https://${process.env.SERVER_DOMAIN}/.well-known/webfinger?resource={uri}"/>
  </XRD>  
  `)
})

export default wellKnownRouter
