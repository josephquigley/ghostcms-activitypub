import { MissingRequiredParameterError } from '../src/errors.js'
import { PostPayload, PostResource } from '../src/PostResource.js'
import { MockGhostAPI } from './MockGhostAPI.js'
import { MockDatabase } from './MockDatabase.js'
import { Follower, PostPublishState } from '../src/Database.js'
import MockExpressResponse from './MockExpressResponse.js'
import { ActivityPub, MainQueue } from '../src/ActivityPub.js'

let log = null
let error = null

beforeEach(() => {
  log = console.log
  error = console.error

  console.log = () => {}
  console.error = () => {}
})

afterEach(() => {
  console.log = log
  console.error = error
})

describe('A PostPayload', () => {
  let testGhostPost = null
  let postPayload = null

  beforeEach(() => {
    testGhostPost = {
      slug: 'welcome-short',
      id: '5ddc9141c35e7700383b2937',
      uuid: 'a5aa9bd8-ea31-415c-b452-3040dae1e730',
      title: 'Welcome',
      html: "<p>👋 Welcome, it's great to have you here.</p>",
      comment_id: '5ddc9141c35e7700383b2937',
      feature_image: 'https://static.ghost.org/v3.0.0/images/welcome-to-ghost.png',
      feature_image_alt: null,
      feature_image_caption: null,
      featured: false,
      visibility: 'public',
      created_at: '2019-11-26T02:43:13.000+00:00',
      updated_at: '2019-11-26T02:44:17.000+00:00',
      published_at: '2019-11-26T02:44:17.000+00:00',
      custom_excerpt: null,
      codeinjection_head: null,
      codeinjection_foot: null,
      custom_template: null,
      canonical_url: null,
      url: 'https://docs.ghost.io/welcome-short/',
      excerpt: "👋 Welcome, it's great to have you here.",
      reading_time: 0,
      access: true,
      og_image: null,
      og_title: null,
      og_description: null,
      twitter_image: null,
      twitter_title: null,
      twitter_description: null,
      meta_title: null,
      meta_description: null,
      email_subject: null,
      tags: [{ slug: 'foo', name: 'foo' }]
    }

    postPayload = new PostPayload({ id: 'foo', ghostPost: testGhostPost })
  })

  it('should have a valid ActivityPub @context', () => {
    const expectedContext = [
      'https://www.w3.org/ns/activitystreams',
      {
        Hashtag: 'as:Hashtag',
        toot: 'http://joinmastodon.org/ns#'
      }
    ]
    expect(postPayload['@context']).to.eql(expectedContext)
  })

  it('should throw an error for a missing id parameter', () => {
    const fn = () => {
      return new PostPayload({ ghostPost: {} })
    }
    expect(fn).to.throw(MissingRequiredParameterError)
  })

  it('should throw an error for a missing ghostPost parameter', () => {
    const fn = () => {
      return new PostPayload({ id: 'foo' })
    }
    expect(fn).to.throw(MissingRequiredParameterError)
  })

  it('language should default to "en" if not provided', () => {
    expect(postPayload.language).to.eql('en')
  })

  it('language should match provided language parameter', () => {
    expect(new PostPayload({ id: 'foo', ghostPost: testGhostPost, language: 'es' }).language).to.eql('es')
  })

  it('url should match provided ghost post url', () => {
    expect(postPayload.url).to.eql(testGhostPost.url)
  })

  it('published date should match provided ghost post published_at date', () => {
    expect(postPayload.published).to.eql(testGhostPost.published_at)
  })

  it('ActivityPub type should be Article', () => {
    expect(postPayload.type).to.eql('Article')
  })

  it('summary should start with the post title', () => {
    testGhostPost.title = 'Foo'
    testGhostPost.excerpt = 'Bar'
    postPayload = new PostPayload({ id: 'foo', ghostPost: testGhostPost })
    expect(postPayload.summary.startsWith(`${testGhostPost.title}\n\n${testGhostPost.excerpt}`)).to.be.true
  })

  it('summary should use the custom excerpt instead of the automatic if custom exists', () => {
    testGhostPost.title = 'Foo'
    testGhostPost.excerpt = 'Bar'
    testGhostPost.custom_excerpt = 'Blee'
    postPayload = new PostPayload({ id: 'foo', ghostPost: testGhostPost })
    expect(postPayload.summary).to.eql(`${testGhostPost.title}\n\n${testGhostPost.custom_excerpt}`)
  })

  it('summary should not add punctuation if the excerpt matches the post body', () => {
    testGhostPost.title = 'Foo'
    testGhostPost.excerpt = 'Bar'
    testGhostPost.plaintext = 'Bar'
    postPayload = new PostPayload({ id: 'foo', ghostPost: testGhostPost })
    expect(postPayload.summary).to.eql(`${testGhostPost.title}\n\n${testGhostPost.excerpt}`)
  })

  it('summary should add ellispes if the excerpt does not match the post body and doesn\'t end in punctuation', () => {
    testGhostPost.title = 'Foo'
    testGhostPost.excerpt = 'Bar'
    testGhostPost.plaintext = 'Blee'
    postPayload = new PostPayload({ id: 'foo', ghostPost: testGhostPost })
    expect(postPayload.summary).to.eql(`${testGhostPost.title}\n\n${testGhostPost.excerpt}...`)
  })

  it('summary should not add ellispes if the excerpt does not match the post body and ends in punctuation', () => {
    testGhostPost.title = 'Foo'
    testGhostPost.excerpt = 'Bar.'
    testGhostPost.plaintext = 'Blee'
    postPayload = new PostPayload({ id: 'foo', ghostPost: testGhostPost })
    expect(postPayload.summary).to.eql(`${testGhostPost.title}\n\n${testGhostPost.excerpt}`)
  })
})

