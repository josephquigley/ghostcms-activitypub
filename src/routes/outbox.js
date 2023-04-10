import { url } from '../constants.js'
import { CollectionResource } from './CollectionResource.js'

const collectionResource = new CollectionResource({ id: url.outbox })

export const outbox = collectionResource.rootRouter
export const outboxPage = collectionResource.pageRouter
