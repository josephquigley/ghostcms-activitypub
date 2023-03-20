let certsDir = 'certs'

module.exports = {
    removeHttpURI: function(str) {
        return str.replace(/^http[s]*:\/\//, '')
    },

    certs: {
        dir: certsDir,
        privateKeyPath: `${certsDir}/key.pem`,
        publicKeyPath: `${certsDir}/pubkey.pem`
    }
}