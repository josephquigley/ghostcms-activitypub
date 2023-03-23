const utils = require('../utils')
const Tag = require('./tags')

function createPostPayload (ghostPost, language) {
  const id = `https://${process.env.SERVER_DOMAIN}${global.actorPath}/${process.env.ACCOUNT_USERNAME}/${ghostPost.id}`

  const postPayload = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      {
        Hashtag: 'as:Hashtag'
      }
    ],
    id,
    published: ghostPost.published_at,
    sensitive: false,
    summary: null,
    visibility: 'public',
    language,
    uri: id,
    url: ghostPost.url,
    content: null,
    type: 'Article',
    to: 'https://www.w3.org/ns/activitystreams#Public',
    cc: [
      `${global.followersURL}`
    ],
    attributedTo: global.accountURL,
    tag: []
  }

  if (ghostPost.excerpt) {
    postPayload.summary = ghostPost.excerpt
  } else if (ghostPost.custom_excerpt) {
    postPayload.summary = ghostPost.custom_excerpt
  }

  postPayload.summary = `${ghostPost.title}\n\n${postPayload.summary}`

  // Check to see if the summary ends with punctuation, otherwise assume the text got cut off and add elipses.
  if (postPayload.summary.match(/[\d\w]$/g)) {
    postPayload.summary += '...'
  }

  if (ghostPost.tags && ghostPost.tags.length > 0) {
    postPayload.tag = ghostPost.tags.map(Tag.createTagPayload)
  }

  postPayload.content = ghostPost.html

  return JSON.stringify(postPayload)
}

let language = null
async function getLanguageAsync (ghostAPI) {
  if (!language) {
    language = await ghostAPI.settings.browse().lang
  }
  return language
}

const POST_QUERY_LIMIT = 10
async function getPostsAsync (ghostAPI, filters) {
  filters = filters || { include: 'tags' }

  if (!filters.include) {
    filters.include = 'tags'
  }

  if (!filters.include.includes('tags')) {
    filters.include += ',tags'
  }

  if (!filters.limit) {
    filters.limit = POST_QUERY_LIMIT
  }

  const language = await getLanguageAsync(ghostAPI)
  const posts = await ghostAPI.posts.browse(filters)

  return {
    posts: posts.map((post) => {
      return createPostPayload(post, language)
    }),
    pagination: posts.meta.pagination
  }
}

async function getPostAsync (ghostAPI, postId) {
  return await ghostAPI.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })
}

async function getFollowersAsync (db) {
  return await db.all('select follower_uri from followers')
}

function createNotification (type, object) {
  return JSON.stringify({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${global.accountURL}/${type.replace(/[\s]+/g, '').toLowerCase()}-${object.id}`,
    type,
    actor: global.accountURL,
    object,
    to: 'https://www.w3.org/ns/activitystreams#Public',
    cc: [
      `${global.followersURL}`
    ]
  })
}

const postGetRoute = async function (req, res) {
  const postId = req.params.postId
  if (!postId) {
    return res.status(400).send('Bad request.')
  }

  const ghost = req.app.get('ghost')

  try {
    const post = await getPostAsync(ghost, postId)

    res.json(createPostPayload(post, getLanguageAsync(ghost)))
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).send(err.response.statusText)
    } else {
      console.error(err)
      res.status(500).send('Unable to fetch post.')
    }
  }
}

const postPublishRoute = async function (req, res) {
  if (req.query.apiKey != req.app.get('apiKey')) { // eslint-disable-line eqeqeq
    res.status(401).send()
    return
  }
  
  const postId = req.body.post.id ? req.body.post.id : req.body.post.current.id
  const ghost = req.app.get('ghost')
  const db = req.app.get('db')

  try {
    const post = await getPostAsync(ghost, postId)
    const followers = await getFollowersAsync(db)
    const language = await getLanguageAsync(ghost)
    const postObject = createPostPayload(post, language)

    if (followers.length > 0) {
      followers.forEach(async (follower) => {
      // TODO: Fetch actor first, then get its inbox rather than infer it to be /inbox
        utils.signAndSend(createNotification('Destroy', postObject), { inbox: follower.follower_uri + '/inbox' })
      })
    }

    res.status(200).send()
  } catch (err) {
    // TODO send 500 error if ghost post call fails
    res.status(404).send(err.message)
  }
}

const postDeleteRoute = async function (req, res) {
  if (req.query.apiKey != req.app.get('apiKey')) { // eslint-disable-line eqeqeq
    res.status(401).send()
    return
  }

  const ghost = req.app.get('ghost')
  const db = req.app.get('db')

  try {
    const followers = await getFollowersAsync(db)
    const language = await getLanguageAsync(ghost)
    const post = req.body.post.id ? req.body.post : req.body.post.current
    const postObject = createPostPayload(post, language)

    if (followers.length > 0) {
      followers.forEach(async (follower) => {
      // TODO: Fetch actor first, then get its inbox rather than infer it to be /inbox
        utils.signAndSend(createNotification('Destroy', postObject), { inbox: follower.follower_uri + '/inbox' })
      })
    }

    res.status(200).send()
  } catch (err) {
    // TODO send 500 error if ghost post call fails
    res.status(404).send(err.message)
  }
}

module.exports = {
  routers: {
    get: postGetRoute,
    publish: postPublishRoute,
    delete: postDeleteRoute
  },
  createPostPayload,
  getPostsAsync,
  getLanguageAsync
}