describe('PostResource', () => {
  let postResource = null
  let mockGhostAPI = null
  let response = null
  let request = null
  let apiKey = null
  let didSendMessage = false
  const previousSendMessage = MainQueue.sendMessage

  const makeBadGhostAPI = () => {
    postResource.ghostAPI.posts = {
      browse: () => {
        throw new Error()
      },

      read: () => {
        throw new Error()
      }
    }

    postResource.ghostAPI.settings = {
      browse: () => {
        throw new Error()
      }
    }
  }

  beforeEach(() => {
    mockGhostAPI = new MockGhostAPI()
    postResource = new PostResource({ ghostAPI: mockGhostAPI, db: new MockDatabase() })
    response = new MockExpressResponse()

    apiKey = null

    MainQueue.sendMessage = async (message, inbox) => {
      didSendMessage = true
    }

    request = {
      app: {
        get: (param) => {
          if (param === 'apiKey') {
            return apiKey
          }
        }
      }
    }
  })

  afterEach(() => {
    MainQueue.sendMessage = previousSendMessage
  })

  describe('getPosts()', () => {
    it('getPosts() should include "tags" with the post query if the query was made without tags', async () => {
      await postResource.getPosts({ include: 'author' })
      expect(mockGhostAPI.filters.include).to.contain('tags')

      mockGhostAPI.filters = null
      await postResource.getPosts()
      expect(mockGhostAPI.filters.include).to.contain('tags')
    })

    it('getPosts() should create post states for historical posts not already published', async () => {
      const postState = new PostPublishState('foo', 'published', new Date().getTime())
      const db = new MockDatabase([], postState)
      postResource = new PostResource({ ghostAPI: mockGhostAPI, db })
      const posts = await postResource.getPosts()

      expect(posts.posts[0].id).to.eql(postState.activityPubId)
    })
  })

  describe('getPost()', () => {
    it('should accept any timestamp in the post id and convert it to a ghost id', async () => {
      await postResource.getPost('foo_1234')
      expect(mockGhostAPI.postId).to.eql('foo')
    })

    it('should accept a ghost id', async () => {
      await postResource.getPost('foo')
      expect(mockGhostAPI.postId).to.eql('foo')
    })

    it('should return a Ghost post', async () => {
      const post = await postResource.getPost('foo')
      expect(post.title).to.equal('Welcome')
    })
  })

  describe('postGetRoute()', () => {
    it('should return a 400 HTTP code when no postId url parameter is provided', async () => {
      await postResource.postGetRoute({ params: {} }, response)
      expect(response.statusCode).to.eql(400)
    })

    it('should return a 404 HTTP code when no published post state for a postId exists in the database', async () => {
      const db = new MockDatabase([])
      postResource = new PostResource({ ghostAPI: mockGhostAPI, db })
      await postResource.postGetRoute({ params: { postId: 'foo' } }, response)
      expect(response.statusCode).to.eql(404)
    })

    it('should return a 500 HTTP code when an error is thrown attempting to fetch a post', async () => {
      makeBadGhostAPI()

      await postResource.postGetRoute({ params: { postId: 'foo' } }, response)
      expect(response.statusCode).to.eql(500)
    })

    it('should return a post payload when a published post state for postId exists in the database', async () => {
      const db = new MockDatabase()
      postResource = new PostResource({ ghostAPI: mockGhostAPI, db })

      const post = new PostPayload({ ghostPost: mockGhostAPI.ghostPost(), language: postResource.language, id: db.postState.activityPubId })
      await postResource.postGetRoute({ params: { postId: 'foo' } }, response)
      expect(response.jsonPayload).to.eql(post)
    })
  })

  describe('postPublishRoute()', () => {
    it('should return a 401 HTTP code when no apiKey url parameter is provided', async () => {
      request.query = {}
      await postResource.postPublishRoute(request, response)
      expect(response.statusCode).to.eql(401)
    })

    it('should not notify followers if there are no followers', async () => {
      request.query = { apiKey: 'foo' }
      request.body = { post: { current: mockGhostAPI.ghostPost() } }
      apiKey = 'foo'
      await postResource.postPublishRoute(request, response)
      expect(didSendMessage).to.eql(false)
    })

    it('should notify followers of new posts', async () => {
      const db = new MockDatabase()
      db.followerPayload.push(new Follower('https://example.com', 'https://example.com/inbox'))
      db.followerPayload.meta.pagination.total = 1

      postResource = new PostResource({ ghostAPI: mockGhostAPI, db })

      request.query = { apiKey: 'foo' }
      request.body = { post: { current: mockGhostAPI.ghostPost() } }
      apiKey = 'foo'
      await postResource.postPublishRoute(request, response)
      expect(didSendMessage).to.eql(true)
    })

    it('should delete followers that were deleted remotely', async () => {
      const db = new MockDatabase()
      let didDeleteFollower = false
      db.onDeleteFollower = () => {
        didDeleteFollower = true
      }

      db.followerPayload.push(new Follower('https://example.com', 'https://example.com/inbox'))
      db.followerPayload.meta.pagination.total = 1

      const activityPub = new ActivityPub()
      activityPub.sendMessage = async () => {
        const error = new Error()
        error.statusCode = 410
        throw error
      }

      postResource = new PostResource({ ghostAPI: mockGhostAPI, db, activityPub })

      apiKey = 'foo'
      request.query = { apiKey: 'foo' }
      request.body = { post: { current: mockGhostAPI.ghostPost() } }

      await postResource.postPublishRoute(request, response)
      expect(didDeleteFollower).to.eql(true)
    })

    it('should gracefully handle downstream errors', async () => {
      const db = new MockDatabase()
      db.createPostState = () => {
        throw new Error()
      }

      postResource = new PostResource({ ghostAPI: mockGhostAPI, db })

      apiKey = 'foo'
      request.query = { apiKey: 'foo' }
      request.body = { post: { current: mockGhostAPI.ghostPost() } }

      await postResource.postPublishRoute(request, response)
      expect(response.statusCode).to.be.greaterThan(399)
    })

    it('should default the language to "en" if no language is provided', async () => {
      const db = new MockDatabase()
      postResource = new PostResource({ ghostAPI: mockGhostAPI, db })
      expect(postResource.language).to.eql('en')
    })

    it('should not override the language if one is provided', async () => {
      const db = new MockDatabase()
      postResource = new PostResource({ ghostAPI: mockGhostAPI, db, language: 'es' })
      expect(postResource.language).to.eql('es')
    })
  })

  describe('postDeleteRoute()', () => {
    it('should return a 401 HTTP code when no apiKey url parameter is provided', async () => {
      request.query = {}
      await postResource.postDeleteRoute(request, response)
      expect(response.statusCode).to.eql(401)
    })
  })
})
