import { getJSON } from '../src/utils.js'
import PQueue from 'p-queue'

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */

export const up = async function (knex) {
  await knex.schema.createTable('posts', table => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('ghostId')
    } else {
      table.string('ghostId').notNullable()
    }
    table.string('state')
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.index(['ghostId', 'state'])
  })

  await knex.schema.alterTable('followers', table => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('inbox')
    } else {
      table.string('inbox').notNullable()
    }
    table.renameColumn('date_followed', 'created_at')
    table.renameColumn('follower_uri', 'uri')
    console.log('Schema migration complete.')
  })

  console.log('Seeding missing follower inbox values...')
  const followers = await knex.select('uri').from('followers')

  let concurrencyLimit = parseInt(process.env.ACTIVITY_PUB_CONCURRENCY_LIMIT)
  if (isNaN(concurrencyLimit)) {
    concurrencyLimit = 100
  }
  const queue = new PQueue({ concurrency: concurrencyLimit, throwOnTimeout: true })

  // Create an array of action methods to fetch the actor inboxes
  // action methods are needed to avoid promise inits from performing work
  // so wrap the promise init in a method to be called with concurrency
  // limits via p-queue
  const actions = followers.map(follower => {
    return async () => {
      console.log('Fetching inbox for ' + follower.uri)
      try {
        const actor = await getJSON(follower.uri)
        const followersTable = knex('followers')
        if (actor.inbox) {
          return followersTable
            .where('uri', follower.uri)
            .update({ inbox: actor.inbox, date_failed: null })
            .then(val => {
              console.log('Saved inbox for ' + follower.uri, val)
            })
        } else {
          console.log('Deleting follower due to missing inbox: ' + follower.uri)
          // Delete follower if it doesn't have an inbox
          return followersTable.where('uri', follower.uri)
            .del()
            .then(() => {})
        }
      } catch (err) {
        // Catch inbox fetch errors and remove the follower
        await knex('followers').where('uri', follower.uri).del()
      }
    }
  })

  await queue.addAll(actions)
}

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.alterTable('followers', table => {
    table.dropColumn('inbox_uri')
    table.renameColumn('created_at', 'date_followed')
  })
}
