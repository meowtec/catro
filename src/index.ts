'use strict'

import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as path from 'path'
import { EventEmitter } from 'events'
import RequestHandler from './request'
import certManager from './cert'
import { CertManager } from './cert'
import * as _ from './utils/utils'
import HttpsServerPool from './https-server-pool'
import { Headers, Request, Response } from './typed'

const logger = _.log('index')

export interface Options {
  /** proxy port */
  port: number

  /** path to storage certRoot */
  certRoot?: string

  /** whether proxy ssl */
  https?: { (host: string): boolean } | boolean
}


export default class Proxy extends EventEmitter {

  httpServer: http.Server;

  private options: Options;

  private httpsServerPool: HttpsServerPool;

  private initialPromise: Promise<any>;

  constructor(options: Options, callback?: (err, proxy) => any) {
    super()

    this.options = options
    this.initialPromise = this.start()
  }

  /**
   * Any error on start can be catched here.
   */
  private async start() {
    if (!certManager.setted) {
      certManager.setup(path.resolve(__dirname, './cert'))
    }

    await this.initialMainServer()
    await this.initialHttpsServers()
  }

  private initialMainServer() {
    return new Promise((resolve, reject) => {
      const proxy = http.createServer()

      this.httpServer = proxy

      proxy.on('request', this.handleRequest.bind(this, 'http'))
      proxy.on('connect', this.handleConnect.bind(this))
      proxy.on('clientError', (error: Error, socket: net.Socket) => {
        logger.error('Proxy on:clientError: ', error, error.stack)
      })

      proxy.listen(this.options.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err)
        }
        else {
          logger.info('Proxy Start: 127.0.0.1:' + this.options.port)
          resolve(proxy)
        }
      })
    })
  }

  private initialHttpsServers() {
    this.httpsServerPool = new HttpsServerPool()

    this.httpsServerPool.on('new', (server: https.Server, domain) => {
      const port = server.address().port
      logger.info('HTTPS server pool new: ' + domain + ', local PORT: ' + port)

      server.on('request', this.handleRequest.bind(this, 'https'))

      server.on('clientError', (error: Error, socket: net.Socket) => {
        logger.error('HTTPS server on:clientError: ', error, error.stack)
      })
    })
  }

  private handleRequest(scheme: string, req: http.IncomingMessage, res: http.ServerResponse) {
    logger.info('Proxy on:request: ' + req.url)

    let requestHandler: RequestHandler = new RequestHandler(scheme, req, res)

    this.emit('request', requestHandler)
  }

  private handleConnect(req: http.ServerRequest, socket: net.Socket) {
    logger.info('Proxy on:connect: ' + req.url)

    ;(async () => {
      let hostInfo = _.parseHost(req.url)
      let tcpAddr: {
        host: string
        port: number
      }

      if (this.options.https) {
        let server = await this.httpsServerPool.getServer(hostInfo.host)

        tcpAddr = {
          host: '127.0.0.1',
          port: server.address().port
        }
      }
      else {
        tcpAddr = hostInfo
      }

      const hostString = tcpAddr.host + ':' + tcpAddr.port
      logger.info('Client want connect: ' + req.url + ', will connect to: ' + hostString)

      let upSocket = net.connect(tcpAddr)

      upSocket.on('connect', function() {
        socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8')
        upSocket.pipe(socket)
        socket.pipe(upSocket)
      })

      upSocket.on('error', (error: Error) => {
        logger.error('Socket on:error: ' + hostString, error, error.stack)
      })

      upSocket.on('timeout', () => {
        upSocket.destroy()
        logger.warn('Socket on:timeout: ' + hostString)
      })
    })()
    .catch((error) => {
      logger.error('HandleConnect error: ', error)
    })

  }

  static set certRoot(path: string) {
    certManager.setup(path)
  }

  static get certManager() {
    return certManager
  }

  get promise() {
    return this.initialPromise
  }

  // APIs
  onRequest(listener: (handler: RequestHandler) => any) {
    this.on('request', listener)
  }

  // TODO
  // @return Promise<boolean>
  close() {
    // this.httpsServerPool.destroy()
    // this.httpServer.close(callback)
  }

}
