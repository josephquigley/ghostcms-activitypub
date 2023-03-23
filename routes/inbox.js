const utils = require('../utils')

const inbox = async function (req, res) {
  const payload = req.body
  const db = req.app.get('db')

  try {
    const record = await db.get('select * from followers where follower_uri == ?', [payload.actor])
    if (payload.actor && payload.type === 'Undo' && payload.object.type === 'Follow' && record !== undefined) {
      await db.run('delete from followers where follower_uri == ?', [payload.object.actor])
    } else if (payload.actor && payload.type === 'Follow' && record === undefined) {
      await db.run('insert into followers (follower_uri, date_followed, date_failed) values (?, ?, null)', [payload.actor, new Date().getTime()])
    } else if (payload.actor && payload.type === 'Delete') {
      const actorUri = payload.object
      if (typeof actorUri === 'string') {
        await db.run('delete from followers where follower_uri == ?', [actorUri])
      } else {
        res.status(400).send('Bad request, expected Delete activity object to be a string to the actor.')
        return
      }
    } else {
      console.log(req.body, req.headers)
      res.status(400).send('Bad request')
      return
    }

    utils.sendAcceptMessage(payload, res)

    res.status(200).send('Success')
  } catch (err) {
    console.error('Could not perform /inbox operation:\n' + err)
    res.status(500).send('Could not complete operation.')
  }
}

module.exports = inbox
