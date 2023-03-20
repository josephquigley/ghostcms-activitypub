const sqlite3 = require('sqlite3')
const fs = require('fs')
const crypto = require('crypto')
const promisify = require('util').promisify
const request = promisify(require('request'))

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

function signAndSend (message, res) {
  // get the URI of the actor object and append 'inbox' to it
  const inbox = new URL(message.object.actor + '/inbox')

  const digestHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest('base64')
  const signer = crypto.createSign('sha256')
  const d = new Date()
  const stringToSign = `(request-target): post ${inbox.pathname}\nhost: ${inbox.hostname}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`
  signer.update(stringToSign)
  signer.end()
  const signature = signer.sign(privateKey)
  const signatureB64 = signature.toString('base64')
  const header = `keyId="${global.accountURL}",headers="(request-target) host date digest",signature="${signatureB64}"`
  request({
    url: inbox.toString(),
    headers: {
      Host: inbox.hostname,
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
      console.log('Sign response:', response.body)
    }
  })
  return res.status(200)
}

function removeHttpURI (str) {
  return str.replace(/^http[s]*:\/\//, '')
}

module.exports = {
  removeHttpURI,
  certs,
  db: openDatabase(),
  pubKey,
  privateKey,
  signAndSend,

  sendAcceptMessage: function (object, id, res) {
    const message = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id,
      type: 'Accept',
      actor: `${global.accountURL}`,
      object
    }
    signAndSend(message, res)
  }
}
