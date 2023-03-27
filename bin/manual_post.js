#!/usr/bin/env node

// Load config
import { postJSON } from '../src/utils.js'
import { url, key } from '../src/constants.js'
import { getPostAsync } from '../src/routes/post.js'
import path from 'path'

const fakeWebhook = (post, mode) => {
  return {
    post: {
      current: mode === 'publish' ? post : {},
      previous: mode === 'delete' ? post : {}
    }
  }
}

const arg = process.argv[2]
const id = process.argv[3]
const basename = `${path.basename(process.argv[1])}`

function printHelpMessage () {
  console.log(`Usage: ${basename} [options] [ghost post id]`)
  console.log('Options:\n')
  console.log('\t-p\t\tPost a Ghost post to all followers.')
  console.log('\t-d\t\tDelete a Ghost from all followers.(Note, due to the open nature of\n\t\t\tActivityPub/the Fediverse, this is not a guarantee, only a request.')
}

if (process.argv.length <= 2) {
  printHelpMessage()
  process.exit(1)
}

if (arg === '-h' || arg === '--help') {
  printHelpMessage()
  process.exit(0)
}

if (arg !== '-p' && arg !== '-d') {
  console.log(`An action mode (-p to post, -d to delete a post) is required. Eg: '${basename} -p 641b53d20d3ab0e0000ecc89'`)
  process.exit(1)
}

if (!id) {
  console.log(`A message or post id is required. Eg: '${basename} ${arg} 641b53d20d3ab0e0000ecc89'`)
  process.exit(1)
}

process.env.NODE_ENV = 'development'

// // if ghost post id
// if (arg.match(/[\d\w]{24}/)) {
//   operation = () => { return post(arg) }
// } else {
//   // Regular message
//   operation = () => { return message(arg) }
// }

getPostAsync(id).then(post => {
  if (arg === '-p') {
    return postJSON(`${url.publish}?apiKey=${key.api}`, fakeWebhook(post, 'publish'))
  } else if (arg === '-d') {
    return postJSON(`${url.delete}?apiKey=${key.api}`, fakeWebhook(post, 'delete'))
  }
  process.exit(0)
}).catch(err => {
  // API sends back an empty response, which breaks JSON parsing in the bent library
  if (err instanceof SyntaxError && !err.statusCode) {
    process.exit(0)
  }
  console.error(err.statusCode, err.message)
  process.exit(1)
})
