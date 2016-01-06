import { Readable } from 'stream'

export interface Headers {
  [key: string]: string
}

/**
 * Request is a superset of <http.requestOptions>
 */
export interface Request {
  method: string
  hostname: string
  port: number
  path: string
  headers: Headers
  body: Readable | string | Buffer
}

export interface Response {
  status: number
  headers: Headers
  body: Readable | string | Buffer
}
