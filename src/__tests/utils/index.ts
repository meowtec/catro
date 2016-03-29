'use strict'

import { EventEmitter } from 'events'
import * as path from 'path'
import Logger from '../../utils/logger'
import { LoggerFactory } from '../../typed'

export function resource(relative: string) {
  return path.resolve(__dirname, '../resources/', relative)
}

const logEmitter = new EventEmitter()
export const createLogger: LoggerFactory = Logger(logEmitter)
logEmitter.on('log:info', console.log)
logEmitter.on('log:warn', console.warn)
logEmitter.on('error', console.error)
