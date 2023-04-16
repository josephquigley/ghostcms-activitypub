const commonContext = [
  'https://www.w3.org/ns/activitystreams',
  {
    toot: 'http://joinmastodon.org/ns#',
    discoverable: 'toot:discoverable',
    Hashtag: 'as:Hashtag'
  }
]

export class OrderedCollection {
  constructor (params) {
    params ??= {}
    this['@context'] = commonContext
    this.id = params.id ?? crypto.randomUUID()
    this.type = 'OrderedCollection'
    this.totalItems = params.totalItems ?? 0

    if (params.orderedItems && Array.isArray(params.orderedItems)) {
      this.orderedItems = params.orderedItems
    }

    const emptyParams = Object.keys(params).length === 0
    const hasTotalItems = params.totalItems !== undefined && params.totalItems !== null
    const hasFirstUri = params.firstUri !== undefined && params.firstUri !== null
    const hasLastUri = params.lastUri !== undefined && params.lastUri !== null
    const hasPagination = hasFirstUri || hasLastUri
    const hasItems = this.orderedItems && !hasPagination

    if (hasItems) {
      this.totalItems = this.orderedItems.length
    } else if (this.totalItems === 0 && !hasPagination) {
      this.orderedItems = []
    }

    if (!emptyParams && hasPagination) {
      if (!hasTotalItems) {
        throw new MissingRequiredParameter('totalItems')
      }

      if (!hasFirstUri) {
        throw new MissingRequiredParameter('firstUri')
      } else if (!hasLastUri) {
        throw new MissingRequiredParameter('lastUri')
      }

      if (this.totalItems > 0) {
        this.first = params.firstUri
        this.last = params.lastUri
      }
    }
  }

  newPage (params) {
    params ??= {}
    params.partOfUri ??= this.id
    params.totalItems ??= this.totalItems
    return new OrderedCollectionPage(params)
  }
}

export class OrderedCollectionPage {
  constructor (params) {
    params ??= {}
    this['@context'] = commonContext
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
    } else {
      throw new MissingRequiredParameter('totalItems')
    }

    this.next = params.nextUri ?? null
    this.prev = params.prevUri ?? null
  }
}

export class MissingRequiredParameter extends Error {
  constructor (field, type, ...args) {
    const missingMessage = `The parameter, '${field}' is required.`
    const wrongTypeMessage = `The parameter, '${field}' is the wrong type. Expected ${type}.`
    const message = type ? wrongTypeMessage : missingMessage
    super(message, ...args)
    this.message = message
  }
}
