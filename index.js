
const fs = require('fs')
const pathResolver = require('path')
const buildFile = require('@lancejpollard/primitive-link-object-builder.js')
const parseTextIntoTree = require('@lancejpollard/link-parser.js')

/**
 * This loads the config,
 * reads all the files,
 * then compiles into primitive objects,
 * and resolves the load imports.
 */

module.exports = load

function load(configPath) {
  const configDirectory = pathResolver.resolve(pathResolver.dirname(configPath))
  const config = JSON.parse(read(configPath))

  const deck = {
    host: config.host,
    site: config.site,
    basePath: null,
    load: {},
    lead: null,
  }

  deck.basePath = pathResolver.join(configDirectory, config.basePath)

  const { filePath: leadPath } = resolvePath({
    host: deck.host,
    site: deck.site,
    basePath: deck.basePath,
    filePath: config.leadPath
  })

  config.list.forEach(fileConfig => {
    const file = {
      filePath: null,
      fileType: fileConfig.fileType,
      lead: null,
      text: null,
      tree: null
    }

    const {
      filePath,
      loadPath
    } = resolvePath({
      host: deck.host,
      site: deck.site,
      basePath: deck.basePath,
      filePath: fileConfig.filePath
    })

    file.filePath = filePath
    file.lead = file.filePath === leadPath
    file.text = read(file.filePath)
    file.tree = parseTextIntoTree(file.text)

    if (file.lead) {
      deck.lead = loadPath
    }

    const object = buildFile({
      tree: file.tree,
      type: file.fileType
    })

    deck.load[loadPath] = {
      ...file,
      ...object,
    }
  })

  return deck
}

function resolvePath({ host, site, basePath, filePath }) {
  const givenPath = pathResolver.join(basePath, filePath)
  let potentialPath = givenPath

  const relativePath = pathResolver.relative(
    basePath,
    givenPath
  )

  const loadPath = `@${host}/${site}/${relativePath}`

  while (true) {
    const fileName = pathResolver.basename(potentialPath)

    const isPotentialFile = fileName.endsWith('.link')

    if (fileName !== 'base.link') {
      if (fs.existsSync(potentialPath)) {
        if (fs.statSync(potentialPath).isDirectory()) {
          potentialPath = `${potentialPath}/base.link`
        } else {
          return {
            filePath: potentialPath,
            loadPath
          }
        }
      } else if (!isPotentialFile) {
        potentialPath = `${potentialPath}.link`
      } else {
        throw new Error(`File ${potentialPath} does not exist`)
      }
    } else if (!fs.existsSync(potentialPath)) {
      throw new Error(`File ${potentialPath} does not exist`)
    } else {
      return {
        filePath: potentialPath,
        loadPath
      }
    }
  }
}

function read(path) {
  return fs.readFileSync(path, 'utf-8')
}
