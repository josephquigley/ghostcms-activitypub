const utils = require('../utils')

function createPost (ghostPost, language) {
  const id = `https://${process.env.SERVER_DOMAIN}${global.actorPath}/${process.env.ACCOUNT_USERNAME}/${ghostPost.id}`

  const postPayload = {
    id,
    published: ghostPost.published_at,
    sensitive: false,
    summary: '',
    visibility: 'public',
    language,
    uri: id,
    url: ghostPost.url,
    content: ghostPost.html,
    type: 'Article',
    to: 'https://www.w3.org/ns/activitystreams#Public',
    attributedTo: global.accountURL
  }

  if (ghostPost.excerpt) {
    postPayload.summary = ghostPost.excerpt
  } else if (ghostPost.custom_excerpt) {
    postPayload.summary = ghostPost.custom_excerpt
  }

  // Check to see if the summary ends with punctuation, otherwise assume the text got cut off and add elipses.
  if (postPayload.summary.match(/[\d\w]$/g)) {
    postPayload.summary += '...'
  }

  postPayload.summary = `${ghostPost.title}\n\n${postPayload.summary}`

  // if (ghostPost.tags && ghostPost.tags.length > 0) {
  //   postPayload.tags = ghostPost.tags.map((tag) => {
  //     return `#${tag.name.replace(/\s+/, '')}`
  //   })
  // }

  return postPayload
}

const postGet = async function (req, res) {
  const postId = req.params.postId
  if (!postId) {
    return res.status(400).send('Bad request.')
  }

  const ghost = req.app.get('ghost')

  try {
    const post = await ghost.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })

    res.json(createPost(post, req.app.get('language')))
  } catch (e) {
    // TODO send 500 error if ghost post call fails
    res.status(404).send(e.message)
  }
}

const postPublish = async function (req, res) {
  const postId = req.body.post.id ? req.body.post.id : req.body.post.current.id
  const ghost = req.app.get('ghost')
  const db = req.app.get('db')

  try {
    const post = await ghost.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })
    const followers = await db.all('select follower_uri from followers')

    followers.forEach(async (follower) => {
      const postObject = createPost(post, req.app.get('language'))
      const postPayload = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `${global.accountURL}/create-${postObject.id}`,
        type: 'Create',
        actor: global.accountURL,
        object: postObject,
        to: 'https://www.w3.org/ns/activitystreams#Public'
      }

      console.log(JSON.stringify(postPayload))

      // TODO: Fetch actor first, then get its inbox rather than infer it to be /inbox
      utils.signAndSend(postPayload, { inbox: follower.follower_uri + '/inbox' })
    })

    res.status(200)
  } catch (err) {
    // TODO send 500 error if ghost post call fails
    res.status(404).send(err.message)
  }
}

module.exports = { get: postGet, post: postPublish }
