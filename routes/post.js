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

  return postPayload
}

let language = null
async function getLanguageAsync (ghostAPI) {
  if (!language) {
    language = await ghostAPI.settings.browse().lang
  }
  return language
}

const POST_QUERY_LIMIT = 2
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

const postGetRoute = async function (req, res) {
  const postId = req.params.postId
  if (!postId) {
    return res.status(400).send('Bad request.')
  }

  const ghost = req.app.get('ghost')

  try {
    const post = await ghost.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })

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
  const postId = req.body.post.id ? req.body.post.id : req.body.post.current.id
  const ghost = req.app.get('ghost')
  const db = req.app.get('db')

  try {
    const post = await ghost.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })
    const followers = await db.all('select follower_uri from followers')

    followers.forEach(async (follower) => {
      const postObject = createPostPayload(post, getLanguageAsync(ghost))
      const postPayload = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `${global.accountURL}/create-${postObject.id}`,
        type: 'Create',
        actor: global.accountURL,
        object: postObject,
        to: 'https://www.w3.org/ns/activitystreams#Public'
      }

      // TODO: Fetch actor first, then get its inbox rather than infer it to be /inbox
      utils.signAndSend(postPayload, { inbox: follower.follower_uri + '/inbox' })
    })

    res.status(200)
  } catch (err) {
    // TODO send 500 error if ghost post call fails
    res.status(404).send(err.message)
  }
}

module.exports = {
  routers: {
    get: postGetRoute,
    publish: postPublishRoute
  },
  createPostPayload,
  getPostsAsync,
  getLanguageAsync
}
