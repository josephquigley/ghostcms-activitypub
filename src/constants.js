import './environment.js'
import { genKeys } from './gen_keys.js'

const dataDir = `${process.cwd()}/data`
const certsDir = `${dataDir}/certs`

const actorPath = `${process.env.API_ROOT_PATH}/actors`
const accountURL = `https://${process.env.SERVER_DOMAIN}${actorPath}/${process.env.ACCOUNT_USERNAME}`

const urlPaths = {
  actor: actorPath,
  staticImages: `${process.env.API_ROOT_PATH}/img`,
  publicKey: '/public_key',
  tags: `${process.env.API_ROOT_PATH}/tags`,
  publish: `${process.env.API_ROOT_PATH}/publish`,
  delete: `${process.env.API_ROOT_PATH}/delete`,
  following: '/following',
  followers: '/followers',
  inbox: '/inbox',
  outbox: '/outbox'
}

export const filePath = {
  apiKey: `${dataDir}/apiKey.txt`,
  privateKey: `${certsDir}/key.pem`,
  publicKey: `${certsDir}/pubkey.pem`,
  database: `${dataDir}/database.db`,
  dataDir,
  certsDir
}

export const key = genKeys(filePath)

export const url = {
  path: urlPaths,
  profile: 'https://' + process.env.PROFILE_URL.replace(/^http[s]*:\/\//, ''),
  publicKey: `${accountURL}${urlPaths.publicKey}`,
  account: accountURL,
  inbox: `${accountURL}${urlPaths.inbox}`,
  outbox: `${accountURL}${urlPaths.outbox}`,
  followers: `${accountURL}${urlPaths.followers}`,
  tags: `https://${process.env.SERVER_DOMAIN}${urlPaths.tags}`,
  publish: `https://${process.env.SERVER_DOMAIN}${urlPaths.publish}`,
  delete: `https://${process.env.SERVER_DOMAIN}${urlPaths.delete}`
}
