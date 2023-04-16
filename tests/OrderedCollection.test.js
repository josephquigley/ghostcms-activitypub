import { expect } from 'chai'
import { OrderedCollection, MissingRequiredParameter, OrderedCollectionPage } from '../src/OrderedCollection.js'

const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/

/** ======================= OrderedCollection ======================= **/
describe('An OrderedCollection', function () {
  const noId = [new OrderedCollection(), new OrderedCollection({ orderedItems: [0, 1, 2] })]

  it('should have a valid ActivityPub @context', () => {
    const context = ['https://www.w3.org/ns/activitystreams',
      {
        toot: 'http://joinmastodon.org/ns#',
        discoverable: 'toot:discoverable',
        Hashtag: 'as:Hashtag'
      }
    ]

    const all = noId

    all.forEach(collection => {
      expect(collection['@context']).to.eql(context)
    })
  })

  it('should have an ActivityPub type of "OrderedCollection"', () => {
    expect(new OrderedCollection().type).to.equal('OrderedCollection')
  })

  it('should create a UUID id if no id is provided', () => {
    noId.forEach(collection => {
      expect(collection.id).to.match(uuidRegex)
    })
  })

  describe('with an id parameter', () => {
    it('should override the id', function () {
      expect(new OrderedCollection({ id: 'foo' }).id).to.equal('foo')
    })
  })

  describe('with no orderedItems parameter', () => {
    it('should have a totalItems count of 0', function () {
      expect(new OrderedCollection().totalItems).to.equal(0)
    })

    it('should have an empty orderedItems array', function () {
      expect(new OrderedCollection().orderedItems).to.eql([])
    })
  })

  describe('with an orderedItems parameter', () => {
    describe('but a specified totalItems parameter', () => {
      const collection = new OrderedCollection({ orderedItems: [1, 2, 3], totalItems: 5 })
      it('should override the totalItems with the count of orderedItems', function () {
        expect(collection.orderedItems).to.have.lengthOf(3)
        expect(collection.totalItems).to.equal(3)
      })
    })

    it('should have the same totalItems value as orderedItems length when no totalItems is provided', function () {
      const collection = new OrderedCollection({ orderedItems: [1, 2, 3] })
      expect(collection.orderedItems).to.have.lengthOf(3)
      expect(collection.totalItems).to.equal(3)
    })
  })

  describe('with a totalItems parameter but no orderedItems', () => {
    it('should have a first and last page URI and totalItems', function () {
      const collection = new OrderedCollection({ firstUri: 'foo', lastUri: 'bar', totalItems: 2 })
      expect(collection.first).to.eql('foo')
      expect(collection.last).to.eql('bar')
      expect(collection.totalItems).to.eql(2)
    })

    it("should throw an error if it doesn't have totalItems", function () {
      const constructor = () => {
        return new OrderedCollection({ firstUri: 'foo', lastUri: 'bar' })
      }
      expect(constructor).to.throw(MissingRequiredParameter)
    })

    it('should throw an error if it firstUri or secondUri are missing', function () {
      const constructor1 = () => {
        return new OrderedCollection({ firstUri: 'foo', totalItems: 2 })
      }

      const constructor2 = () => {
        return new OrderedCollection({ lastUri: 'bar', totalItems: 2 })
      }
      expect(constructor1).to.throw(MissingRequiredParameter)
      expect(constructor2).to.throw(MissingRequiredParameter)
    })

    it('should not have pagination when totalItems is 0 even if it has a first and last page URI', function () {
      const collection = new OrderedCollection({ firstUri: 'foo', lastUri: 'bar', totalItems: 0 })
      expect(collection.first).to.not.exist
      expect(collection.last).to.not.exist
      expect(collection.totalItems).to.eql(0)
    })
  })

  describe('when it creates a new OrderedCollectionPage', () => {
    const collection = new OrderedCollection({ id: 'rab', firstUri: 'foo', lastUri: 'bar', totalItems: 2 })
    const newPage = collection.newPage({ orderedItems: [1, 2, 3] })

    it('its partOf field should match the OrderedCollection id', function () {
      expect(newPage.partOf).to.eql(collection.id)
    })

    it('its id should not match the OrderedCollection id', function () {
      expect(newPage.id).to.not.eql(collection.id)
    })

    it('its id should be unique', function () {
      const newPage2 = collection.newPage({ orderedItems: [1, 2, 3] })
      expect(newPage.id).to.not.eql(newPage2.id)
    })

    it('its totalItems should match the OrderedCollection totalItems', function () {
      expect(newPage.totalItems).to.eql(collection.totalItems)
    })

    it('it should throw a MissingRequiredParameter error when no orderedItems are provided', function () {
      const testFn = () => {
        return collection.newPage()
      }
      expect(testFn).to.throw(MissingRequiredParameter)
    })
  })
})

/** ======================= OrderedCollectionPage ======================= **/
describe('An OrderedCollectionPage', function () {
  const defaultCollection = new OrderedCollectionPage({ partOfUri: 'foo', orderedItems: [1, 2, 3], totalItems: 3 })
  it('should have a valid ActivityPub @context', () => {
    const context = ['https://www.w3.org/ns/activitystreams',
      {
        toot: 'http://joinmastodon.org/ns#',
        discoverable: 'toot:discoverable',
        Hashtag: 'as:Hashtag'
      }
    ]

    expect(defaultCollection['@context']).to.eql(context)
  })

  it('should have an ActivityPub type of "OrderedCollectionPage"', () => {
    expect(defaultCollection.type).to.equal('OrderedCollectionPage')
  })

  it('should create a UUID id if no id is provided', () => {
    expect(defaultCollection.id).to.match(uuidRegex)
  })

  describe('with an id parameter', () => {
    it('should override the id', function () {
      expect(new OrderedCollectionPage({ partOfUri: 'foo', id: 'bar', orderedItems: [1, 2], totalItems: 2 }).id).to.equal('bar')
    })
  })

  it("should throw an error if it doesn't have totalItems", function () {
    const constructor = () => {
      return new OrderedCollectionPage({ partOfUri: 'foo', orderedItems: [1, 2] })
    }
    expect(constructor).to.throw(MissingRequiredParameter)
  })

  it("should throw an error if it doesn't have partOfUri", function () {
    const constructor = () => {
      return new OrderedCollectionPage({ id: 'bar', orderedItems: [1, 2], totalItems: 2 })
    }
    expect(constructor).to.throw(MissingRequiredParameter)
  })

  it("should throw an error if orderedItems isn't an array", function () {
    const constructor = () => {
      return new OrderedCollectionPage({ partOfUri: 'foo', orderedItems: 'str', totalItems: 2 })
    }
    expect(constructor).to.throw(MissingRequiredParameter)
  })
})
