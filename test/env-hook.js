export function resetMockEnvironmentConfig () {
  process.env.GHOST_SERVER = 'example.com'
  process.env.ACCOUNT_USERNAME = 'test_user'
  process.env.GHOST_CONTENT_API_KEY = '1234'
  process.env.API_ROOT_PATH = ''
  process.env.SERVER_DOMAIN = ''
  process.env.PROFILE_URL = ''
  process.env.SHOW_FOLLOWERS = ''
}

resetMockEnvironmentConfig()
