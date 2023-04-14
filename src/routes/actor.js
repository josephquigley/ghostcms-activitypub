import express from 'express'
import { postGetRoute } from './post.js'
import { profileRoute } from './profile.js'
import { outbox } from './outbox.js'
import { postInbox } from './inbox.js'
import { url } from '../constants.js'
import { Database } from '../db.js'
import { featuredRoute } from './featured.js'
import { likedRoute } from './liked.js'

const db = new Database()

function orderedCollection (id) {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id,
    type: 'OrderedCollection',
    totalItems: 0,
    first: null
  }
}

function followerCollectionPage (pageNum, next, prev) {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${url.followers}?page=${pageNum}`,
    type: 'OrderedCollectionPage',
    totalItems: 0,
    next: next ? `${url.followers}?page=${next}` : null,
    prev: prev ? `${url.followers}?page=${prev}` : null,
    partOf: url.followers,
    orderedItems: [
    ]
  }
}

async function followersRoute (req, res) {
  const page = parseInt(req.query.page)
  if (isNaN(page)) {
    const payload = orderedCollection(url.followers)
    payload.totalItems = await db.countFollowers()

    if (payload.totalItems > 0) {
      payload.next = `${url.followers}?page=1`
    }
    res.json(payload)
  } else {
    const followers = await db.getFollowers({ page, limit: 15 })
    const payload = followerCollectionPage(page, followers.meta.pagination.next, followers.meta.pagination.prev)

    payload.totalItems = followers.meta.pagination.total
    if (process.env.SHOW_FOLLOWERS === 'true') {
      payload.orderedItems = followers.map(follower => {
        return follower.uri
      })
    }

    res.json(payload)
  }
}

async function followingRoute (req, res) {
  res.json(orderedCollection(url.following))
}

export const actorRouter = express.Router()
  .get('/', profileRoute)
  .get(url.path.publicKey, profileRoute)
  .get(url.path.outbox, outbox)
  .get(url.path.inbox, (req, res) => {
    res.status(401).send('Unauthorized')
  })
  .get(url.path.followers, followersRoute)
  .get(url.path.following, followingRoute)
  .get(url.path.featured, featuredRoute)
  .get(url.path.liked, likedRoute)
  .get('/:postId', postGetRoute)
  .post(url.path.inbox, postInbox)
