import { resetMockEnvironmentConfig } from './env-hook.js'
import { initializeEnvironment, MissingRequiredEnvironmentConfig } from '../src/environment.js'

function clearAndTestMissingRequiredConfig (valueName) {
  delete process.env[valueName]
  expect(initializeEnvironment).to.throw(MissingRequiredEnvironmentConfig)

  process.env[valueName] = ''
  expect(initializeEnvironment).to.throw(MissingRequiredEnvironmentConfig)
}

describe('environment', () => {
  beforeEach(() => {
    resetMockEnvironmentConfig()
  })

  const requiredValues = ['GHOST_SERVER', 'ACCOUNT_USERNAME', 'GHOST_CONTENT_API_KEY']
  requiredValues.forEach(key => {
    it(`should throw an error when no ${key} is specified`, () => {
      clearAndTestMissingRequiredConfig(key)
    })
  })

  describe('GHOST_SERVER', () => {
    it('should remove URI prefix from GHOST_SERVER URLs', () => {
      process.env.GHOST_SERVER = 'http://example.com'
      initializeEnvironment()

      expect(process.env.GHOST_SERVER).to.eql('example.com')
    })

    it('should remove white space from GHOST_SERVER URLs', () => {
      process.env.GHOST_SERVER = '  http://example.com    '
      initializeEnvironment()

      expect(process.env.GHOST_SERVER).to.eql('example.com')
    })
  })

  describe('API_ROOT_PATH', () => {
    it('should not have a trailing /', () => {
      process.env.API_ROOT_PATH = 'activitypub/'
      initializeEnvironment()

      expect(process.env.API_ROOT_PATH).to.eql('/activitypub')

      process.env.API_ROOT_PATH = 'foo/activitypub'
      initializeEnvironment()

      expect(process.env.API_ROOT_PATH).to.eql('/foo/activitypub')
    })

    it('should have a leading /', () => {
      process.env.API_ROOT_PATH = 'activitypub/'
      initializeEnvironment()

      expect(process.env.API_ROOT_PATH).to.eql('/activitypub')

      process.env.API_ROOT_PATH = '/activitypub/'
      initializeEnvironment()

      expect(process.env.API_ROOT_PATH).to.eql('/activitypub')

      process.env.API_ROOT_PATH = 'foo/activitypub/'
      initializeEnvironment()

      expect(process.env.API_ROOT_PATH).to.eql('/foo/activitypub')
    })

    it('should be / if config is empty', () => {
      process.env.API_ROOT_PATH = ''
      initializeEnvironment()

      expect(process.env.API_ROOT_PATH).to.eql('/')
    })
  })

  describe('SERVER_DOMAIN', () => {
    it('should match GHOST_SERVER if config is empty', () => {
      process.env.SERVER_DOMAIN = ''
      initializeEnvironment()

      expect(process.env.SERVER_DOMAIN).to.eql(process.env.GHOST_SERVER)
    })

    it('should convert URLs to a host name', () => {
      process.env.SERVER_DOMAIN = 'http://example.com'
      initializeEnvironment()

      expect(process.env.SERVER_DOMAIN).to.eql('example.com')

      process.env.SERVER_DOMAIN = 'http://example.com/foo/'
      initializeEnvironment()

      expect(process.env.SERVER_DOMAIN).to.eql('example.com')
    })

    it('should remove white space from SERVER_DOMAIN', () => {
      process.env.SERVER_DOMAIN = '  http://example.com    '
      initializeEnvironment()

      expect(process.env.SERVER_DOMAIN).to.eql('example.com')
    })

    it('should throw an error when provided an invalid hostname', () => {
      process.env.SERVER_DOMAIN = '5 23'
      expect(initializeEnvironment).to.throw(Error)
    })
  })

  describe('PROFILE_URL', () => {
    it('should match GHOST_SERVER if config is empty', () => {
      process.env.PROFILE_URL = ''
      initializeEnvironment()
      expect(process.env.PROFILE_URL).to.eql('https://' + process.env.GHOST_SERVER)
    })

    it('should not mach GHOST_SERVER if set to a different value', () => {
      process.env.PROFILE_URL = 'https://foo.com'
      initializeEnvironment()
      expect(process.env.PROFILE_URL).to.eql('https://foo.com')
    })
  })

  describe('SHOW_FOLLOWERS', () => {
    it('should be "true" if config is empty', () => {
      process.env.SHOW_FOLLOWERS = ''
      initializeEnvironment()
      expect(process.env.SHOW_FOLLOWERS).to.eql('true')
    })

    it('should be "true" or "false" when set to true or false', () => {
      process.env.SHOW_FOLLOWERS = 'false'
      initializeEnvironment()
      expect(process.env.SHOW_FOLLOWERS).to.eql('false')

      process.env.SHOW_FOLLOWERS = 'true'
      initializeEnvironment()
      expect(process.env.SHOW_FOLLOWERS).to.eql('true')
    })
  })
})
