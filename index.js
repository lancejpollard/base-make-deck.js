
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
  const configArray = JSON.parse(read(configPath))

  const deck = configArray.reduce((mainDeck, config) => {
    const deck = {
      host: config.host,
      site: config.site,
      basePath: null,
      load: {},
      lead: null,
    }

    const basePath = pathResolver.join(configDirectory, config.basePath)

    const { filePath: leadPath } = config.leadPath ? resolvePath({
      host: deck.host,
      site: deck.site,
      basePath: basePath,
      filePath: config.leadPath
    }) : { }

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

      console.log(filePath)

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

    mainDeck.load = {
      ...mainDeck.load,
      ...deck.load,
    }

    if (leadPath) {
      mainDeck.leadPath = leadPath
      mainDeck.lead = deck.lead
    }

    return mainDeck
  }, {})

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
  file.name = {}
  if (file.load) {
    file.load.forEach(load => {
      resolveImportDependenciesRoad(file.name, deck, road, load, list)
    })
  }
  file.load = list
}

function resolveImportDependenciesRoad(name, deck, baseRoad, load, list) {
  if (load.road.startsWith('@')) {
    if (load.take.length) {
      const childLoad = { road: load.road, take: load.take }
      list.push(childLoad)
      childLoad.take.forEach(take => {
        const hostName = name[take.host] = name[take.host] ?? {}
        hostName[take.base] = childLoad.road
      })
    }
    const road = load.road
    let file = deck.load[road]
    if (!file) throw new Error(`File ${road} not found`)
    let directory = file.host ? road : pathResolver.dirname(road)
    load.load.forEach(load => {
      resolveImportDependenciesRoad(name, deck, directory, load, list)
    })
  } else {
    let baseFile = deck.load[baseRoad]
    let baseDirectory = baseFile.host ? baseRoad : pathResolver.dirname(baseRoad)
    let road = pathResolver.join(baseDirectory, load.road)
    if (load.take.length) {
      const childLoad = { road, take: load.take }
      list.push(childLoad)
      childLoad.take.forEach(take => {
        const hostName = name[take.host] = name[take.host] ?? {}
        hostName[take.base] = childLoad.road
      })
    }
    let file = deck.load[road]
    if (!file) throw new Error(`File ${road} not found in ${baseRoad}`)
    let directory = file.host ? road : pathResolver.dirname(road)
    load.load.forEach(load => {
      resolveImportDependenciesRoad(name, deck, directory, load, list)
    })
  }
}

function read(path) {
  return fs.readFileSync(path, 'utf-8')
}
