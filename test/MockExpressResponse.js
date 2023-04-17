
export class MockExpressResponse {
  jsonPayload
  statusCode

  json (payload) {
    this.statusCode = 200
    this.jsonPayload = JSON.parse(JSON.stringify(payload))
  }

  send () {
    // Intentionally blank
  }

  status (value) {
    this.statusCode = value
    return this
  }
}

export default MockExpressResponse
