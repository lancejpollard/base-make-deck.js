
const fs = require('fs')

/**
 * This loads the config,
 * reads all the files,
 * then compiles into primitive objects,
 * and resolves the load imports.
 */

module.exports = load

function load(input) {
  const output = {
    files: [],
    entry: null,
  }
}

function read(path) {
  return fs.readFileSync(path, 'utf-8')
}
