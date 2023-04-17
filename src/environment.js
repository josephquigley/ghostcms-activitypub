import { config } from 'dotenv'
config()

export class MissingRequiredEnvironmentConfig extends Error {
  constructor (field, ...args) {
    const message = `The .env value, '${field}' is required.`
    super(message, ...args)
    this.message = message
  }
}

export function initializeEnvironment () {
/** Sanitize user inputs **/
  process.env.GHOST_SERVER ??= ''
  if (process.env.GHOST_SERVER === '') {
    throw new MissingRequiredEnvironmentConfig('GHOST_SERVER')
  }
  process.env.GHOST_SERVER = process.env.GHOST_SERVER.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^http[s]*:\/\//, '')

  process.env.ACCOUNT_USERNAME ??= ''
  if (process.env.ACCOUNT_USERNAME === '') {
    throw new MissingRequiredEnvironmentConfig('ACCOUNT_USERNAME')
  }

  process.env.GHOST_CONTENT_API_KEY ??= ''
  if (process.env.GHOST_CONTENT_API_KEY === '') {
    throw new MissingRequiredEnvironmentConfig('GHOST_CONTENT_API_KEY')
  }

  process.env.API_ROOT_PATH ??= ''
  process.env.API_ROOT_PATH = process.env.API_ROOT_PATH.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/\/$/, '')
  if (!process.env.API_ROOT_PATH.startsWith('/')) {
    process.env.API_ROOT_PATH = '/' + process.env.API_ROOT_PATH
  }

  process.env.API_ROOT_PATH = process.env.API_ROOT_PATH.replace(/^\s\s*/, '').replace(/\s\s*$/, '')

  process.env.SERVER_DOMAIN ??= ''
  if (process.env.SERVER_DOMAIN === '') {
    process.env.SERVER_DOMAIN = process.env.GHOST_SERVER
  }

  try {
    process.env.SERVER_DOMAIN = process.env.SERVER_DOMAIN.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^http[s]*:\/\//, '')
    process.env.SERVER_DOMAIN = new URL('https://' + process.env.SERVER_DOMAIN).hostname
  } catch {
    throw new Error(`.env SERVER_DOMAIN value is not a host name. Got '${process.env.SERVER_DOMAIN}'.`)
  }

  process.env.PROFILE_URL ??= ''
  if (process.env.PROFILE_URL === '') {
    process.env.PROFILE_URL = 'https://' + process.env.GHOST_SERVER
  }

  process.env.SHOW_FOLLOWERS ??= ''
  if (process.env.SHOW_FOLLOWERS === '') {
    process.env.SHOW_FOLLOWERS = 'true'
  }

/** End Sanitize user inputs **/
}

initializeEnvironment()
