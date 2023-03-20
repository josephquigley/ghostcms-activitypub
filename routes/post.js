const postGet = async function (req, res) {
  const postId = req.params.postId
  if (!postId) {
    return res.status(400).send('Bad request.')
  }

  const ghost = req.app.get('ghost')

  try {
    const post = await ghost.posts.read({ id: postId, include: 'tags' }, { formats: ['html'] })

    const postPayload = {
      id: post.id,
      created_at: post.published_at,
      in_reply_to_id: null,
      in_reply_to_account_id: null,
      sensitive: false,
      spoiler_text: '',
      visibility: 'public',
      language: req.app.get('language'),
      uri: `https://${process.env.SERVER_DOMAIN}${process.env.API_ROOT_PATH}${global.actorPath}/${process.env.ACCOUNT_USERNAME}/${postId}`,
      url: post.url,
      content: post.html
    }

    if (post.excerpt) {
      postPayload.spoiler_text = post.excerpt
    } else if (post.custom_excerpt) {
      postPayload.spoiler_text = post.custom_excerpt
    }

    if (post.tags && post.tags.length > 0) {
      postPayload.tags = post.tags.map((tag) => {
        return `#${tag.name.replace(/\s+/, '')}`
      })
    }

    res.json(postPayload)
  } catch (e) {
    res.status(404).send(e.message)
  }
}

// {

//     "uri": "https://mastodon.social/users/Gargron/statuses/1",
//     "url": "https://mastodon.social/@Gargron/1",
//     "replies_count": 7,
//     "reblogs_count": 98,
//     "favourites_count": 112,
//     "favourited": false,
//     "reblogged": false,
//     "muted": false,
//     "bookmarked": false,
//     "content": "<p>Hello world</p>",
//     "reblog": null,
//     "application": null,
//     "account": {
//       "id": "1",
//       "username": "Gargron",
//       "acct": "Gargron",
//       "display_name": "Eugen",
//       "locked": false,
//       "bot": false,
//       "created_at": "2016-03-16T14:34:26.392Z",
//       "note": "<p>Developer of Mastodon and administrator of mastodon.social. I post service announcements, development updates, and personal stuff.</p>",
//       "url": "https://mastodon.social/@Gargron",
//       "avatar": "https://files.mastodon.social/accounts/avatars/000/000/001/original/d96d39a0abb45b92.jpg",
//       "avatar_static": "https://files.mastodon.social/accounts/avatars/000/000/001/original/d96d39a0abb45b92.jpg",
//       "header": "https://files.mastodon.social/accounts/headers/000/000/001/original/c91b871f294ea63e.png",
//       "header_static": "https://files.mastodon.social/accounts/headers/000/000/001/original/c91b871f294ea63e.png",
//       "followers_count": 320472,
//       "following_count": 453,
//       "statuses_count": 61163,
//       "last_status_at": "2019-12-05T03:03:02.595Z",
//       "emojis": [],
//       "fields": [
//         {
//           "name": "Patreon",
//           "value": "<a href=\"https://www.patreon.com/mastodon\" rel=\"me nofollow noopener noreferrer\" target=\"_blank\"><span class=\"invisible\">https://www.</span><span class=\"\">patreon.com/mastodon</span><span class=\"invisible\"></span></a>",
//           "verified_at": null
//         },
//         {
//           "name": "Homepage",
//           "value": "<a href=\"https://zeonfederated.com\" rel=\"me nofollow noopener noreferrer\" target=\"_blank\"><span class=\"invisible\">https://</span><span class=\"\">zeonfederated.com</span><span class=\"invisible\"></span></a>",
//           "verified_at": "2019-07-15T18:29:57.191+00:00"
//         }
//       ]
//     },
//     "media_attachments": [],
//     "mentions": [],
//     "tags": [],
//     "emojis": [],
//     "card": null,
//     "poll": null
//   }

module.exports = { get: postGet }
