import state, { resetProgramState } from '../state'
import { t, options, relativePath } from '../lib/helpers'

export default {
  enter() {
    resetProgramState()
  },

  exit(node, parent, scope, file) {
    state.file.meta.file = file.opts.filename

    if (options.onMeta) {
      options.onMeta(state.file.meta)
    }

    const location = relativePath(file.opts.filename)

    console.log('first run?', options.firstRun)

    if (!options.firstRun && state.file.meta.isHot) {
      // function(){ Motion.file('${location}',function(require, exports){ ${contents}\n  })\n}()
      node.body = [t.expressionStatement(
        // closure
        t.callExpression(t.functionExpression(null, [], t.blockStatement([
          t.callExpression(t.identifier('Motion.file'), [t.literal(location),
            t.functionExpression(null, [t.identifier('require')],
              t.blockStatement(node.body)
            )
          ])
        ])), [])
      )]
    }
  }
}
