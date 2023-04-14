import { url } from '../constants.js'
import { OrderedCollection } from '../OrderedCollection.js'

export const likedRoute = (req, res, next) => {
  try {
    const payload = new OrderedCollection({ id: url.liked, totalItems: 0 })
    res.json(payload)
    return
  } catch (err) {
    console.error('Could not fetch Ghost posts:\n' + err)
    res.status(500).send()
  }
}
