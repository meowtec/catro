'use strict'

import { EventEmitter } from 'events'
import { Logger } from '../typed'
import 'colors'

export default function Logger(emitter: EventEmitter): (name: string) => Logger {
  return function create(name) {
    return {
      info(...args) {
        emitter.emit.apply(emitter, ['log:info', `[${name}]`.blue, ...args])
      },
      warn(...args) {
        let arr = ['log:warn', `[${name}]`.bgYellow, ...args]
        if (emitter.listenerCount('log:warn')) {
          emitter.emit.apply(emitter, arr)
        }
        else {
          arr[0] = 'WARNNING'.yellow
          console.warn.apply(console, arr)
        }
      },
      error(...args) {
        emitter.emit.apply(emitter, ['error', `[${name}]`.bgRed, ...args])
      }
    }
  }
}
