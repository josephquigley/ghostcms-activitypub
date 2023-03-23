const sqlite3 = require('sqlite3')
const fs = require('fs')
const crypto = require('crypto')
const promisify = require('util').promisify
const postJSON = require('bent')('POST', 'json', { 'Content-Type': 'application/activity+json' }, 200, 202)

const dataDir = 'data'
const certsDir = `${dataDir}/certs`
const dbName = 'database.db'
const dbPath = `${dataDir}/${dbName}`

let _privateKey = ''
let _pubKey = ''

const pubKey = () => {
  if (_pubKey === '') {
    try {
      _pubKey = fs.readFileSync(certs.publicKeyPath, 'utf8')
    } catch (err) {
      return ''
    }
  }
  return _pubKey
}

const privateKey = () => {
  if (_privateKey === '') {
    try {
      _privateKey = fs.readFileSync(certs.privateKeyPath, 'utf8')
    } catch (err) {
      return ''
    }
  }
  return _privateKey
}

const certs = {
  dir: certsDir,
  privateKeyPath: `${certsDir}/key.pem`,
  publicKeyPath: `${certsDir}/pubkey.pem`
}

function createDatabase () {
  const newDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Could not create database:\n' + err)
      process.exit(1)
    }
    createTables(newDb)
  })

  return newDb
}

function openDatabase () {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err && err.code === 'SQLITE_CANTOPEN') {
      return createDatabase()
    } else if (err) {
      console.error('Could not open database:\n' + err)
      process.exit(1)
    }
  })

  db.run = promisify(db.run)
  db.get = promisify(db.get)
  db.all = promisify(db.all)

  return db
}

function createTables (db) {
  db.exec(`
    create table if not exists followers (
        follower_uri text primary key not null,
        date_followed integer not null,
        date_failed integer null
    );
    `)
}

async function signAndSend (message, params) {
  // TODO: Fetch actor first, then get its inbox rather than infer it to be /inbox
  // TODO: Sign all requests for remote data as well
  const inbox = params.inbox ? new URL(params.inbox) : new URL(message.object.actor + '/inbox')

  const digestHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest('base64')
  const signer = crypto.createSign('sha256')
  const d = new Date()
  const stringToSign = `(request-target): post ${inbox.pathname}\nhost: ${inbox.hostname}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`
  signer.update(stringToSign)
  signer.end()
  const signature = signer.sign(privateKey())
  const signatureB64 = signature.toString('base64')
  const header = `keyId="${global.accountURL}/public_key",headers="(request-target) host date digest",signature="${signatureB64}"`

  const headers = {
    Host: inbox.hostname,
    Date: d.toUTCString(),
    Digest: `SHA-256=${digestHash}`,
    Signature: header,
    'Content-Type': 'application/activity+json',
    Accept: 'application/activity+json'
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Signing and sending: ', inbox.toString(), message, headers)
    }
    await postJSON(inbox.toString(), message, headers)
  } catch (err) {
    // Mastodon sends back an empty response, which breaks JSON parsing in the bent library
    if (err instanceof SyntaxError) {
      return
    }
    console.error('Error sending signed message:', err.statusCode, err.message)
  }

  if (params.res) {
    return params.res.status(200)
  }
}

function removeHttpURI (str) {
  return str.replace(/^http[s]*:\/\//, '')
}

function createNotification (type, object, notificationId, to, cc) {
  // Need a guid for some activities otherwise Mastodon returns a 401 for some reason on follower inbox POSTs
  notificationId = notificationId || `${global.accountURL}/${type.replace(/[\s]+/g, '').toLowerCase()}-${crypto.randomBytes(16).toString('hex')}`
  const payload = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: notificationId,
    type,
    actor: global.accountURL,
    object,
    to: to || 'https://www.w3.org/ns/activitystreams#Public'
  }

  if (cc) {
    payload.cc = cc
  }

  return payload
}

module.exports = {
  removeHttpURI,
  certs,
  db: openDatabase,
  dataDir,
  apiKeyPath: `${dataDir}/apiKey.txt`,

  // Cache the keys so that the disk doesn't have to be read on each ActivityPub request
  pubKey: () => {
    if (_pubKey === '') {
      _pubKey = pubKey()
    }
    return _pubKey
  },
  privateKey: () => {
    if (_privateKey === '') {
      _privateKey = privateKey()
    }
    return _privateKey
  },
  signAndSend,

  sendAcceptMessage: async function (object, res) {
    await signAndSend(createNotification('Accept', object), { res })
  },

  createNotification
}
