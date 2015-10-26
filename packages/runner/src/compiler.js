import npm from './npm'
import log from './lib/log'
import cache from './cache'
import gutil from 'gulp-util'
import through from 'through2'

let views = []
let OPTS

const isNotIn = (x,y) => x.indexOf(y) == -1
const shortFile = file => file.replace(OPTS.dir.replace('.flint', ''), '')
const filePrefix = file => `!function() { return Flint.file('${shortFile(file)}', function(exports) { "use strict";`
const fileSuffix = ' }) }();'
const viewMatcher = /^view\s+([\.A-Za-z_0-9]*)\s*\{/

let debouncers = {}
function debounce(key, cb, time) {
  if (debouncers[key])
    clearTimeout(debouncers[key])

  debouncers[key] = setTimeout(cb, time)
}

var Parser = {
  init(opts) {
    OPTS = opts || {}
  },

  post(file, source) {
    debounce(file, () => npm.scanFile(file, source), 400) // scan for imports
    source = filePrefix(file) + source + fileSuffix // add file
    return { source }
  },

  pre(file, source) {
    let inView = false
    let viewNames = []

    source = source
      .replace(/\^/g, '__.props.')
      .split("\n")
      .map((line, index) => {
        let result = line

        let view = result.match(viewMatcher);

        if (view && view.length) {
          inView = true
          viewNames.push(result.split(' ')[1])
        }

        const JSXstart = inView && (
          line.charAt(2) == '<' &&
          line.charAt(3) != '/'
        )

        if (JSXstart)
          result = ';' + result.substr(1)

        if (inView)
          result = result.replace(/\$\.([A-Za-z0-9]+\s*\=)/, '$_class_$1')

        if (inView && line.charAt(0) == '}')
          inView = false

        return result
      })
      .join("\n")

    if (!OPTS.build) {
      cache.add(file)
      cache.setViews(file, viewNames)
    }

    return { source }
  }
}

function compile(type, opts = {}) {
  if (type == 'init')
    return Parser.init(opts)

  return through.obj(function(file, enc, next) {
    if (file.isNull()) {
      next(null, file)
      return
    }

    try {
      let res = Parser[type](file.path, file.contents.toString(), opts)
      file.contents = new Buffer(res.source)
      this.push(file)
    }
    catch (err) {
      this.emit('error',
        new gutil.PluginError('flint', err, {
          fileName: file.path,
          showProperties: false
        })
      )
    }

    next()
  })
}

export default compile