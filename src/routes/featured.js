import { url } from '../constants.js'
import { CollectionResource } from './CollectionResource.js'

const collectionResource = new CollectionResource({ id: url.featured, query: { filter: 'featured:true' } })

export const featuredRoute = collectionResource.rootRouter
export const featuredPageRoute = collectionResource.pageRouter
