import { createTagPayload } from './routes/tags.js'
import { Ghost } from './ghost.js'
import { url } from './constants.js'
import { Database, PostPublishState } from './Database.js'
import ActivityPub from './activitypub.js'

export class PostPayload {
  constructor (params) {
    this['@context'] = [
      'https://www.w3.org/ns/activitystreams',
      {
        Hashtag: 'as:Hashtag',
        toot: 'http://joinmastodon.org/ns#'
      }
    ]

    const ghostPost = params.ghostPost

    this.id = params.id
    this.published = ghostPost.published_at
    this.sensitive = false
    this.summary = null
    this.visibility = 'public'
    this.language = params.language ?? 'en'
    this.uri = this.id
    this.url = ghostPost.url ?? null
    this.atomUri = this.id
    this.content = null
    this.type = 'Article'
    this.to = ['https://www.w3.org/ns/activitystreams#Public']
    this.cc = [
      `${url.followers}`
    ]
    this.attributedTo = url.account
    this.tag = []

    const excerpt = ghostPost.excerpt ?? ghostPost.custom_excerpt
    this.summary = `${ghostPost.title}\n\n${excerpt}`

    // Check to see if the summary ends with punctuation, otherwise assume the text got cut off and add elipses.
    // Only add punctuation if the summary is shorter than the body
    if (excerpt.match(/[\d\w]$/g) && (ghostPost.plaintext != excerpt)) { // eslint-disable-line eqeqeq
      this.summary += '...'
    }

    if (ghostPost.tags && ghostPost.tags.length > 0) {
      this.tag = ghostPost.tags.map(createTagPayload)
    }

    this.content = ghostPost.html
  }
}

export class PostResource {
  constructor (params) {
    this.language = params.language ?? 'en'
    this.ghostAPI = params.ghostAPI ?? Ghost()
    this.db = params.db ?? new Database()
    this.queryLimit = params.queryLimit ?? 10
  }

  async getPosts (filters) {
    filters ??= { include: 'tags' }

    if (!filters.include) {
      filters.include = 'tags'
    }

    if (!filters.include.includes('tags')) {
      filters.include += ',tags'
    }

    if (!filters.limit) {
      filters.limit = this.queryLimit
    }

    const posts = await this.ghostAPI.posts.browse(filters)
    const activityPubPosts = posts.map(async (post) => {
      const postStates = await this.db.getPostState(post.id, 'published')
      let postState = postStates[0]

      // Older posts may not have been published to the Fediverse, so a new post state must be created for them
      if (postStates.length === 0) {
        postState = await this.db.createPostState(post)
      }
      return new PostPayload({ ghostPost: post, language: this.language, id: postState.activityPubId })
    })

    return Promise.all(activityPubPosts).then(activityPubPosts => {
      return {
        posts: activityPubPosts,
        pagination: posts.meta.pagination
      }
    })
  }

  async getPost (postId) {
    postId = postId.replace(/_[\d]+$/g, '')
    return await this.ghostAPI.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })
  }

  async postGetRoute (req, res) {
    const postId = req.params.postId
    if (!postId) {
      return res.status(400).send('Bad request.')
    }

    try {
      const post = await this.getPost(postId)
      const postStates = await this.db.getPostState(postId, 'published')

      if (postStates.length === 0) {
        res.status(404).send()
        return
      }

      res.json(new PostPayload({ ghostPost: post, language: this.language, id: postStates[0].activityPubId }))
    } catch (err) {
      if (err.response) {
        res.status(err.response.status).send(err.response.statusText)
      } else {
        console.error(err)
        res.status(500).send('Unable to fetch post.')
      }
    }
  }

  async postPublishRoute (req, res) {
    if (req.query.apiKey != req.app.get('apiKey')) { // eslint-disable-line eqeqeq
      res.status(401).send()
      return
    }

    try {
      const post = req.body.post.current
      const postState = await this.db.createPostState(post)

      const followers = await this.db.getFollowers()
      const postObject = new PostPayload({ ghostPost: post, language: this.language, id: postState.activityPubId })

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
              await this.db.deleteFollowerWithUri(follower.inbox)
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

  async postDeleteRoute (req, res) {
    if (req.query.apiKey != req.app.get('apiKey')) { // eslint-disable-line eqeqeq
      res.status(401).send()
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(req.body))
    }

    try {
      const followers = await this.db.getFollowers()
      const id = req.body.post.current.id ?? req.body.post.previous.id
      const status = req.body.post.previous.status

      const postState = await this.db.getPostState(id, status)
      if (postState.length === 0) {
        throw new Error('Expected a post state, but got none back for:', id, status)
      }

      // Get the most recent state
      const activityPubId = postState[0].activityPubId

      // Mark the post state as deleted if deleted
      if (req.body.post.current === {}) {
        await this.db.createPostState({ id, status: 'deleted' })
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
}

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
