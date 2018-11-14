/******************************* Event Manager *****************************/

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

/**************************** Remixd ****************************/

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

/************************************ Helpers *****************************************/

function create(headline) {
  var new_div = document.createElement('div')
  new_div.id = 'output' 
  new_div.appendChild(document.createTextNode(headline))
  return new_div
}

function replace(new_div) {
  var old_div = document.getElementById('output')
  var parent_div = old_div.parentNode
  parent_div.replaceChild(new_div, old_div)
}

function append(new_div, arr) {
  for (var i = 0; i < arr.length; i++) {
    new_div.appendChild(document.createTextNode(arr[i]))
    new_div.appendChild(document.createElement('br'))
  }
}


/************************************ Plugin ******************************************/

var create_new_output = create
var replace_output = replace
var append_output = append

var extension = new window.RemixExtension()

window.onload = function () {

  var remixd = new Remixd(65522)
  remixd.start()

  document.querySelector('input#truffleinit').addEventListener('click', function () {
    remixd.call('truffle', 'init', {}, (error, output) => {
      if (error) {
        console.log(error)
        var new_div = create_new_output('Truffle Init Failed')
        replace_output(new_div)
      } else if (output) {
        var arr = output.split('\n')
        var new_div = create_new_output('Truffle Init Output:')
        new_div.appendChild(document.createElement('br'))
        append_output(new_div, arr)
        replace_output(new_div)
      }
    })
  })

  document.querySelector('input#truffletest').addEventListener('click', function () {
    remixd.call('truffle', 'test', {}, (error, output) => {
      if (error) {
        var new_div = create_new_output('Truffle Test Failed')
        replace_output(new_div)
      } else if (output) {
        output = output.replace(/\[0m/g, '').replace(/\[32m/g, '').replace(/\[90m/g, '').replace(/\[92m/g, '')
        var arr = output.split('\n')
        var new_div = create_new_output('Truffle Test Output:')
        new_div.appendChild(document.createElement('br'))
        append_output(new_div, arr)
        replace_output(new_div)
      }
    })
  })

  document.querySelector('input#uploadtruffleenvironment').addEventListener('click', function () {
    remixd.call('truffle', 'getEnv', {}, (error, output) => {
      if (error) {
        var error_output = create_new_output('Environment Upload Unsuccessful')
        replace_output(error_output)
      } else if (output) {
        var truffle_network = JSON.parse(output)
        var network 
        for (net in obj.networks) {
          network = net
          break 
        }
        var current_network
        extension.call('app', 'getExecutionContextProvider', [], (provider) => {
          current_network = provider
          extension.call('app', 'removeProvider', [ current_network ], (error) => {
            if (error) {
              var error_output = create_new_output('Environment Upload Unsuccessful')
              replace_output(error_output)
            } else {
              extension.call('app', 'addProvider', [ Object.keys(truffle_network)[0], truffle_network.host ], (error) => {
                if (error) { 
                  var error_output = create_new_output('Environment Upload Unsuccessful')
                  replace_output(error_output)
                } else {
                  var empty_output = document.createElement('div')
                  empty_output.id = 'output'
                  replace_output(empty_output)
                }
              })
            }
          })
        })
      }
    })
  })
}
