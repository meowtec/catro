'use strict'

import { EventEmitter } from 'events'
import { Logger } from './typed'
import 'colors'

export default function Logger(emitter: EventEmitter): (name: string) => Logger {
  return function create(name) {
    return {
      info(...args) {
        emitter.emit.apply(emitter, ['log:info', `[${name}]`.blue, ...args])
      },
      warn(...args) {
        emitter.emit.apply(emitter, ['log:warn', `[${name}]`.bgYellow, ...args])
      },
      error(...args) {
        emitter.emit.apply(emitter, ['error', `[${name}]`.bgRed, ...args])
      }
    }
  }
}
