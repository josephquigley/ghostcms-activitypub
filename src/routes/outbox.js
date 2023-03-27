import { getPostsAsync } from './post.js'
import { Ghost } from '../ghost.js'
import { url } from '../constants.js'

function outboxPayload () {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: url.outbox,
    type: 'OrderedCollection',
    totalItems: 0,
    first: `${url.outbox}/first`,
    last: `${url.outbox}/last`
  }
}

function outboxCollectionPayload (id) {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id,
    type: 'OrderedCollectionPage',
    // TODO: Change this to by dynamic paging
    next: null,
    prev: null,

    partOf: url.outbox,
    orderedItems: []
  }
}

export const outbox = async function (req, res, next) {
  if (req.query && req.query.page) {
    return outboxPage(req, res, next)
  }

  try {
    const posts = await getPostsAsync(Ghost)
    const payload = outboxPayload()
    payload.totalItems = posts.pagination.total
    res.json(payload)
    return
  } catch (err) {
    console.error('Could not fetch Ghost posts:\n' + err)
    res.json(outboxPayload())
  }
}

const outboxPage = async function (req, res, next) {
  try {
    const page = parseInt(req.query.page)
    const posts = await getPostsAsync({ page })
    const payload = outboxCollectionPayload()
    payload.orderedItems = posts.posts

    // Pagination relies on the Ghost api matching the same next/prev null/int format as ActivityPub
    // This could break if Ghost changes the behavior
    payload.next = `${url.outbox}?page=${Math.min(posts.pagination.next, posts.pagination.pages)}`
    payload.prev = `${url.outbox}?page=${Math.min(posts.pagination.prev, posts.pagination.pages)}`

    res.json(payload)
    return
  } catch (err) {
    console.error('Could not fetch Ghost posts:\n' + err)
    res.status(500).send('Internal error while fetching posts')
  }
}
