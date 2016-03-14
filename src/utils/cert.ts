'use strict'

import { spawn, ChildProcess } from 'child_process'
import { fs as fsys } from './promisify'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '../typed'

/** return Error */
const spawnError = (childProcess, errMsg) => {
  const error = new Error('SpawnError:\n' + childProcess.spawnargs.join(' ') + '\n' + errMsg)
  return error
}

/** wrap childProcess to promise */
const promisifyChildProcess = (childProcess: ChildProcess) => {
  return new Promise((resolve, reject) => {
    // childProcess.stderr.pipe(process.stdout)
    let errMsg = ''
    childProcess.stderr.on('data', (data) => {
      errMsg += data
    })

    childProcess.on('close', (err) => {
      err ? reject(spawnError(childProcess, errMsg)) : resolve()
    })
  })
}

export interface KeyCertPair {
  key: Buffer
  cert: Buffer
}

export interface CertManagerOptions {
  rootPath: string
  logger: Logger
  customCA?: KeyCertPair
  opensslPath?: string
}

export default class CertManager {

  rootPath: string
  logger: Logger
  customCA: KeyCertPair
  opensslPath: string

  constructor(options: CertManagerOptions) {
    this.rootPath = options.rootPath
    this.logger = options.logger
    this.customCA = options.customCA
    this.opensslPath = options.opensslPath || 'openssl'
  }

  get CAKeyPath() {
    return this.fullPath('@rootca.key')
  }

  get CACertPath() {
    return this.fullPath('@rootca.crt')
  }

  private fullPath(name) {
    return path.resolve(this.rootPath, name)
  }

  private keyPath(name) {
    return this.fullPath(name + '.key')
  }

  private certPath(name) {
    return this.fullPath(name + '.crt')
  }

  private setCustomCA(ca: KeyCertPair) {
    fs.writeFileSync(this.CAKeyPath, ca.key)
    fs.writeFileSync(this.CACertPath, ca.cert)
  }

  // 生成 CA 根证书
  private genCAKey() {
    return spawn('openssl', [
      'genrsa',
      '-out', this.CAKeyPath,
      '2048'
    ])
  }

  // 给 ROOT CA key 自签名得到证书
  private genCACert() {
    return spawn('openssl', [
      'req',
      '-new', '-x509', '-sha256',
      '-days', '9999',
      '-key', this.CAKeyPath,
      '-out', this.CACertPath,
      '-subj', '/C=CN/ST=Zhejiang/L=Hangzhou/O=Meowtec/OU=Meowtec/CN=MeowtecCA/emailAddress=bertonzh@gmail.com'
    ])
  }

  private genKey(domain: string) {
    return spawn('openssl', [
      'genrsa',
      '-out', this.keyPath(domain),
      '2048'
    ])
  }

  private genReq(domain: string) {
    return spawn('openssl', [
      'req',
      '-new',
      '-key', this.keyPath(domain),
      '-out', this.fullPath(domain + '.csr'),
      '-subj', `/C=CN/ST=Zhejiang/L=Hangzhou/O=Meowtec/OU=Meowtec/CN=${domain}/emailAddress=bertonzh@gmail.com`
    ])
  }

  private genCert(domain: string) {
    return spawn('openssl', [
      'x509',
      '-req',
      '-days', '9999',
      '-sha256',
      '-in', this.fullPath(domain + '.csr'),
      '-CA', this.CACertPath,
      '-CAkey', this.CAKeyPath,
      '-CAcreateserial',
      '-out', this.certPath(domain)
    ])
  }

  async readCerts (domain: string) {
    const key = await fsys.readFile(this.keyPath(domain))
    const cert = await fsys.readFile(this.certPath(domain))
    return {
      key,
      cert
    }
  }

  CAExist() {
    return fsys.exists(this.CAKeyPath)
  }

  async getCerts(domain: string) {
    let certs: KeyCertPair
    /**
     * TODO: use exists()
     */
    try {
      certs = await this.readCerts(domain)
    }
    catch (e) {
      await promisifyChildProcess(this.genKey(domain))
      await promisifyChildProcess(this.genReq(domain))
      await promisifyChildProcess(this.genCert(domain))
      await fsys.unlink(this.fullPath(domain + '.csr'))
      certs = await this.readCerts(domain)
      this.logger.info('CertPair Create: ' + domain)
    }

    return certs
  }

  public async init() {
    if (this.customCA) {
      this.setCustomCA(this.customCA)
      this.logger.info('Use custom Root CA. copy to: ' + this.CACertPath)
      return
    }

    const isCAExist = await this.CAExist()
    if (!isCAExist) {
      await promisifyChildProcess(this.genCAKey())
      await promisifyChildProcess(this.genCACert())
      this.logger.info('Root CA has been created! at: ' + this.CACertPath)
    }

    return this
  }

}
