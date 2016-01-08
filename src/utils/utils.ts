'use strict'

import { Readable } from 'stream'
import { EventEmitter } from 'events'
import * as minilog from 'minilog'

export function debounce(wait: number, fun0?: Function) {
  let timer

  return (func1?: Function) => {
    clearTimeout(timer)
    let fun = func1 || fun0

    fun && (timer = setTimeout(fun, wait))
  }
}

export function parseHost(host: string) {
  let tuple = host.split(':')
  return {
    host: tuple[0],
    port: parseInt(tuple[1] || '80', 10)
  }
}
