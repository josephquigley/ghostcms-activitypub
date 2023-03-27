import { config } from 'dotenv'
config()

/** Sanitize user inputs **/
if (process.env.GHOST_SERVER === '') {
  throw new Error('.env GHOST_SERVER value is required. Got empty.')
}

process.env.GHOST_SERVER = process.env.GHOST_SERVER.replace(/^http[s]*:\/\//, '').replace(/\/\s*$/g, '')

if (process.env.ACCOUNT_USERNAME === '') {
  throw new Error('.env ACCOUNT_USERNAME value is required. Got empty.')
}

if (process.env.GHOST_CONTENT_API_KEY === '') {
  throw new Error('.env GHOST_CONTENT_API_KEY value is required. Got empty.')
}

process.env.API_ROOT_PATH = process.env.API_ROOT_PATH.replace(/\s+/g, '')
if (!process.env.API_ROOT_PATH.startsWith('/')) {
  process.env.API_ROOT_PATH = '/' + process.env.API_ROOT_PATH
}

process.env.API_ROOT_PATH = process.env.API_ROOT_PATH.replace(/\/\s*$/g, '')

if (process.env.SERVER_DOMAIN === '') {
  process.env.SERVER_DOMAIN = process.env.GHOST_SERVER
}
process.env.SERVER_DOMAIN = process.env.SERVER_DOMAIN.replace(/^http[s]*:\/\//, '').replace(/\/\s*$/g, '')

if (process.env.PROFILE_URL === '') {
  process.env.PROFILE_URL = 'https://' + process.env.GHOST_SERVER
}

if (process.env.SHOW_FOLLOWERS === '') {
  process.env.SHOW_FOLLOWERS = 'true'
}

/** End Sanitize user inputs **/
