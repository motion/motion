import path from 'path'
import ws from 'nodejs-websocket'
import log from '../lib/log'
import wport from '../lib/wport'
import cache from '../cache'

let wsServer
let connected = false
let connections = []
let queue = []
let curError = null

function broadcast(data) {
  connections.forEach(conn => {
    conn.sendText(data)
  })
}

function runQueue() {
  if (queue.length && wsServer) {
    queue.forEach(broadcast)
    queue = [];
  }
}

function sendInitialMessages(conn) {
  conn.sendText(curError)
  // conn.sendText(makeMessage('flint:baseDir', { dir: cache.baseDir() }))
}

function cleanError(obj) {
  obj.error.file = path.relative(cache.baseDir(), obj.error.fileName)
  return obj
}

function makeMessage(type, obj) {
  obj = obj || {}
  obj._type = type
  obj.timestamp = Date.now()

  // formatting
  switch(type) {
    case 'compile:error':
      obj = cleanError(obj)
      break
  }

  let msg = JSON.stringify(obj)

  return msg
}

export function message(type, obj) {
  let msg = makeMessage(type, obj)

  // store last error or success
  if (type.indexOf('compile:error') > 0 || type.indexOf('compile:success') > 0) {
    curError = msg
  }

  log('-[socket msg]-', msg)

  if (connected)
    broadcast(msg)
  else
    queue.push(msg)
}

let listeners = {}
export function on(event, cb) {
  listeners[event] = listeners[event] || []
  listeners[event].push(cb)
}

function runListeners(data) {
  let obj

  try {
    obj = JSON.parse(data)
  }
  catch(e) {
    console.error(e.stack)
    return
  }

  const { ...args, _type } = obj
  const ls = listeners[_type]
  if (!ls || !ls.length) return
  ls.forEach(l => l(args))
}

export function start() {
  const port = wport()

  wsServer = ws.createServer(conn => {
    connections.push(conn)

    conn.on('text', runListeners)

    const onMsg = JSON.stringify({ _type: 'super:on', file: 'main.js' })
    const offMsg = JSON.stringify({ _type: 'super:off', file: 'main.js' })
    setTimeout(() => runListeners(onMsg), 2000)
    setTimeout(() => runListeners(offMsg), 6000)

    if (curError) {
      sendInitialMessages(conn)
    }

    conn.on('error', err => {})

    if (connected) return
    connected = true
    runQueue()
  }).listen(port)
}

export default { start, message, on }