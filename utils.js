const sqlite3 = require('sqlite3')

let dataDir = 'data'
let certsDir = `${dataDir}/certs`
let dbName = 'database.db'
let dbPath = `${dataDir}/${dbName}`

function createDatabase() {
    const newDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Could not create database:\n" + err);
            exit(1);
        }
        createTables(newDb);
    })

    return newDb
}

function openDatabase() {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err && err.code == "SQLITE_CANTOPEN") {
            return createDatabase()
        } else if (err) {
            console.error("Could not open database:\n" + err);
            process.exit(1);
        }
    })

    return db
}

function createTables(db) {
    db.exec(`
    create table if not exists followers (
        follower_uri text primary key not null,
        inbox text not null
    );
    `)
}

module.exports = {
    removeHttpURI: function(str) {
        return str.replace(/^http[s]*:\/\//, '')
    },

    certs: {
        dir: certsDir,
        privateKeyPath: `${certsDir}/key.pem`,
        publicKeyPath: `${certsDir}/pubkey.pem`
    },

    db: openDatabase()
}