const exec = require("child_process").exec
const fs = require("fs")
const { dataDir } = require("./utils")
const utils = require('./utils')
const crypto = require('crypto')
const certs = utils.certs

function run(shellCommand) {
    exec(shellCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`)
            process.exit(1)
        }

        if (stdout) {
            console.log(stdout)
        }

        if (stderr) {
            console.log(stderr)
        }
    })
}

try {
    if (!fs.existsSync(certs.dir)) {
        fs.mkdirSync(certs.dir, { recursive: true })
    }
    
    if (!fs.existsSync(certs.privateKeyPath)) {
        // If the private key does not exist then create it
        run(`openssl genrsa -out ${certs.privateKeyPath} && openssl rsa -in ${certs.privateKeyPath} -pubout -out ${certs.publicKeyPath}`)
    }

    if (!fs.existsSync(utils.apiKeyPath)) {
        fs.writeFileSync(utils.apiKeyPath, crypto.randomUUID())
    }

} catch(err) {
    console.error(err)
    process.exit(1)
}