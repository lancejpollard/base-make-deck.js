
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

  const basePath = pathResolver.join(configDirectory, config.basePath)

  const { filePath: leadPath } = resolvePath({
    host: deck.host,
    site: deck.site,
    basePath: basePath,
    filePath: config.leadPath
  })

  config.list.forEach(fileConfig => {
    const file = {
      filePath: null,
      fileType: fileConfig.fileType,
      road: null,
      lead: null,
      host: null,
      text: null,
      tree: null
    }

    const {
      filePath,
      loadPath,
      isDirectory,
    } = resolvePath({
      host: deck.host,
      site: deck.site,
      basePath: basePath,
      filePath: fileConfig.filePath
    })

    file.filePath = pathResolver.relative(basePath, filePath)
    file.road = loadPath
    file.lead = filePath === leadPath
    file.host = isDirectory
    file.text = read(filePath)
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

  deck.basePath = pathResolver.relative(process.cwd(), basePath)

  Object.keys(deck.load).forEach(loadPath => {
    const file = deck.load[loadPath]
    resolveImportDependencies(deck, loadPath, file)
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

  const loadPath = `@${host}/${site}/${relativePath}`.replace(/\/$/, '')

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
            isDirectory: false,
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
        isDirectory: true,
        loadPath
      }
    }
  }
}

function resolveImportDependencies(deck, road, file, list = []) {
  if (file.load) {
    file.load.forEach(load => {
      resolveImportDependenciesRoad(deck, road, load, list)
    })
  }
  file.load = list
}

function resolveImportDependenciesRoad(deck, baseRoad, load, list) {
  if (load.road.startsWith('@')) {
    if (load.take.length) {
      list.push({ road: load.road, take: load.take })
    }
    const road = load.road
    let file = deck.load[road]
    let directory = file.host ? road : pathResolver.dirname(road)
    load.load.forEach(load => {
      resolveImportDependenciesRoad(deck, directory, load, list)
    })
  } else {
    let baseFile = deck.load[baseRoad]
    let baseDirectory = baseFile.host ? baseRoad : pathResolver.dirname(baseRoad)
    let road = pathResolver.join(baseDirectory, load.road)
    if (load.take.length) {
      list.push({ road, take: load.take })
    }
    let file = deck.load[road]
    let directory = file.host ? road : pathResolver.dirname(road)
    load.load.forEach(load => {
      resolveImportDependenciesRoad(deck, directory, load, list)
    })
  }
}

function read(path) {
  return fs.readFileSync(path, 'utf-8')
}
