'use strict'

import * as https from 'https'
import * as _ from './utils/utils'
import CertManager from './cert'
import { emitterPromisify } from './utils/promisify'
import { EventEmitter } from 'events'

export interface PoolOptions {
  certManager: CertManager
}

export default class Pool extends EventEmitter {
  private serverMap: Map<string, https.Server>
  private certManager: CertManager

  constructor(options: PoolOptions) {
    super()

    this.serverMap = new Map()
    this.certManager = options.certManager
  }

  async getServer(domain: string) {
    const cache = this.serverMap.get(domain)

    if (cache) {
      return cache
    }

    const certData = await this.certManager.getCerts(domain)
    const newServer = https.createServer(certData)

    /**
     * LISTEN: 随机分配 port
     * 待 listening 触发进行下一步
     */
    await emitterPromisify(newServer.listen(0), 'listening')
    /**
     * 如果 server 持续 60s 内没有收到请求，则关闭
     */
    const timeout = _.debounce(600000)

    newServer.on('timeoff', () => {
      timeout(() => newServer.close())
    })

    newServer.emit('timeoff')

    /**
     * 加入池
     */
    this.serverMap.set(domain, newServer)

    /**
     * 关闭 Server 时从池中移除
     */
    newServer.on('close', () => {
      this.serverMap.delete(domain)
    })

    this.emit('new', newServer, domain)

    return newServer
  }

}
