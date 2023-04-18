import PQueue from 'p-queue'
import crypto from 'crypto'
import { url, key } from './constants.js'
import bent from 'bent'

export const postJSON = bent('POST', 'json', { 'Content-Type': 'application/activity+json' }, 200, 202)
export const getJSON = bent('GET', 'json', { 'Content-Type': 'application/activity+json' }, 200, 202)

export class ActivityPub {
  #queue
  constructor (config) {
    config ??= {}
    config.concurrency ??= parseInt(process.env.ACTIVITY_PUB_CONCURRENCY_LIMIT) || 100
    config.throwOnTimeout ??= false
    this.#queue = new PQueue(config)
  }

  enqueue (fn) {
    if (Array.isArray(fn)) {
      this.#queue.addAll(fn)
    } else {
      this.#queue.add(fn)
    }
  }

  async sendAcceptMessage (object) {
    return await this.sendMessage(this.createNotification('Accept', object))
  }

  async sendMessage (message, inbox) {
    if (inbox) {
      inbox = new URL(inbox)
    } else {
      const actor = await getJSON(message.object.actor)
      inbox = new URL(actor.inbox)
    }

    const digestHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest('base64')
    const signer = crypto.createSign('sha256')
    const d = new Date()
    const stringToSign = `(request-target): post ${inbox.pathname}\nhost: ${inbox.hostname}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`
    signer.update(stringToSign)
    signer.end()
    const signature = signer.sign(key.private)
    const signatureB64 = signature.toString('base64')
    const header = `keyId="${url.account}/public_key",headers="(request-target) host date digest",signature="${signatureB64}"`

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
      console.error('Error sending signed message:', err.statusCode, err.message, JSON.stringify(message), inbox)
      throw err
    }
  }

  enqueueMessage (activityPubMessage, inbox) {
    this.enqueue(async () => {
      await this.sendMessage(activityPubMessage, inbox)
    })
  }

  createNotification (type, object, overrides) {
    if (typeof overrides === 'string') {
      overrides = { notificationId: overrides }
    }
    overrides ??= {}

    // Need a guid for some activities otherwise Mastodon returns a 401 for some reason on follower inbox POSTs
    overrides.notificationId ??= `${url.account}/${type.replace(/[\s]+/g, '').toLowerCase()}-${crypto.randomBytes(16).toString('hex')}`

    const payload = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: overrides.notificationId,
      type,
      actor: url.account,
      object,
      to: overrides.to ?? 'https://www.w3.org/ns/activitystreams#Public'
    }

    if (overrides.cc) {
      payload.cc = overrides.cc
    }

    return payload
  }

  setOnQueueEmpty (fn) {
    this.#queue.onEmpty = fn
  }
}

export const MainQueue = new ActivityPub()
export default MainQueue
