import { PostResource } from './PostResource.js'
import { url } from './constants.js'
import { OrderedCollection, OrderedCollectionPage } from './OrderedCollection.js'
import { MissingRequiredParameterError } from './errors.js'

function structuredClone (obj) {
  const stringified = JSON.stringify(obj)
  return JSON.parse(stringified)
}

export class PostCollectionResource {
  constructor (params) {
    params ??= {}
    this.query = params.query ?? {}

    this.id = params.id
    if (!this.id) {
      throw new MissingRequiredParameterError('id')
    }

    this.language = params.language ?? 'en'

    /* c8 ignore next */
    this.postResource = params.postResource ?? new PostResource({ language: this.language })

    // Bind `this` to the methods on `CollectionResource` so that the routers can be used as higher-order functions, decoupled from the class:
    // Eg: `const foo = new CollectionResource().rootRouter`
    Object.getOwnPropertyNames(PostCollectionResource.prototype).forEach((key) => {
      if (key !== 'constructor') {
        this[key] = this[key].bind(this)
      }
    })
  }

  async rootRouter (req, res, next) {
    if (req.query && req.query.page) {
      return this.pageRouter(req, res, next)
    }

    try {
      const posts = await this.postResource.getPosts(structuredClone(this.query))
      const params = { id: this.id }

      if (posts.pagination.total > 15) {
        params.firstUri = `${this.id}?page=1`
        params.lastUri = `${this.id}?page=${posts.pagination.pages}`
      } else {
        params.orderedItems = posts.posts
      }

      params.totalItems = posts.pagination.total

      const payload = new OrderedCollection(params)
      res.json(payload)
      return
    } catch (err) {
      console.error('Could not fetch Ghost posts:\n' + err)
      res.status(500).send()
    }
  }

  async pageRouter (req, res, next) {
    try {
      const page = parseInt(req.query.page)
      const query = structuredClone(this.query)
      query.page = page
      const posts = await this.postResource.getPosts(query)
      const payload = new OrderedCollectionPage({ id: `${this.id}?page=${page}`, partOfUri: this.id, orderedItems: posts.posts, totalItems: posts.pagination.total })

      // Pagination relies on the Ghost api matching the same next/prev null/int format as ActivityPub
      // This could break if Ghost changes the behavior
      if (posts.pagination.next) {
        payload.next = `${url.outbox}?page=${Math.min(posts.pagination.next, posts.pagination.pages)}`
      }

      if (posts.pagination.prev) {
        payload.prev = `${url.outbox}?page=${Math.min(posts.pagination.prev, posts.pagination.pages)}`
      }

      res.json(payload)
      return
    } catch (err) {
      console.error('Could not fetch Ghost posts:\n' + err)
      res.status(500).send('Internal error while fetching posts')
    }
  }
}

export default PostCollectionResource
