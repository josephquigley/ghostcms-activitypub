import { getPostsAsync } from './routes/post.js'
import { url } from './constants.js'
import { OrderedCollection, OrderedCollectionPage } from './OrderedCollection.js'

function structuredClone (obj) {
  const stringified = JSON.stringify(obj)
  return JSON.parse(stringified)
}

export class CollectionResource {
  constructor (params) {
    params ??= {}
    params.query ??= {}
    this.params = params

    // Bind `this` to the methods on `CollectionResource` so that the routers can be used as higher-order functions, decoupled from the class:
    // Eg: `const foo = new CollectionResource().rootRouter`
    Object.getOwnPropertyNames(CollectionResource.prototype).forEach((key) => {
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
      const posts = await getPostsAsync(structuredClone(this.params.query))
      const params = { id: this.params.id }

      if (posts.pagination.total > 15) {
        params.first = `${this.params.id}?page=1`
        params.last = `${this.params.id}?page=${posts.pagination.pages}`
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
      const query = structuredClone(this.params.query)
      query.page = page
      const posts = await getPostsAsync(query)
      const payload = new OrderedCollectionPage({ id: `${this.params.id}?page=${page}`, partOfUri: this.params.id, orderedItems: posts.posts, totalItems: posts.pagination.total })

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

export default CollectionResource
