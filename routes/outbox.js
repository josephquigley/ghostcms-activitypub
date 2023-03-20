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

function postPayload (ghostPost, language) {
  const idURL = `${global.accountURL}/${ghostPost.id}`
  const truncatedContent = ghostPost.custom_excerpt && ghostPost.custom_excerpt.length > 0 ? ghostPost.custom_excerpt : ghostPost.excerpt
  return {
    id: `${idURL}/activity`,
    type: 'Create',
    actor: global.accountURL,
    published: ghostPost.published_at,
    to: [
      'https://www.w3.org/ns/activitystreams#Public'
    ],
    cc: [
      global.followersURL
    ],
    object: {
      id: idURL,
      type: 'Note',
      summary: truncatedContent,
      inReplyTo: null,
      published: ghostPost.published_at,
      url: ghostPost.url,
      attributedTo: global.accountURL,
      to: [
        'https://www.w3.org/ns/activitystreams#Public'
      ],
      cc: [
        global.followersURL
      ],
      sensitive: false,
      atomUri: idURL,
      inReplyToAtomUri: null,
      content: truncatedContent,
      contentMap: {
        language: truncatedContent
      },
      attachment: []
    }
  }
}

let postLimit = 50
if (process.env.MAX_POSTS_IN_OUTBOX) {
  const limit = parseInt(process.env.MAX_POSTS_IN_OUTBOX)

  if (!isNaN(limit)) {
    postLimit = limit
  }
}

let cachedPosts = null
let cachedDate = null

async function getPosts (ghost) {
  const cacheTimeOut = process.env.NODE_ENV === 'dev' ? 5 : 60
  if (cachedPosts === null || (new Date().getTime() / 1000) - (cachedDate.getTime() / 1000) > cacheTimeOut) {
    const posts = await ghost.posts.browse({ limit: postLimit })
    cachedPosts = posts
    cachedDate = new Date()
  }

  return cachedPosts
}

const outbox = async function (req, res, next) {
  const ghost = req.app.get('ghost')

  try {
    const posts = await getPosts(ghost)
    const payload = outboxPayload()
    payload.totalItems = posts.length
    res.json(payload)
    return
  } catch (err) {
    console.error('Could not fetch Ghost posts:\n' + err)
    res.json(outboxPayload())
  }
}

const outboxFirst = async function (req, res, next) {
  const ghost = req.app.get('ghost')
  const language = req.app.get('language')

  try {
    const posts = await getPosts(ghost)

    const postsPayloads = posts.map((post) => {
      return postPayload(post, language)
    })

    const payload = outboxCollectionPayload()
    payload.orderedItems = postsPayloads

    res.json(payload)
    return
  } catch (err) {
    console.error('Could not fetch Ghost posts:\n' + err)
    res.status(500).send('Internal error while fetching posts')
  }
}

module.exports = { outbox, outboxFirst, outboxLast: outboxFirst /* Temporary */ }
