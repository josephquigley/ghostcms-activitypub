import { removeHttpURI } from '../utils.js'
import { Ghost } from '../ghost.js'
import { url, key } from '../constants.js'

const mastodonAttachments = {
  attachment: [
    {
      type: 'PropertyValue',
      name: 'Website',
      value: `<a href="${url.profile}" target="_blank" rel="nofollow noopener noreferrer me"><span class="invisible">https://</span><span class="">${removeHttpURI(url.profile)}</span><span class="invisible"></span></a>`
    }
  ]
}

export function profilePayload () {
  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
      {
        PropertyValue: 'schema:PropertyValue',
        value: 'schema:value',
        toot: 'http://joinmastodon.org/ns#',
        discoverable: 'toot:discoverable',
        Hashtag: 'as:Hashtag'
      }
    ],
    id: url.account,
    type: 'Service', // Bots are 'Service' types
    following: url.account + '/following',
    followers: url.account + '/followers',
    inbox: url.inbox,

    // TODO: Debug why Mastodon doesn't show historical posts?
    outbox: url.outbox,
    // "featured": "https://meta.masto.host/users/GamingNews/collections/featured",
    // "featuredTags": "https://meta.masto.host/users/GamingNews/collections/tags",
    preferredUsername: process.env.ACCOUNT_USERNAME,
    name: process.env.ACCOUNT_NAME,
    summary: '',
    url: process.env.PROFILE_URL || url.profile,
    manuallyApprovesFollowers: false,
    discoverable: true,
    attachment: mastodonAttachments,
    publicKey: {
      id: url.publicKey,
      owner: url.account,
      publicKeyPem: key.public
    }
  }
}

const jpegContentType = 'image/jpeg'
const webpContentType = 'image/webp'
const svgContentType = 'image/svg+xml'
const pngContentType = 'image/png'

function imagePayload () {
  return {
    type: 'Image',
    mediaType: pngContentType
  }
}

function contentTypeFromUrl (url) {
  if (url.endsWith('jpg') || url.endsWith('jpeg')) {
    return jpegContentType
  } else if (url.endsWith('webp')) {
    return webpContentType
  } else if (url.endsWith('svg')) {
    return svgContentType
  } else { // Assume png
    return pngContentType
  }
}

export const profileRoute = async function (req, res, next) {
  const shouldForwardHTMLToGhost = process.env.NODE_ENV === 'production' || req.query.forward

  // If a web browser is requesting the profile, redirect to the Ghost website
  if (req.get('Accept').includes('text/html') && !req.path.endsWith('.json') && shouldForwardHTMLToGhost) {
    res.redirect(url.profile)
    return
  }

  const siteData = await Ghost.settings.browse()

  const profile = profilePayload()
  profile.type = app.get('profileType')

  profile.name = process.env.ACCOUNT_NAME || siteData.title
  profile.summary = `${siteData.description}\n<br/><a href="${url.profile}">${url.profile}</a>` // TODO add h-card data?

  if (!req.app.get('account_created_at')) {
    // Fetch the oldest post to determine the ActivityPub actor creation/published date
    try {
      const oldestPosts = await Ghost.posts.browse({ limit: 1, order: 'published_at asc' })
      if (oldestPosts.length > 0) {
        req.app.set('account_created_at', oldestPosts[0].published_at)
      } else {
        throw new Error('No posts found.')
      }
    } catch (err) {
      req.app.set('account_created_at', new Date().toISOString())
    }
  }

  profile.published = req.app.get('account_created_at')

  profile.icon = imagePayload()
  if (siteData.logo && siteData.logo !== '') {
    profile.icon.url = siteData.logo
  } else {
    profile.icon.url = `https://${process.env.SERVER_DOMAIN}${url.path.staticImages}/ghost-logo-orb.jpg`
  }

  if (siteData.cover_image && siteData.cover_image !== '') {
    profile.image = imagePayload()
    profile.image.url = siteData.cover_image
  }

  if (profile.icon) {
    profile.icon.mediaType = contentTypeFromUrl(profile.icon.url)
  }

  if (profile.image) {
    profile.image.mediaType = contentTypeFromUrl(profile.image.url)
  }

  res.json(profile)
}
