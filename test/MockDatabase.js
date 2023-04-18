import { PostPublishState } from '../src/Database.js'

export class MockDatabase {
  constructor (postStates, createPostState) {
    this.postState = createPostState ?? new PostPublishState('foo', 'published', new Date().getTime())
    this.postStates = postStates ?? [this.postState]
    this.followerPayload = []
    this.followerPayload.meta = {
      pagination: {
        total: 0,
        limit: 10,
        pages: 1,
        page: 1,
        next: null,
        prev: null

      }
    }
    this.onDeleteFollower = () => {

    }
  }

  getPostState (ghostId, state) {
    return this.postStates
  }

  createPostState = (post) => {
    return this.postState
  }

  getFollowers = () => {
    return this.followerPayload
  }

  deleteFollowerWithUri (uri) {
    this.onDeleteFollower(uri)
  }
}
