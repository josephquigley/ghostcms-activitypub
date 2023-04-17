import { PostPublishState } from '../src/Database.js'

export class MockDatabase {
  constructor (postStates) {
    this.postStates = postStates ?? [new PostPublishState('foo', 'published', new Date().getTime())]
  }

  getPostState (ghostId, state) {
    return this.postStates
  }
}
