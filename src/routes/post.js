import { createTagPayload } from './tags.js'
import { Ghost } from '../ghost.js'
import { url } from '../constants.js'
import { Database, PostPublishState } from '../db.js'
import ActivityPub from '../activitypub.js'

const db = new Database()

export function createPostPayload (ghostPost, language, postState) {
  if (!(postState instanceof PostPublishState)) {
    throw new Error('createPostPayload() requires a `postState`, got ' + typeof postState)
  }

  language ??= 'en'

  const id = postState.activityPubId

  const postPayload = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      {
        Hashtag: 'as:Hashtag',
        toot: 'http://joinmastodon.org/ns#'
      }
    ],
    id,
    published: ghostPost.published_at,
    sensitive: false,
    summary: null,
    visibility: 'public',
    language,
    uri: id,
    url: ghostPost.url ?? null,
    atomUri: id,
    content: null,
    type: 'Article',
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [
      `${url.followers}`
    ],
    attributedTo: url.account,
    tag: []
  }

  const excerpt = ghostPost.excerpt || ghostPost.custom_excerpt
  postPayload.summary = `${ghostPost.title}\n\n${excerpt}`

  // Check to see if the summary ends with punctuation, otherwise assume the text got cut off and add elipses.
  // Only add punctuation if the summary is shorter than the body
  if (excerpt.match(/[\d\w]$/g) && (ghostPost.plaintext != excerpt)) { // eslint-disable-line eqeqeq
    postPayload.summary += '...'
  }

  if (ghostPost.tags && ghostPost.tags.length > 0) {
    postPayload.tag = ghostPost.tags.map(createTagPayload)
  }

  postPayload.content = ghostPost.html
  return postPayload
}

const POST_QUERY_LIMIT = 10
export async function getPostsAsync (filters, language) {
  filters = filters ?? { include: 'tags' }

  if (!filters.include) {
    filters.include = 'tags'
  }

  if (!filters.include.includes('tags')) {
    filters.include += ',tags'
  }

  if (!filters.limit) {
    filters.limit = POST_QUERY_LIMIT
  }

  const posts = await Ghost.posts.browse(filters)
  const activityPubPosts = posts.map(async (post) => {
    const postStates = await db.getPostState(post.id, 'published')
    let postState = postStates[0]

    // Older posts may not have been published to the Fediverse, so a new post state must be created for them
    if (postStates.length === 0) {
      postState = await db.createPostState(post)
    }
    return createPostPayload(post, language, postState)
  })

  return Promise.all(activityPubPosts).then(activityPubPosts => {
    return {
      posts: activityPubPosts,
      pagination: posts.meta.pagination
    }
  })
}

export async function getPostAsync (postId) {
  postId = postId.replace(/_[\d]+$/g, '')
  return await Ghost.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })
}

export const postGetRoute = async function (req, res) {
  const postId = req.params.postId
  const language = req.app.get('language')
  if (!postId) {
    return res.status(400).send('Bad request.')
  }

  try {
    const post = await getPostAsync(postId)
    const postStates = await db.getPostState(postId, 'published')

    if (postStates.length === 0) {
      res.status(404).send()
      return
    }

    res.json(createPostPayload(post, language, postStates[0]))
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).send(err.response.statusText)
    } else {
      console.error(err)
      res.status(500).send('Unable to fetch post.')
    }
  }
}

export const postPublishRoute = async function (req, res) {
  if (req.query.apiKey != req.app.get('apiKey')) { // eslint-disable-line eqeqeq
    res.status(401).send()
    return
  }

  const language = req.app.get('language')

  try {
    const post = req.body.post.current
    const postState = await db.createPostState(post)

    const followers = await db.getFollowers()
    const postObject = createPostPayload(post, language, postState)

    followers.forEach(follower => {
      ActivityPub.enqueue(async () => {
        try {
          await ActivityPub.sendMessage(ActivityPub.createNotification('Create', postObject), follower.inbox)
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error(err)
          }
          // If account is gone, delete follower
          if (err.statusCode === 410) {
            await db.deleteFollowerWithUri(follower.inbox)
          }
        }
      })
    })

    res.status(200).send()
    return
  } catch (err) {
    console.error(err.message)
    if (err.statusCode) {
      res.status(err.statusCode).send(err.message)
    } else {
      res.status(500).send('Unable to publish post')
    }
  }
}

export const postDeleteRoute = async function (req, res) {
  if (req.query.apiKey != req.app.get('apiKey')) { // eslint-disable-line eqeqeq
    res.status(401).send()
    return
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(req.body))
  }

  try {
    const followers = await db.getFollowers()
    const id = req.body.post.current.id ?? req.body.post.previous.id
    const status = req.body.post.previous.status

    const postState = await db.getPostState(id, status)
    if (postState.length === 0) {
      throw new Error('Expected a post state, but got none back for:', id, status)
    }

    // Get the most recent state
    const activityPubId = postState[0].activityPubId

    // Mark the post state as deleted if deleted
    if (req.body.post.current === {}) {
      await db.createPostState({ id, status: 'deleted' })
    }

    followers.forEach(follower => {
      ActivityPub.enqueueMessage(ActivityPub.createNotification('Delete', activityPubId), follower.inbox)
    })

    res.status(200).send()
  } catch (err) {
    console.error(err.message)
    if (err.statusCode) {
      res.status(err.statusCode).send(err.message)
    } else {
      res.status(500).send('Unable to delete/unpublish post')
    }
    throw err
  }
}
