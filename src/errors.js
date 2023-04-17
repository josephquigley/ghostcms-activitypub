export class MissingRequiredParameterError extends Error {
  constructor (field, type, ...args) {
    const missingMessage = `The parameter, '${field}' is required.`
    const wrongTypeMessage = `The parameter, '${field}' is the wrong type. Expected ${type}.`
    const message = type ? wrongTypeMessage : missingMessage
    super(message, ...args)
    this.message = message
  }
}
