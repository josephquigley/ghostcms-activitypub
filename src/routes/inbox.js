import { Database } from '../db.js'
import { url } from '../constants.js'
import ActivityPub from '../ActivityPub.js'
const db = new Database()

function isFollowAccount (message) {
  return message.type === 'Follow' && message.object === url.account
}

function isUnfollowAccount (message) {
  return message.type === 'Undo' && isFollowAccount(message.object)
}

function isDeleteAccount (message) {
  return message.type === 'Delete' && message.object === message.actor
}

export const postInbox = async function (req, res) {
  const payload = req.body

  try {
    if (isUnfollowAccount(payload)) {
      ActivityPub.enqueue(async () => {
        await db.deleteFollowerWithUri(payload.object.actor)
        await ActivityPub.sendAcceptMessage(payload)
      })
    } else if (isDeleteAccount(payload)) {
      ActivityPub.enqueue(async () => {
        // Don't send accept message for account deletions because the remote account is now gone
        await db.deleteFollowerWithUri(payload.object)
      })
    } else if (isFollowAccount(payload)) {
      ActivityPub.enqueue(async () => {
        await db.createNewFollowerWithUri(payload.actor)
        await ActivityPub.sendAcceptMessage(payload)
      })
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(req.body, req.headers)
      }
      res.status(400).send('Bad request or ActivityPub message type not supported.')
      return
    }

    res.status(200).send()
    return
  } catch (err) {
    console.error('Could not perform /inbox operation:\n' + err)
    res.status(500).send('Could not complete operation.')
  }
}
