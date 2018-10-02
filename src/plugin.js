var extension = new window.RemixExtension()

function eventManager () {
  this.registered = {}
  this.anonymous = {}
}

eventManager.prototype.unregister = function (eventName, obj, func) {
  if (!this.registered[eventName]) {
    return
  }
  if (obj instanceof Function) {
    func = obj
    obj = this.anonymous
  }
  for (var reg in this.registered[eventName]) {
    if (this.registered[eventName][reg].obj === obj && this.registered[eventName][reg].func === func) {
      this.registered[eventName].splice(reg, 1)
    }
  }
}

eventManager.prototype.register = function (eventName, obj, func) {
  if (!this.registered[eventName]) {
    this.registered[eventName] = []
  }
  if (obj instanceof Function) {
    func = obj
    obj = this.anonymous
  }
  this.registered[eventName].push({
    obj: obj,
    func: func
  })
}

eventManager.prototype.trigger = function (eventName, args) {
  if (!this.registered[eventName]) {
    return
  }
  for (var listener in this.registered[eventName]) {
    var l = this.registered[eventName][listener]
    l.func.apply(l.obj === this.anonymous ? {} : l.obj, args)
  }
}

var EventManager = eventManager

class Remixd {
  constructor (port) {
    this.event = new EventManager()
    this.port = port
    this.callbacks = {}
    this.callid = 0
    this.socket = null
    this.connected = false
  }

  online () {
    return this.socket !== null
  }

  close () {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  start (cb) {
    if (this.socket) {
      try {
        this.socket.close()
      } catch (e) {}
    }
    this.event.trigger('connecting', [])
    this.socket = new WebSocket('ws://localhost:' + this.port, 'echo-protocol') // eslint-disable-line

    this.socket.addEventListener('open', (event) => {
      this.connected = true
      this.event.trigger('connected', [event])
      cb()
    })

    this.socket.addEventListener('message', (event) => {
      var data = JSON.parse(event.data)
      if (data.type === 'reply') {
        if (this.callbacks[data.id]) {
          this.callbacks[data.id](data.error, data.result)
          delete this.callbacks[data.id]
        }
        this.event.trigger('replied', [data])
      } else if (data.type === 'notification') {
        this.event.trigger('notified', [data])
      } else if (data.type === 'system') {
        if (data.error) {
          this.event.trigger('system', [{
            error: data.error
          }])
        }
      }
    })
  }

  call (service, fn, args, callback) {
    this.ensureSocket((error) => {
      if (error) return callback(error)
      if (this.socket && this.socket.readyState === this.socket.OPEN) {
        var data = this.format(service, fn, args)
        this.callbacks[data.id] = callback
        this.socket.send(JSON.stringify(data))
      } else {
        callback('Socket not ready. state:' + this.socket.readyState)
      }
    })
  }

  ensureSocket (cb) {
    if (this.socket) return cb(null, this.socket)
    this.start((error) => {
      if (error) {
        cb(error)
      } else {
        cb(null, this.socket)
      }
    })
  }

  format (service, fn, args) {
    var data = {
      id: this.callid,
      service: service,
      fn: fn,
      args: args
    }
    this.callid++
    return data
  }
}

window.onload = function () {

  var remixd = new Remixd(65522)
  remixd.start()

  document.querySelector('input#truffleinit').addEventListener('click', function () {
    remixd.call('truffle', 'init', {}, (error, output) => {
      if (error) {
        var newDiv = document.createElement('div')
        newDiv.id = 'output' 
        newDiv.appendChild(document.createTextNode('Truffle Init Failed'))
        var oldDiv = document.getElementById('output')
        var parentDiv = oldDiv.parentNode
        parentDiv.replaceChild(newDiv, oldDiv)
      } else if (output) {
        var arr = output.split('\n')
        var newDiv = document.createElement('div')
        newDiv.id = 'output' 
        newDiv.appendChild(document.createTextNode('Truffle Init Output:'))
        newDiv.appendChild(document.createElement('br'))
        for (var i = 0; i < arr.length; i++) {
          newDiv.appendChild(document.createTextNode(arr[i]))
          newDiv.appendChild(document.createElement('br'))
        }
        var oldDiv = document.getElementById('output')
        var parentDiv = oldDiv.parentNode
        parentDiv.replaceChild(newDiv, oldDiv)
      }
    })
  })

  document.querySelector('input#truffletest').addEventListener('click', function () {
    remixd.call('truffle', 'test', {}, (error, output) => {
      if (error) {
        var newDiv = document.createElement('div')
        newDiv.id = 'output' 
        newDiv.appendChild(document.createTextNode('Truffle Test Failed'))
        var oldDiv = document.getElementById('output')
        var parentDiv = oldDiv.parentNode
        parentDiv.replaceChild(newDiv, oldDiv)
      } else if (output) {
        output = output.replace(/\[0m/g, '').replace(/\[32m/g, '').replace(/\[90m/g, '').replace(/\[92m/g, '')
        var arr = output.split('\n')
        arr = arr.slice(2, arr.length)
        var newDiv = document.createElement('div')
        newDiv.id = 'output' 
        newDiv.appendChild(document.createTextNode('Truffle Test Output:'))
        newDiv.appendChild(document.createElement('br'))
        for (var i = 0; i < arr.length; i++) {
          newDiv.appendChild(document.createTextNode(arr[i]))
          newDiv.appendChild(document.createElement('br'))
        }
        var oldDiv = document.getElementById('output')
        var parentDiv = oldDiv.parentNode
        parentDiv.replaceChild(newDiv, oldDiv)
      }
    })
  })

}

