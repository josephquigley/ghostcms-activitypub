
const express = require('express')

function sanitizeHashtagName (name) {
  name = name.replace(/\s+/g, '').replace(/[_]+/g, '')
  let sanitizedName = ''

  name.match(/[\w\d]*/g).forEach((match) => {
    sanitizedName += match
  })
  return sanitizedName
}

function createTagCollectionPayload (ghostTag, ghostPosts) {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${global.tagsURL}/${ghostTag.slug}`,
    type: 'OrderedCollection',
    totalItems: ghostTag.count.posts,
    orderedItems: [] // TODO parse ghostPosts array into post payload
  }
}

function createTagHtml (ghostTag, name) {
  const tagObject = createTagPayload(ghostTag, name)
  return `<a href="${tagObject.href}" class="mention hashtag" rel="tag">#<span>${tagObject.name.replace('#', '')}</span></a>`
}

function createTagPayload (ghostTag, name) {
  let slug = ''
  if (typeof ghostTag === 'string') {
    slug = ghostTag
  } else {
    slug = ghostTag.slug
    name = ghostTag.name
  }
  return {
    type: 'Hashtag',
    href: `${global.tagsURL}/${slug}`,
    name: `#${sanitizeHashtagName(name)}`
  }
}

async function tagCollectionRoute (req, res) {
  const ghost = req.app.get('ghost')
  const slug = req.path.replace(/\/*/, '')

  try {
    const tagData = await ghost.tags.read({ slug }, { include: 'count.posts', filter: 'visibility:public' })

    const shouldForwardHTMLToGhost = process.env.NODE_ENV === 'production' || req.query.forward

    if (req.get('Accept').includes('text/html') && shouldForwardHTMLToGhost) {
      res.redirect(tagData.url)
      return
    }

    const postsForTag = await ghost.posts.browse({ limit: 10, filter: `tag:${slug}`, formats: ['html'] })
    console.log(postsForTag)

    res.json(createTagCollectionPayload(tagData, postsForTag))
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).send(err.response.statusText)
    } else {
      res.status(500).send('Unable to fetch tag.')
    }
  }
}

module.exports = {
  router: express.Router().get('/:tagName', tagCollectionRoute),
  createTagPayload,
  createTagCollectionPayload,
  createTagHtml
}
