const sqlite3 = require('sqlite3')
const fs = require('fs')
const request = require('request')
const crypto = require('crypto')
const promisify = require('util').promisify

const dataDir = 'data'
const certsDir = `${dataDir}/certs`
const dbName = 'database.db'
const dbPath = `${dataDir}/${dbName}`

const certs = {
  dir: certsDir,
  privateKeyPath: `${certsDir}/key.pem`,
  publicKeyPath: `${certsDir}/pubkey.pem`
}

const pubKey = fs.readFileSync(certs.publicKeyPath, 'utf8')
const privateKey = fs.readFileSync(certs.privateKeyPath, 'utf8')

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

function signAndSend (message, name, req, res, targetDomain) {
  // get the URI of the actor object and append 'inbox' to it
  const inbox = message.object.actor + '/inbox'
  const inboxFragment = inbox.replace('https://' + targetDomain, '')

  const digestHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest('base64')
  const signer = crypto.createSign('sha256')
  const d = new Date()
  const stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`
  signer.update(stringToSign)
  signer.end()
  const signature = signer.sign(privateKey)
  const signatureB64 = signature.toString('base64')
  const header = `keyId="${global.accountURL}",headers="(request-target) host date digest",signature="${signatureB64}"`
  request({
    url: inbox,
    headers: {
      Host: targetDomain,
      Date: d.toUTCString(),
      Digest: `SHA-256=${digestHash}`,
      Signature: header
    },
    method: 'POST',
    json: true,
    body: message
  }, function (error, response) {
    if (error) {
      console.error('Error signing message:', error, response.body)
    } else {
      console.log('Response:', response.body)
    }
  })
  return res.status(200)
}

module.exports = {
  removeHttpURI: function (str) {
    return str.replace(/^http[s]*:\/\//, '')
  },

  certs,
  db: openDatabase(),
  pubKey,
  privateKey,
  signAndSend,

  sendAcceptMessage: function (body, id, name, domain, req, res, targetDomain) {
    if (!id) {
      id = crypto.randomBytes(16).toString('hex')
    }

    const message = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id,
      type: 'Accept',
      actor: `${global.accountURL}`,
      object: body
    }
    signAndSend(message, name, domain, req, res, targetDomain)
  }
}
