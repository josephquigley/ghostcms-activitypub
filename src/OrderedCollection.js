export class OrderedCollection {
  constructor (params) {
    params ??= {}
    this['@context'] = [
      'https://www.w3.org/ns/activitystreams',
      {
        toot: 'http://joinmastodon.org/ns#',
        discoverable: 'toot:discoverable',
        Hashtag: 'as:Hashtag'
      }
    ]
    this.id = params.id ?? crypto.randomUUID()
    this.type = 'OrderedCollection'
    this.totalItems = params.totalItems ?? (Array.isArray(params.items) ? params.items.length : 0)

    if (Array.isArray(params.items)) {
      this.orderedItems = params.items
    } else if (Array.isArray(params.orderedItems)) {
      this.orderedItems = params.orderedItems
    } else {
      this.first = params.firstUri ?? null
      this.last = params.lastUri ?? null
    }
  }

  newPage (params) {
    params ??= {}
    params.partOfUri ??= this.id
    return new OrderedCollectionPage(params)
  }
}

export class OrderedCollectionPage {
  constructor (params) {
    params ??= {}
    this['@context'] = [
      'https://www.w3.org/ns/activitystreams',
      {
        toot: 'http://joinmastodon.org/ns#',
        discoverable: 'toot:discoverable',
        Hashtag: 'as:Hashtag'
      }
    ]
    this.id = params.id ?? crypto.randomUUID()
    this.type = 'OrderedCollectionPage'

    if (params.partOfUri) {
      this.partOf = params.partOfUri
    } else {
      throw new MissingRequiredParameter('partOfUri')
    }

    const items = params.orderedItems
    if (!items) {
      throw new MissingRequiredParameter('orderedItems')
    } else if (!Array.isArray(items)) {
      throw new MissingRequiredParameter('orderedItems', 'Array')
    }
    this.orderedItems = items

    if (params.totalItems) {
      this.totalItems = params.totalItems
    }

    this.next = params.nextUri ?? null
    this.prev = params.prevUri ?? null
  }
}

class MissingRequiredParameter extends Error {
  constructor (field, type, ...args) {
    const missingMessage = `The parameter, '${field}' is required.`
    const wrongTypeMessage = `The parameter, '${field}' is the wrong type. Expected ${type}.`
    const message = type ? wrongTypeMessage : missingMessage
    super(message, ...args)
    this.message = message
  }
}
