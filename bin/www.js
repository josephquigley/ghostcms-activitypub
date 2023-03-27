#!/usr/bin/env node

// Load config
import '../src/environment.js'

/**
 * Module dependencies.
 */
import fs from 'fs'

import { Ghost } from '../src/ghost.js'
import { Database } from '../src/db.js'

import app from '../app.js'
import http from 'http'

import Debug from 'debug'

if (!fs.existsSync('.env')) {
  console.error('ERROR: .env file is missing')
  process.exit(1)
}
const debug = Debug('ghostcms-activitypub:server')

async function createServer (lang) {
  /**
   * Normalize a port into a number, string, or false.
   */

  function normalizePort (val) {
    const port = parseInt(val, 10)

    if (isNaN(port)) {
      // named pipe
      return val
    }

    if (port >= 0) {
      // port number
      return port
    }

    return false
  }

  /**
   * Event listener for HTTP server "error" event.
   */

  function onError (error) {
    if (error.syscall !== 'listen') {
      throw error
    }

    const bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges')
        process.exit(1)
        break
      case 'EADDRINUSE':
        console.error(bind + ' is already in use')
        process.exit(1)
        break
      default:
        throw error
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */

  function onListening () {
    const addr = server.address()
    const bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port
    debug('Listening on ' + bind)
  }

  /**
   * Get port from environment and store in Express.
   */
  const port = normalizePort(process.env.PORT || '3000')
  app.set('port', port)
  app.set('lang', lang)

  /**
   * Create HTTP server.
   */

  const server = http.createServer(app)

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port)
  server.on('error', onError)
  server.on('listening', onListening)
}

Ghost.settings.browse().then(async settings => {
  await new Database().initialize()
  return settings.lang
}).then(lang => {
  createServer(lang)
})
