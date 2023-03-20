const utils = require('../utils')
const fs = require('fs')

const mastodonAttachments = {
  attachment: [
    {
      type: 'PropertyValue',
      name: 'Website',
      value: `<a href="${global.profileURL}" target="_blank" rel="nofollow noopener noreferrer me"><span class="invisible">https://</span><span class="">${utils.removeHttpURI(global.profileURL)}</span><span class="invisible"></span></a>`
    }
  ]
}

function readPublicKey () {
  return fs.readFileSync(utils.certs.publicKeyPath, 'utf8')
}

const profilePayload = {
  '@context': [
    'https://www.w3.org/ns/activitystreams',
    'https://w3id.org/security/v1'
  ],
  id: global.accountURL,
  type: 'Service', // Bots are 'Service' types
  // "following": "https://meta.masto.host/users/GamingNews/following",
  // "followers": "https://meta.masto.host/users/GamingNews/followers",
  inbox: global.inboxURL,
  // "outbox": "https://meta.masto.host/users/GamingNews/outbox",
  // "featured": "https://meta.masto.host/users/GamingNews/collections/featured",
  // "featuredTags": "https://meta.masto.host/users/GamingNews/collections/tags",
  preferredUsername: process.env.ACCOUNT_USERNAME,
  name: process.env.ACCOUNT_NAME,
  summary: '',
  url: global.profileURL,
  manuallyApprovesFollowers: false,
  discoverable: true,
  attachment: mastodonAttachments,
  publicKey: {
    id: `${global.accountURL}/public_key`,
    owner: global.accountURL,
    publicKeyPem: readPublicKey()
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

const profile = async function (req, res, next) {
  const ghost = req.app.get('ghost')

  const siteData = await ghost.settings.browse()

  profilePayload.name = siteData.title
  profilePayload.summary = siteData.description // TODO add h-card data?
  profilePayload.published = req.app.get('account_created_at')

  profilePayload.icon = imagePayload()
  if (siteData.logo && siteData.logo !== '') {
    profilePayload.icon.url = siteData.logo
  } else {
    profilePayload.icon.url = `https://${process.env.SERVER_DOMAIN}${global.staticImagesPath}/ghost-logo-orb.jpg`
  }

  if (siteData.cover_image && siteData.cover_image !== '') {
    profilePayload.image = imagePayload()
    profilePayload.image.url = siteData.cover_image
  }

  if (profilePayload.icon) {
    profilePayload.icon.mediaType = contentTypeFromUrl(profilePayload.icon.url)
  }

  if (profilePayload.image) {
    profilePayload.image.mediaType = contentTypeFromUrl(profilePayload.image.url)
  }

  res.json(profilePayload)
}

module.exports = profile
