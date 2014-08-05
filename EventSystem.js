/*
	eventSystem

	@version 0.2
	
	@property event, is type of:
	   {name: [ callback, ... ]}

	@property buffer, is type of:
	   {name: [ data, ... ]}
	
	@description
	the buffer's logic is that,
	when triggering the event which hasn't any listeners,
	then buffer the trigger datas.
	the buffered trigger datas will presevre
	after calling the flushBuffer() method.
*/
var EventSystem = {
	init: function() {
		// this.count = 0;
		this.events = {};
		this.buffer = {};
		
		this.additionEventMap = {
			"prev": "prev",
			"post": "post"
		};
		this.spliter = "://";
		this.bufferFlag = true;
	},
	register: function(name, callback) {
		var params = name.split(this.spliter),
			action = params[0],
			id;
		
		// register either normal event or addition event
		if (this.additionEventMap.hasOwnProperty(action) || params.length === 1) {
			this._regEvent(this.events, name, callback);
			id = this._id(name, this.events[name].length - 1);
		
			// trigger the buffer
			this._triggerBuffer(name, callback);
		}
		return id;
	},
	trigger: function(name, data) {
		// avoid triggering addition event actions
		if (name.indexOf(this.spliter) > -1) throw Error("trigger error: addition can't be triggered.");
		
		// buffer all datas
		this._buffer(name, data);
		
		// executing the callbacks
		this._exec(this.events[this.additionEventMap.prev + this.spliter + name], data);
		this._exec(this.events[name], data);
		this._exec(this.events[this.additionEventMap.post + this.spliter + name], data);
	},
	remove: function(id) {
		var eventName = id[0],
			pos = id[1];
		
		delete this.events[eventName][pos];
	},
	listEvents: function(spliter) {
		if (typeof spliter !== "string") {
			spliter = ", ";
		}
		var result = [];
		for (var name in this.events) {
			if (!this.events.hasOwnProperty(name)) continue;
			result.push(name);
		}
		return result.join(spliter);
	},
	flushBuffer: function() {
		console.log("flushBuffer")
		// clear and seal the buffer
		this.buffer = {};
		this.bufferFlag = false;
	},

	/* private methods */
	
	_id: function(eventName, pos) {
		return [eventName, pos];
	},
	_exec: function(callbackList, data) {
		if (!callbackList || !callbackList.length) return false;

		var len = callbackList.length;
		for (var i = 0; i < len; i++) {
			// skip the callback that has been deleted
			if (typeof callbackList[i] === "undefined") continue;
			
			// try {
				callbackList[i].call(null, data);
			// } catch (e) {
			// 	console.error("Custom event error:", e)
			// }
		}
	},
	_regEvent: function(dict, name, callback) {
		if (!dict[name]) {
			dict[name] = [];
		}
		dict[name].push(callback);
	},
	_triggerBuffer: function(evtName, callback) {
		if (!this.bufferFlag) return;

		var bufferDatas = this.buffer[evtName];
		var callbacks = [callback];
		
		if (bufferDatas) {
			for (var i = 0; i < bufferDatas.length; i++) {
				this._exec(callbacks, bufferDatas[i]);
			}
		}
	},
	_buffer: function(evtName, data) {
		if (!this.bufferFlag) return;

		if (!this.buffer[evtName]) {
			this.buffer[evtName] = [];
		}
		this.buffer[evtName].push(data);
	},
	_delay: function() {
		// todo
	}
};
