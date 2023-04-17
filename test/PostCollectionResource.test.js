import { PostCollectionResource } from '../src/PostCollectionResource.js'
import { MissingRequiredParameterError } from '../src/errors.js'
import MockExpressResponse from './MockExpressResponse.js'
import { PostResource } from '../src/PostResource.js'
import { MockGhostAPI } from './MockGhostAPI.js'
import { MockDatabase } from './MockDatabase.js'
// import { OrderedCollectionPage } from '../src/OrderedCollection.js'
import { expect } from 'chai'

function getRandomInt (max) {
  return Math.floor(Math.random() * max)
}

describe('PostCollectionResource', () => {
  // TODO ghost api mock
  let postResource = null
  let collectionResource = null
  let response = null
  const id = 'foo'

  const makeBadGhostAPI = () => {
    collectionResource.postResource.ghostAPI.posts = {
      browse: () => {
        throw new Error()
      }
    }

    collectionResource.postResource.ghostAPI.settings = {
      browse: () => {
        throw new Error()
      }
    }
  }

  beforeEach(() => {
    postResource = new PostResource({ ghostAPI: new MockGhostAPI(), db: new MockDatabase() })
    collectionResource = new PostCollectionResource({ id, postResource })
    response = new MockExpressResponse()
  })

  it('should throw an error when no id is provided', () => {
    const fn = () => {
      return new PostCollectionResource()
    }
    expect(fn).to.throw(MissingRequiredParameterError)
  })

  it('should bind methods to `this`', async () => {
    const pageRouter = new PostCollectionResource({ id, postResource }).pageRouter
    await pageRouter({ query: { page: 1 } }, response)

    expect(response.jsonPayload).to.not.be.undefined
  })

  describe('rootRouter', () => {
    it('should forward to pageRouter when provided a page URL parameter', async () => {
      const pageResponse = new MockExpressResponse()
      await collectionResource.pageRouter({ query: { page: 1 } }, pageResponse)
      await collectionResource.rootRouter({ query: { page: 1 } }, response)

      expect(pageResponse.jsonPayload).to.eql(response.jsonPayload)
    })

    it('should have the correct id', async () => {
      await collectionResource.rootRouter({ query: {} }, response)
      expect(response.jsonPayload.id).to.eql(id)
    })

    it('should return an OrderedCollection', async () => {
      await collectionResource.rootRouter({ query: {} }, response)
      expect(response.jsonPayload.type).to.eql('OrderedCollection')
    })

    it('should paginate if returning more than 15 posts', async () => {
      const posts = collectionResource.postResource.ghostAPI.posts.browse()
      for (let i = 0; i < 15; i++) {
        posts.push(posts[0])
      }

      posts.meta.pagination.total = posts.length
      posts.meta.pagination.page = 1
      posts.meta.pagination.pages = 2

      collectionResource.postResource.ghostAPI.posts = {
        browse: () => {
          return posts
        }
      }

      await collectionResource.rootRouter({ query: {} }, response)
      expect(response.jsonPayload.orderedItems).to.not.exist
      expect(response.jsonPayload.first).to.eql(`${id}?page=1`)
      expect(response.jsonPayload.last).to.eql(`${id}?page=${posts.meta.pagination.pages}`)
    })

    it('should handle errors gracefully with a 500 status code', async () => {
      makeBadGhostAPI()

      await collectionResource.rootRouter({ query: { } }, response)
      expect(response.statusCode).to.equal(500)
    })
  })

  describe('pageRouter', () => {
    it('should return an OrderedCollectionPage', async () => {
      await collectionResource.pageRouter({ query: { page: 1 } }, response)
      expect(response.jsonPayload.type).to.eql('OrderedCollectionPage')
    })

    it('should have an id matching the page number', async () => {
      [1, getRandomInt(1000)].forEach(async pageNum => {
        await collectionResource.pageRouter({ query: { page: pageNum } }, response)
        expect(response.jsonPayload.id).to.eql(`${id}?page=${pageNum}`)
      })
    })

    it('should contain an array of Article type orderedItems', async () => {
      await collectionResource.pageRouter({ query: { page: 1 } }, response)
      response.jsonPayload.orderedItems.forEach(item => {
        expect(item.type).to.eql('Article')
      })
    })

    it('should handle errors gracefully with a 500 status code', async () => {
      makeBadGhostAPI()

      await collectionResource.pageRouter({ query: { page: 1 } }, response)
      expect(response.statusCode).to.equal(500)
    })

    it('should not modify the template query', async () => {
      await collectionResource.pageRouter({ query: { page: 1 } }, response)
      expect(collectionResource.query.page).to.not.exist
    })
  })
})
