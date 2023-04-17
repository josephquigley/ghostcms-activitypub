
export class MockGhostAPI {
  constructor (settingsData, postsData) {
    this.settings = {
      browse: () => {
        if (settingsData) {
          return settingsData()
        } else {
          return {
            settings: {
              title: 'Ghost',
              description: 'The professional publishing platform',
              logo: 'https://docs.ghost.io/content/images/2014/09/Ghost-Transparent-for-DARK-BG.png',
              icon: 'https://docs.ghost.io/content/images/2017/07/favicon.png',
              accent_color: null,
              cover_image: 'https://docs.ghost.io/content/images/2019/10/publication-cover.png',
              facebook: 'ghost',
              twitter: '@tryghost',
              lang: 'en',
              timezone: 'Etc/UTC',
              codeinjection_head: null,
              codeinjection_foot: '<script src="//rum-static.pingdom.net/pa-5d8850cd3a70310008000482.js" async></script>',
              navigation: [
                {
                  label: 'Home',
                  url: '/'
                },
                {
                  label: 'About',
                  url: '/about/'
                },
                {
                  label: 'Getting Started',
                  url: '/tag/getting-started/'
                },
                {
                  label: 'Try Ghost',
                  url: 'https://ghost.org'
                }
              ],
              secondary_navigation: [],
              meta_title: null,
              meta_description: null,
              og_image: null,
              og_title: null,
              og_description: null,
              twitter_image: null,
              twitter_title: null,
              twitter_description: null,
              members_support_address: 'noreply@docs.ghost.io',
              url: 'https://docs.ghost.io/'
            }
          }
        }
      }
    }
    this.posts = {
      browse: () => {
        if (postsData) {
          return postsData()
        } else {
          const payload = [
            {
              slug: 'welcome-short',
              id: '5ddc9141c35e7700383b2937',
              uuid: 'a5aa9bd8-ea31-415c-b452-3040dae1e730',
              title: 'Welcome',
              html: "<p>👋 Welcome, it's great to have you here.</p>",
              comment_id: '5ddc9141c35e7700383b2937',
              feature_image: 'https://static.ghost.org/v3.0.0/images/welcome-to-ghost.png',
              feature_image_alt: null,
              feature_image_caption: null,
              featured: false,
              visibility: 'public',
              created_at: '2019-11-26T02:43:13.000+00:00',
              updated_at: '2019-11-26T02:44:17.000+00:00',
              published_at: '2019-11-26T02:44:17.000+00:00',
              custom_excerpt: null,
              codeinjection_head: null,
              codeinjection_foot: null,
              custom_template: null,
              canonical_url: null,
              url: 'https://docs.ghost.io/welcome-short/',
              excerpt: "👋 Welcome, it's great to have you here.",
              reading_time: 0,
              access: true,
              og_image: null,
              og_title: null,
              og_description: null,
              twitter_image: null,
              twitter_title: null,
              twitter_description: null,
              meta_title: null,
              meta_description: null,
              email_subject: null
            }
          ]

          payload.meta = {
            pagination: {
              page: 2,
              limit: 10,
              pages: 3,
              total: 1,
              next: 3,
              prev: 1
            }
          }

          return payload
        }
      }
    }
  }
}
