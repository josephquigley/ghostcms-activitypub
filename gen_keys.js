const exec = require("child_process").exec
const fs = require("fs")
const certs = require('./utils').certs

fs.access(certs.dir, (error) => {
    // To check if the given directory 
    // already exists or not
    if (error) {
        // If current directory does not exist
        // then create it
        fs.mkdir(certs.dir, (error) => {
        if (error) {
            console.error(error);
            process.exit(1)
        } else {
            console.log("Created certs directory.");
        }
        });
    }
})

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

fs.access(certs.privateKeyPath, (error) => {
    if (error) {
        // If the private key does not exist then create it
        run(`openssl genrsa -out ${certs.privateKeyPath}`)
    }

    fs.access(certs.publicKeyPath, (error) => {
        if (error) {
            // If the public key does not exist then create it
            run(`openssl rsa -in ${certs.privateKeyPath} -pubout -out ${certs.publicKeyPath}`)
        }
    })
})

process.exit(0)