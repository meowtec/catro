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
  port: string
  path: string
  headers: Headers
  body: Readable | string | Buffer
}

export interface Response {
  status: number
  headers: Headers
  body: Readable | string | Buffer
}

export interface Logger {
  info(...args)
  error(...args)
  warn(...args)
}

export interface LoggerFactory {
  (name: string): Logger
}

export interface HttpsConnect {
  interrupt: boolean
  hostname: string
  port: number
}
