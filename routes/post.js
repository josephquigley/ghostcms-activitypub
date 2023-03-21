const utils = require('../utils')

function createPost (ghostPost, language) {
  const postPayload = {
    id: ghostPost.id,
    created_at: ghostPost.published_at,
    in_reply_to_id: null,
    in_reply_to_account_id: null,
    sensitive: false,
    spoiler_text: '',
    visibility: 'public',
    language,
    uri: `https://${process.env.SERVER_DOMAIN}${process.env.API_ROOT_PATH}${global.actorPath}/${process.env.ACCOUNT_USERNAME}/${ghostPost.id}`,
    url: ghostPost.url,
    content: ghostPost.html
  }

  if (ghostPost.excerpt) {
    postPayload.spoiler_text = ghostPost.excerpt
  } else if (ghostPost.custom_excerpt) {
    postPayload.spoiler_text = ghostPost.custom_excerpt
  }

  if (ghostPost.tags && ghostPost.tags.length > 0) {
    postPayload.tags = ghostPost.tags.map((tag) => {
      return `#${tag.name.replace(/\s+/, '')}`
    })
  }

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
        id: `${global.accountURL}/${postObject.id}`,
        type: 'Create',
        actor: global.accountURL,
        object: postObject,
        to: [follower.follower_uri, 'https://www.w3.org/ns/activitystreams#Public']
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

module.exports = { get: postGet, post: postPublish }
