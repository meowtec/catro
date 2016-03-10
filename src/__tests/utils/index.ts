'use strict'

import { Readable } from 'stream'
import { EventEmitter } from 'events'
import * as path from 'path'
import Logger from '../../utils/logger'
import { LoggerFactory } from '../../typed'

export function radeStreamAll(stream: Readable, callback: (buffer: Buffer) => any) {
  const bucket: Buffer[] = []

  stream.on('data', (data: Buffer) => {
    bucket.push(data)
  })

  stream.on('end', () => {
    callback(Buffer.concat(bucket))
  })
}

export function resource(relative: string) {
  return path.resolve(__dirname, '../resources/', relative)
}

const logEmitter = new EventEmitter()
export const createLogger: LoggerFactory = Logger(logEmitter)
logEmitter.on('log:info', console.log)
logEmitter.on('log:warn', console.warn)
logEmitter.on('error', console.error)
