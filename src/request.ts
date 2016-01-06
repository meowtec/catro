'use strict'

import * as url from 'url'
import * as assert from 'assert'
import * as http from 'http'
import * as https from 'https'
import { Readable } from 'stream'
import { EventEmitter } from 'events'

import commonServ from './common-serv'
import * as resources from './res'
import * as _ from './utils/utils'
import * as cert from './cert'
import { Headers, Request, Response } from './typed'
import { emitterPromisify } from './utils/promisify'

const logger = _.log('request')

/**
 * 如果是 production 环境，proxy 请求远程服务器时会忽略证书认证失败的情况
 */
let rejectUnauthorized = process.argv.indexOf('--production') === -1


export default class RequestHandler extends EventEmitter {

  scheme: string
  req: http.IncomingMessage
  res: http.ServerResponse

  replaceRequest: (request: Request, requestHandler?: this) => Promise<Request> | Request
  replaceResponse: (request: Response, requestHandler?: this) => Promise<Response> | Response

  request: Request
  response: Response

  private willBeSent: boolean

  constructor(scheme: string, req: http.IncomingMessage, res: http.ServerResponse) {
    super()

    this.scheme = scheme
    this.req = req
    this.res = res
    this.willBeSent = true

    if (req.url.startsWith('/') && scheme === 'http') {
      return commonServ(req, res)
    }

    this.initialRequest()
    setTimeout(() => this.start().catch(this.handleError.bind(this)))
  }

  private initialRequest() {
    const req = this.req
    const requestUrl = req.url
    const headers = req.headers

    let hostname, port, path

    delete headers['accept-encoding']

    if (this.scheme === 'http') {
      // TODO use: ({hostname, port, path} = url.parse(requestUrl))
      let url_ = url.parse(requestUrl)

      hostname = url_.hostname
      port = url_.port
      path = url_.path
    }
    else {
      // TODO use: [hostname, port] = headers['host'].split(':')
      let host = headers['host'].split(':')
      hostname = host[0]
      port = host[1]
      path = req.url
    }

    this.request = {
      method: this.req.method,
      hostname,
      port,
      path,
      headers: req.headers,
      body: req
    }
  }

  private async start() {

    if (!this.willBeSent) {
      this.emit('abort')
      return
    }

    let requestOptions: Request

    if (this.replaceRequest) {
      requestOptions = await this.replaceRequest(this.request, this)
    }
    else {
      requestOptions = this.request
    }

    const httpResponse = await this.sendRequest(requestOptions)

    this.initialResponse(httpResponse)

    this.emit('response')

    let responseOptions: Response
    if (this.replaceResponse) {
      responseOptions = await this.replaceResponse(this.response, this)
    }
    else {
      responseOptions = this.response
    }

    await this.sendResponse(responseOptions)
  }

  private initialResponse(response: http.IncomingMessage) {
    this.response = {
      status: response.statusCode,
      headers: response.headers,
      body: response
    }
  }

  private sendRequest(request: Request) {
    let res = this.res
    let factory = this.scheme === 'https' ? https : http

    let upRequest = factory.request(Object.assign({
      rejectUnauthorized
    }, request))

    let requestBody = request.body
    if (typeof requestBody === 'string' || Buffer.isBuffer(requestBody)) {
      upRequest.end(requestBody)
    }
    else {
      requestBody.pipe(upRequest)
    }

    upRequest.on('finish', function() {
      // TODO emit http-data
    })

    /**
     * req.on('response')
     */
    return <Promise<http.IncomingMessage>>emitterPromisify(upRequest, 'response')

  }

  private sendResponse(response: Response) {
    const res = this.res
    res.writeHead(response.status, response.headers)

    let responseBody = response.body
    if (typeof responseBody === 'string' || Buffer.isBuffer(responseBody)) {
      res.end(responseBody)
    }
    else {
      responseBody.pipe(res)
    }
  }

  private handleError(error) {
    logger.error(error)
  }

  private returnError(code: number) {
    this.res.writeHead(code, {'Content-Type': 'text/html'})
    this.res.end(resources.get(code + '.html'))
  }

  public preventRequest() {
    this.willBeSent = false
  }

}
