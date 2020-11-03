'use strict';

/*
 * Created with @iobroker/create-adapter v1.29.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const http = require('http');
const { resetHistory } = require('sinon');

// Load your modules here, e.g.:
// const fs = require("fs");

class Ledcontrol extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'ledcontrol',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info('ipadress: ' + this.config.ipadress);
		this.log.info('username: ' + this.config.username);
		this.log.info('port: ' + this.config.port);

		this.controller = new Controller(this.config.ipadress, this.config.username, this.config.password, this.config.port);
		this.controller.checkSerialConnection((serial) => {
			this.setState('info.connection', serial, true);
		});

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/

		this.controller.getStatus((status) => {
			for(var i in status) {
				// @ts-ignore
				this.setObjectNotExists('status.' + i, {
					type: 'state',
					common: {
						name: i,
						type: typeof status[i],
						role: 'indicator',
						read: true,
						write: false,
					},
					native: {},
				});

				this.setState('status.' + i, status[i], true);
			}
		});

		
		this.setObjectNotExists('balken.state', {
			type: 'state',
			common: {
				name: 'state',
				type: 'boolean',
				role:'switch',
				read: true,
				write: true,
			},
			native: {},
		});
		this.setState('balken.state', {val: false}, true);

		this.setObjectNotExists('balken.rgb_color', {
			type: 'state',
			common: {
				name: 'rgb_color',
				type: 'array',
				role:'light',
				read: true,
				write: true,
			},
			native: {},
		});
		var colors = [0, 0, 0]
		this.setState('balken.rgb_color', {val: colors}, true);

		this.setObjectNotExists('balken.brightness_pct', {
			type: 'state',
			common: {
				name: 'brightness_pct',
				type: 'number',
				role:'light',
				read: true,
				write: true,
			},
			native: {},
		});
		this.setState('balken.brightness_pct', {val: 100}, true);

		this.setObjectNotExists('balken.effect', {
			type: 'state',
			common: {
				name: 'effect',
				type: 'string',
				role:'light',
				read: true,
				write: true,
			},
			native: {},
		});
		this.setState('balken.effect', {val: 'none'}, true);

		this.subscribeObjects('balken.state');


		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates('lights.*');
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates('*');

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		await this.setStateAsync('testVariable', true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync('testVariable', { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync('admin', 'iobroker');
		this.log.info('check user admin pw iobroker: ' + result);

		result = await this.checkGroupAsync('admin', 'admin');
		this.log.info('check group user admin group admin: ' + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

}

class Controller {
	constructor(ip, user, pass, port) {
		this.ip = ip;
		this.user = user;
		this.pass = pass;
		this.port = port;
		this.api = 'http://' + this.ip + ':' + this.port + '/api/';
	}

	httpRequest(method='GET', path, sendData='', callback) {
		var options = {
			host: this.ip,
			path: path,
			method: method,
			port: this.port,
			auth: this.user + ':' + this.pass,
			headers: {
				'Content-Type': 'application/json'
			}
		};

		var req = http.request(options, (res) => {
			var data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});
			res.on('end', () => {
				callback(data);
			});
		});

		req.on('error', (e) => {
			console.log('ERROR: ' + e.message);
		});

		req.write(sendData);
		req.end();
	}

	getStatus(callback) {
		this.httpRequest('GET', '/api/status', '', (obj) => {
			callback(JSON.parse(obj));
		});
	}

	checkSerialConnection(callback) {
		this.httpRequest('GET', '/api/status', '', (obj) => {
			callback(JSON.parse(obj).serial);
		});
	}

	setColor(color=[255, 255, 255], callback) {
        var c = {'red':color[0], 'green':color[1], 'blue':color[2]};
        this.httpRequest('POST', '/api/full_color', JSON.stringify(c), (res) => {
            callback(res);
        });
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Ledcontrol(options);
} else {
	// otherwise start the instance directly
	new Ledcontrol();
}