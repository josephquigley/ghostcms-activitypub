import { execSync } from 'child_process'
import fs from 'fs'
import crypto from 'crypto'

let didInit = false

export function genKeys (filePath) {
  function readKeys () {
    return {
      public: fs.readFileSync(filePath.publicKey, 'utf8'),
      private: fs.readFileSync(filePath.privateKey, 'utf8'),
      api: fs.readFileSync(filePath.apiKey, 'utf8')
    }
  }

  if (didInit) {
    return readKeys()
  }

  try {
    if (!fs.existsSync(filePath.certsDir)) {
      fs.mkdirSync(filePath.certsDir, { recursive: true })
    }

    if (!fs.existsSync(filePath.privateKey)) {
      // If the private key does not exist then create it
      execSync(`openssl genrsa -out ${filePath.privateKey} && openssl rsa -in ${filePath.privateKey} -pubout -out ${filePath.publicKey}`)
    }

    if (!fs.existsSync(filePath.apiKey)) {
      fs.writeFileSync(filePath.apiKey, crypto.randomUUID())
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }

  didInit = true

  return readKeys()
}
