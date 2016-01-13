'use strict'

export function debounce(wait: number, fun0?: Function) {
  let timer

  return (func1?: Function) => {
    clearTimeout(timer)
    const fun = func1 || fun0

    fun && (timer = setTimeout(fun, wait))
  }
}

export function parseHost(host: string) {
  const tuple = host.split(':')
  return {
    host: tuple[0],
    port: parseInt(tuple[1] || '80', 10)
  }
}
