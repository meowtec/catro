'use strict'

import { Readable } from 'stream'
import * as path from 'path'

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