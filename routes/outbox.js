const Post = require('./post')

function outboxPayload () {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: global.outboxURL,
    type: 'OrderedCollection',
    totalItems: 0,
    first: `${global.outboxURL}/first`,
    last: `${global.outboxURL}/last`
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

    partOf: global.outboxURL,
    orderedItems: []
  }
}

const outbox = async function (req, res, next) {
  const ghost = req.app.get('ghost')

  if (req.query && req.query.page) {
    return outboxPage(req, res, next)
  }

  try {
    const posts = await Post.getPostsAsync(ghost)
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
  const ghost = req.app.get('ghost')

  try {
    const page = parseInt(req.query.page)
    const posts = await Post.getPostsAsync(ghost, { page })
    const payload = outboxCollectionPayload()
    payload.orderedItems = posts.posts

    // Pagination relies on the Ghost api matching the same next/prev null/int format as ActivityPub
    // This could break if Ghost changes the behavior
    payload.next = `${global.outboxURL}?page=${Math.min(posts.pagination.next, posts.pagination.pages)}`
    payload.prev = `${global.outboxURL}?page=${Math.min(posts.pagination.prev, posts.pagination.pages)}`

    res.json(payload)
    return
  } catch (err) {
    console.error('Could not fetch Ghost posts:\n' + err)
    res.status(500).send('Internal error while fetching posts')
  }
}

module.exports = {
  routers: {
    outbox,
    outboxPage
  }
}
