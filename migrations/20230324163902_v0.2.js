/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */

export const up = async function (knex) {
  if (!await knex.schema.hasTable('followers')) {
    await knex.schema.createTable('followers', table => {
      table.string('follower_uri')
      table.timestamp('date_followed').defaultTo(knex.fn.now())
      table.timestamp('date_failed')
    })
  }
}

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.dropTable('followers')
}
