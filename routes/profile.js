const express = require('express')
const router = express.Router()
const utils = require('../utils')

const mastodonAttachments = {
  attachment: [
    {
      type: 'PropertyValue',
      name: 'Website',
      value: `<a href="${global.profileURL}" target="_blank" rel="nofollow noopener noreferrer me"><span class="invisible">https://</span><span class="">${utils.removeHttpURI(global.profileURL)}</span><span class="invisible"></span></a>`
    }
  ]
}

const profilePayload = {
  id: global.accountURL,
  type: 'Service', // Bots are 'Service' types
  // "following": "https://meta.masto.host/users/GamingNews/following",
  // "followers": "https://meta.masto.host/users/GamingNews/followers",
  // "inbox": "https://meta.masto.host/users/GamingNews/inbox",
  // "outbox": "https://meta.masto.host/users/GamingNews/outbox",
  // "featured": "https://meta.masto.host/users/GamingNews/collections/featured",
  // "featuredTags": "https://meta.masto.host/users/GamingNews/collections/tags",
  preferredUsername: process.env.ACCOUNT_USERNAME,
  name: process.env.ACCOUNT_NAME,
  summary: '',
  url: global.profileURL,
  manuallyApprovesFollowers: false,
  discoverable: true,
  // "published": "2022-12-10T00:00:00Z",
  attachment: mastodonAttachments
}

function imagePayload () {
  return {
    type: 'Image',
    mediaType: 'image/png'
  }
}

router.get('/', async function (req, res, next) {
  const ghost = req.app.get('ghost')

  const siteData = await ghost.settings.browse()

  profilePayload.name = siteData.title
  profilePayload.summary = siteData.description // TODO add h-card data?
  profilePayload.published = req.app.get('account_created_at')

  if (siteData.icon && siteData.icon !== '') {
    profilePayload.icon = imagePayload()
    profilePayload.icon.url = siteData.icon
  }

  if (siteData.logo && siteData.logo !== '') {
    profilePayload.icon = imagePayload()
    profilePayload.icon.url = siteData.logo
  }

  if (siteData.cover_image && siteData.cover_image !== '') {
    profilePayload.image = imagePayload()
    profilePayload.image.url = siteData.cover_image
  }

  res.json(profilePayload)
})

module.exports = router
