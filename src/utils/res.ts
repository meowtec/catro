'use strict'

import * as fs from 'fs'
import * as path from 'path'

const cache = {}
const resdir = '../../resources/html'

export function get(filename: string): string {
  let content = cache[filename]
  if (!content) {
    content = fs.readFileSync(path.resolve(__dirname, resdir, filename)).toString()

    cache[filename] = content
  }
  return content
}
