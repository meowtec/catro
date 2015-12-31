'use strict'

import { Readable } from 'stream'
import { EventEmitter } from 'events'

export function debounce(wait: number, fun?: Function) {
  var timer, func0, waitMs

  if (typeof fun === 'function') {
    func0 = fun
    waitMs = wait
  }
  else {
    func0 = null
    waitMs = fun
  }

  return (func1?: Function) => {
    clearTimeout(timer)
    var fun = func1 || func0
    fun && (timer = setTimeout(fun, waitMs))
  }
}

export function parseHost(host: string) {
  var tuple = host.split(':')
  return {
    host: tuple[0],
    port: parseInt(tuple[1] || '80', 10)
  }
}
