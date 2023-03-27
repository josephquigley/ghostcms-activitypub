import { getJSON } from './utils.js'
import { filePath, url } from './constants.js'
import knex from 'knex'

export class Follower {
  uri
  inbox
}

export class PostPublishState {
  ghostId
  state
  created_at

  get activityPubId () {
    return `${url.account}/${this.ghostId}_${this.created_at}`
  }
}

export class Database {
  #knex
  options
  constructor (options) {
    this.#knex = knex({
      client: 'sqlite3',
      connection: {
        filename: filePath.database
      },
      useNullAsDefault: true
    })
    options = options || { migrate: true }
    this.options = options
  }

  async initialize () {
    // if (!fs.existsSync(filePath.database)) {
    //   await this.#createDatabase()
    // }

    if (this.options.migrate) {
      await this.#knex.migrate.latest()
    }

    return this
  }

  async #createDatabase () {
    await this.#knex.schema.createTable('posts', table => {
      if (this.#knex.client.config.client === 'sqlite3') {
        table.string('ghostId')
      } else {
        table.string('ghostId').notNullable()
      }
      table.string('state')
      table.timestamp('created_at').defaultTo(this.#knex.fn.now())
      table.index(['ghostId', 'state'])
    })

    await this.#knex.schema.createTable('followers', table => {
      if (this.#knex.client.config.client === 'sqlite3') {
        table.string('inbox')
      } else {
        table.string('inbox').notNullable()
      }
      table.timestamp('created_at').defaultTo(this.#knex.fn.now())
      table.string('uri')
    })
  }

  /**
   * @returns { Promise<import("knex").Knex.Table> }
   */
  get #followers () {
    return this.#knex('followers')
  }

  get #posts () {
    return this.#knex('posts')
  }

  // TODO: paginate for large sets of followers
  /**
   * @returns { Promise<Follower> }
   */
  async getFollowers (options) {
    let followers = []

    const totalCount = await this.countFollowers()

    options ??= {}
    options.limit ??= totalCount
    options.offset ??= (options.page ?? 0) * options.limit
    followers = await this.#followers.select().limit(options.limit).offset(options.offset) || []

    const results = followers.map(follower => {
      return Object.assign(new Follower(), follower)
    })

    const pages = Math.ceil(totalCount / Number.parseFloat(options.limit))
    const page = Math.max(1, pages - Math.ceil((totalCount - options.offset) / Number.parseFloat(options.limit)))

    results.meta = {
      pagination: {
        total: totalCount,
        limit: options.limit,
        pages,
        page,
        next: page < pages ? page : null,
        prev: page > 1 ? page - 1 : null

      }
    }
    return results
  }

  /**
   * @returns { Promise<Follower> }
   */
  async getFollowerWithUri (uri) {
    const follower = await this.#followers.where({ uri }).first()

    if (follower) {
      return Object.assign(new Follower(), follower)
    } else {
      return null
    }
  }

  /**
   * @returns { Promise<Follower> }
   */
  async getFollowerWithInbox (inbox) {
    const follower = await this.#followers.where({ inbox }).first()

    if (follower) {
      return Object.assign(new Follower(), follower)
    } else {
      return null
    }
  }

  /**
   * @returns { Promise<Follower> }
   */
  async createNewFollowerWithUri (uri) {
    const actor = await getJSON(uri)

    if (actor.inbox) {
      const follower = { uri: actor.id, inbox: actor.inbox, created_at: new Date().getTime() }

      // Skip if follower exists
      if (!await this.#followers.where({ uri: actor.id }).first()) {
        await this.#followers.insert(follower)
      }
      return Object.assign(new Follower(), follower)
    } else {
      throw new Error('Actor is missing an inbox')
    }
  }

  /**
   * @returns { Promise<Void> }
   */
  async deleteFollowerWithUri (uri) {
    await this.#followers.where({ uri }).del()
  }

  /**
   * @returns { Promise<Int> }
   */
  async countFollowers () {
    const countArray = await this.#followers.count('uri', { as: 'count' })
    if (countArray.length > 0) {
      return countArray[0].count
    } else {
      return 0
    }
  }

  /**
   * @returns { Promise<PostPublishState> } The Ghost post's publishing state
   */
  async createPostState (ghostPost) {
    const postRecord = { ghostId: ghostPost.id, state: ghostPost.status, created_at: new Date().getTime() }
    await this.#posts.insert(postRecord)
    return Object.assign(new PostPublishState(), postRecord)
  }

  /**
   * @returns { Promise<[PostPublishState]> } The Ghost post's publishing states
   */
  async getPostState (ghostId, state) {
    let states = []
    if (state) {
      states = await this.#posts.where({ ghostId, state }).orderBy('created_at', 'desc')
    } else {
      states = await this.#posts.where({ ghostId }).orderBy('created_at', 'desc')
    }

    return states.map(state => {
      return Object.assign(new PostPublishState(), state)
    })
  }
}
