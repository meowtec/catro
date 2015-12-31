'use strict'

import  * as fileSystem from 'fs'
import { EventEmitter } from 'events'
/**
nodejs 目前还不支持 rest 参数，TypeScript 也不支持可选编译
// TODO use:
export default function promisify(callback: Function, context?) {
  return (...args) => {
    return new Promise((resolve, reject) => {
      args.push((err, ...args) => {
        if (err) {
          reject(err)
        }
        else {
          resolve.apply(args)
        }
      })
      callback.apply(context, args)
    })
  }
}
*/
;

export default function promisify(callback: Function, context?) {
  return function(arg1?, arg2?) {
    const args = [].slice.call(arguments)

    return new Promise((resolve, reject) => {

      args.push(function(err) {
        const rest = [].slice.call(arguments, 1)
        if (err) {
          reject(err)
        }
        else {
          resolve.apply(rest)
        }
      })

      callback.apply(context, args)
    })
  }
}


export const emitterPromisify = function(emitter: EventEmitter, eventName: string, exception?: boolean) {
  // TODO: use `exception: boolean = true`
  if (exception == null) {
    exception = true
  }

  return new Promise(function(resolve, reject) {
    emitter.on(eventName, resolve)
    exception && emitter.on('error', reject)
  })
}

export interface ReadFilePromise {
  (path: string): Promise<Buffer>
  (path: string, encoding: string): Promise<string>
}

export interface BooleanPromise {
  (path: string): Promise<boolean>
}

export const fs = {
  readFile: <ReadFilePromise>promisify(fileSystem.readFile, fileSystem),
  unlink: promisify(fileSystem.unlink, fileSystem),
  exists: <BooleanPromise>promisify(fileSystem.exists, fileSystem)
}
