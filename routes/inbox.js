// const crypto = require('crypto')
// const request = require('request')
// const router = express.Router()
// const utils = require('../utils')

// function parseJSON (text) {
//   try {
//     return JSON.parse(text)
//   } catch (e) {
//     return null
//   }
// }

const inbox = async function (req, res) {
  const payload = req.body
  const db = req.app.get('db')

  try {
    const record = await db.get('select * from followers where follower_uri == ?', [payload.actor])
    if (payload.actor && payload.type === 'Undo' && payload.object.type === 'Follow' && record !== undefined) {
      await db.run('delete from followers where follower_uri == ?', [payload.object.actor])
    } else if (payload.actor && payload.type === 'Follow' && record === undefined) {
      await db.run('insert into followers (follower_uri, date_followed, date_failed) values (?, ?, null)', [payload.actor, new Date().getTime()])
    } else {
      res.status(400).send('Bad request')
      return
    }
    res.status(200).send('Success')
  } catch (err) {
    console.error('Could not perform /inbox operation:\n' + err)
    res.status(500).send('Could not complete operation.')
  }
//   if (typeof req.body.object === 'string' && req.body.type === 'Follow') {
//     const name = req.body.object.replace(`https://${domain}/u/`, '')
//     utils.sendAcceptMessage()
//     sendAcceptMessage(req.body, name, req, res, targetDomain)
//     // Add the user to the DB of accounts that follow the account
//     const db = req.app.get('db')
//     // get the followers JSON for the user
//     const result = db.prepare('select followers from accounts where name = ?').get(`${name}@${domain}`)
//     if (result === undefined) {
//       console.log(`No record found for ${name}.`)
//     } else {
//       // update followers
//       let followers = parseJSON(result.followers)
//       if (followers) {
//         followers.push(req.body.actor)
//         // unique items
//         followers = [...new Set(followers)]
//       } else {
//         followers = [req.body.actor]
//       }
//       const followersText = JSON.stringify(followers)
//       try {
//         // update into DB
//         const newFollowers = db.prepare('update accounts set followers=? where name = ?').run(followersText, `${name}@${domain}`)
//         console.log('updated followers!', newFollowers)
//       } catch (e) {
//         console.log('error', e)
//       }
//     }
//   }
}

module.exports = inbox
