module.exports = {
    removeHttpURI: function(str) {
        return str.replace(/^http[s]*:\/\//, '')
    }
}