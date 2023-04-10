import { execSync } from 'child_process'
import fs from 'fs'

let version = process.argv[2]
const packageJsonPath = 'package.json'

if (!version) {
  console.error('Please provide a semantic version argument (Eg: 1.0.4)')
  process.exit(1)
}

version = version.replace(/^v/, '')

try {
  var packageJson = JSON.parse(fs.readFileSync(packageJsonPath))
  packageJson.version = version

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  execSync(`git commit ${packageJsonPath} -m 'Setting package version to ${version}' && git tag v${version} && git push --tags`)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
