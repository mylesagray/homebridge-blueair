var request = require("request");
var inherits = require('util').inherits;
var Service, Characteristic;
var devices = [];

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	
	homebridge.registerAccessory("homebridge-blueair", "BlueAir", BlueAir);


	function BlueAir(log, config) {
		this.log = log;
		this.username = config.username;
		this.apikey = config.apikey;
		this.password = config.password;
		this.appliance = {};
		this.measurements = {};
		this.name = config.name || 'Air Purifier';
		this.nameAirQuality = config.nameAirQuality || 'Air Quality';
		this.nameTemperature = config.nameTemperature || 'Temperature';
		this.nameHumidity = config.nameHumidity || 'Humidity';
		this.nameCO2 = config.nameCO2 || 'CO2';
		this.showAirQuality = config.showAirQuality || false;
		this.showTemperature = config.showTemperature || false;
		this.showHumidity = config.showHumidity || false;
		this.showCO2 = config.showCO2 || false;

		this.base_API_url = "https://api.foobot.io/v2/user/" + this.username + "/homehost/";

		this.services = [];

		if(!this.username)
			throw new Error('Your must provide your BlueAir username.');

		if(!this.password)
			throw new Error('Your must provide your BlueAir password.');

		if(!this.apikey)
			throw new Error('Your must provide your BlueAir API Key.');

		// Register the service
		this.service = new Service.AirPurifier(this.name);

		this.service
		.getCharacteristic(Characteristic.Active)
		.on('get', this.getActive.bind(this))
		.on('set', this.setActive.bind(this));

		this.service
		.getCharacteristic(Characteristic.CurrentAirPurifierState)
		.on('get', this.getCurrentAirPurifierState.bind(this));

		this.service
		.getCharacteristic(Characteristic.TargetAirPurifierState)
		.on('get', this.getTargetAirPurifierState.bind(this))
		.on('set', this.setTargetAirPurifierState.bind(this));

		this.service
		.getCharacteristic(Characteristic.LockPhysicalControls)
		.on('get', this.getLockPhysicalControls.bind(this))
		.on('set', this.setLockPhysicalControls.bind(this));

		this.service
		.getCharacteristic(Characteristic.RotationSpeed)
		.on('get', this.getRotationSpeed.bind(this))
		.on('set', this.setRotationSpeed.bind(this));

		// Service information
		this.serviceInfo = new Service.AccessoryInformation();

		this.serviceInfo
		.setCharacteristic(Characteristic.Manufacturer, 'BlueAir')
		.setCharacteristic(Characteristic.Model, 'Air Purifier')
		.setCharacteristic(Characteristic.SerialNumber, 'Undefined');

		this.services.push(this.service);
		this.services.push(this.serviceInfo);

		// Register the Lightbulb service (LED / Display)
		//this.lightBulbService = new Service.LightBulb(this.name + "LED");

		//this.lightBulbService
		//  .getCharacteristic(Characteristic.On)
		//  .on('get', this.getLED.bind(this))
		//  .on('set', this.setLED.bind(this));

		//this.services.push(this.lightBulbService);

		//Register the Filer Maitenance service
		this.filterMaintenanceService = new Service.FilterMaintenance(this.name + " Filter");

		this.filterMaintenanceService
		.getCharacteristic(Characteristic.FilterChangeIndication)
		.on('get', this.getFilterChange.bind(this));

		this.filterMaintenanceService
		.addCharacteristic(Characteristic.FilterLifeLevel)
		.on('get', this.getFilterLife.bind(this));

		this.services.push(this.filterMaintenanceService);

		if(this.showAirQuality){
			this.airQualitySensorService = new Service.AirQualitySensor(this.nameAirQuality);

			this.airQualitySensorService
			.getCharacteristic(Characteristic.PM2_5Density)
			.on('get', this.getPM25Density.bind(this));

			this.airQualitySensorService
			.getCharacteristic(Characteristic.AirQuality)
			.on('get', this.getAirQuality.bind(this));

			this.airQualitySensorService
			.setCharacteristic(Characteristic.AirParticulateSize, '2.5um');

			this.services.push(this.airQualitySensorService);
		}

		if(this.showTemperature){
			this.temperatureSensorService = new Service.TemperatureSensor(this.nameTemperature);

			this.temperatureSensorService
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getTemperature.bind(this));

			this.services.push(this.temperatureSensorService);
		}

		if(this.showHumidity){
			this.humiditySensorService = new Service.HumiditySensor(this.nameHumidity);

			this.humiditySensorService
			.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.on('get', this.getHumidity.bind(this));

			this.services.push(this.humiditySensorService);
		}

		if(this.showCO2){
			this.CO2SensorService = new Service.CarbonDioxideSensor(this.nameCO2);

			this.CO2SensorService
			.getCharacteristic(Characteristic.CarbonDioxideLevel)
			.on('get', this.getCO2.bind(this));

			this.CO2SensorService
			.getCharacteristic(Characteristic.CarbonDioxideDetected)
			.on('get', this.getCO2Detected.bind(this));

			this.services.push(this.CO2SensorService);
		}
	}


	BlueAir.prototype = {

		httpRequest: function(options, callback) {
			request(options,
				function (error, response, body) {
					callback(error, response, body);
				});
		},

		getHomehost: function(callback) {
		//Build the request
		var options = {
			url: this.base_API_url,
			method: 'get',
			headers: {
				'X-API-KEY-TOKEN': this.apikey
			}
		};

		//Send request
		this.httpRequest(options, function(error, response, body) {
			if (error) {
				this.log('HTTP function failed: %s', error);
				callback(error);
			}
			else {
				var json = JSON.parse(body);
				this.homehost = json;
				callback(null);
			}
		}.bind(this));
	},

	login: function(callback) {
		//Build the request and use returned value
		this.getHomehost(function(){
			var options = {
				url: 'https://' + this.homehost + '/v2/user/' + this.username + '/login/',
				method: 'get',
				headers: {
					'X-API-KEY-TOKEN': this.apikey,
					'Authorization': 'Basic ' + Buffer.from(this.username + ':' + this.password).toString('base64')
				}
			};
			//Send request
			this.httpRequest(options, function(error, response, body) {
				if (error) {
					this.log('HTTP function failed: %s', error);
					callback(error);
				}
				else {
					this.authtoken = response.headers['x-auth-token'];
					callback(null);
				}
			}.bind(this));
		}.bind(this));
	},

	getBlueAirID: function(callback) {
		//Build request and get UUID
		this.login(function(){
			var options = {
				url: 'https://' + this.homehost + '/v2/owner/' + this.username + '/device/',
				method: 'get',
				headers: {
					'X-API-KEY-TOKEN': this.apikey,
					'X-AUTH-TOKEN': this.authtoken
				}
			};
			//Send request
			this.httpRequest(options, function(error, response, body) {
				if (error) {
					this.log('HTTP function failed: %s', error);
					callback(error);
				}
				else {
					var json = JSON.parse(body);
					var numberofdevices = '';
					for (i = 0; i < json.length; i++){
						this.deviceuuid = json[i].uuid;
						this.devicename = json[i].name;
						numberofdevices += 1;
						callback(null);
					}
					this.log("Found", numberofdevices, "appliance(s)");
				}
			}.bind(this));
		}.bind(this));
	},

	getBlueAirSettings: function(callback) {
		//Build request and get current settings
		this.getBlueAirID(function(){
			var options = {
				url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attributes/',
				method: 'get',
				headers: {
					'X-API-KEY-TOKEN': this.apikey,
					'X-AUTH-TOKEN': this.authtoken
				}
			};
			//Send request
			this.httpRequest(options, function(error, response, body) {
				if (error) {
					this.log('HTTP function failed: %s', error);
					callback(error);
				}
				else {
					this.log("Air Purifer:", this.devicename);
					var json = JSON.parse(body);
					for (i = 0; i < json.length; i++) {
						var obj = json[i];
						switch(obj.name) {
							case "brightness":
							this.appliance.brightness = obj.currentValue;
							this.log("Brightness:", this.appliance.brightness);
							break;
							case "fan_speed":
							this.appliance.fan_speed = obj.currentValue;
							this.log("Fan speed:", this.appliance.fan_speed);
							break;
							case "child_lock":
							this.appliance.child_lock = obj.currentValue;
							this.log("Child lock:", this.appliance.child_lock);
							break;
							case "auto_mode_dependency":
							this.appliance.auto_mode_dependency = obj.currentValue;
							this.log("Auto mode dependency:", this.appliance.auto_mode_dependency);
							break;
							case "filter_status":
							this.appliance.filter_status = obj.currentValue;
							this.log("Filter status:", this.appliance.filter_status);
							break;
							case "mode":
							this.appliance.mode = obj.currentValue;
							this.log("Mode:", this.appliance.mode);
							break;
							case "model":
							this.appliance.model = obj.currentValue;
							this.log("BlueAir Model:", this.appliance.model);
							break;
							default:
							break;
						}
					}
					callback(null);
				}
			}.bind(this));
		}.bind(this));
	},

	getBlueAirInfo: function(callback) {
		//Build request and get current settings
		this.getBlueAirID(function(){
			var options = {
				url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/info/',
				method: 'get',
				headers: {
					'X-API-KEY-TOKEN': this.apikey,
					'X-AUTH-TOKEN': this.authtoken
				}
			};
			//Send request
			this.httpRequest(options, function(error, response, body) {
				if (error) {
					this.log('HTTP function failed: %s', error);
					callback(error);
				}
				else {
					var json = JSON.parse(body);
					var filterusageindays = Math.round(((json.initUsagePeriod/60)/60)/24);
					var filterlifeleft = (180 - filterusageindays);
					this.appliance.filterlevel = 100 - Math.round(180 / filterlifeleft);
					callback(null);
				}
			}.bind(this));
		}.bind(this));
	},

	getLatestValues: function(callback) {
		//Build the request and use returned value
		this.getBlueAirID(function(){
			var options = {
				url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/datapoint/0/last/0/',
				method: 'get',
				headers: {
					'X-API-KEY-TOKEN': this.apikey,
					'X-AUTH-TOKEN': this.authtoken
				}
			};
			//Send request
			this.httpRequest(options, function(error, response, body) {
				if (error) {
					this.log('HTTP function failed: %s', error);
					callback(error);
				}
				else {
					var json = JSON.parse(body);
					for (i = 0; i < json.sensors.length; i++) {
						switch(json.sensors[i]) {
							case "pm":
							this.measurements.pm25 = json.datapoints[0][i];
							this.log("Particulate matter 2.5:", this.measurements.pm25 + " " + json.units[i]);
							break;
							case "tmp":
							this.measurements.tmp = json.datapoints[0][i];
							this.log("Temperature:", this.measurements.tmp + " " + json.units[i]);
							break;
							case "hum":
							this.measurements.hum = json.datapoints[0][i];
							this.log("Humidity:", this.measurements.hum + " " + json.units[i]);
							break;
							case "co2":
							this.measurements.co2 = json.datapoints[0][i];
							this.log("CO2:", this.measurements.co2 + " " + json.units[i]);
							break;
							case "voc":
							this.measurements.voc = json.datapoints[0][i];
							this.log("Volatile organic compounds:", this.measurements.voc + " " + json.units[i]);
							break;
							case "allpollu":
							var levels = [
							[70, Characteristic.AirQuality.POOR],
							[50, Characteristic.AirQuality.INFERIOR],
							[35, Characteristic.AirQuality.FAIR],
							[20, Characteristic.AirQuality.GOOD],
							[0, Characteristic.AirQuality.EXCELLENT],
							];
							for(var item of levels){
								if(json.datapoints[0][i] >= item[0]){
									this.measurements.airquality = item[1];
								}
							}
							this.log("Air Quality:", this.measurements.airquality);
							break;
							default:
							break;
						}
					}
					callback(null);
				}
			}.bind(this));
		}.bind(this));
	},


	getAirQuality: function(callback) {
		this.getLatestValues(function(){
			callback(null, this.measurements.airquality);
		}.bind(this));
	},

	getPM25Density: function(callback) {
		this.getLatestValues(function(){
			callback(null, this.measurements.pm25);
		}.bind(this));
	},

	getTemperature: function(callback) {
		this.getLatestValues(function(){
			callback(null, this.measurements.tmp);
		}.bind(this));
	},

	getHumidity: function(callback) {
		this.getLatestValues(function(){
			callback(null, this.measurements.hum);
		}.bind(this));
	},

	getCO2: function(callback) {
		this.getLatestValues(function(){
			callback(null, this.measurements.co2);
		}.bind(this));
	},

	getCO2Detected: function(callback) {
		this.getLatestValues(function(){
			if (this.measurements.co2 <= 2000){
				callback(null, 0);
			} else {
				callback(null, 1);
			}
		}.bind(this));
	},

	getFilterChange: function(callback) {
		this.getBlueAirSettings(function(){
			if (this.appliance.filter_status == "OK"){
				callback(null, Characteristic.FilterChangeIndication.FILTER_OK);
			} else {
				callback(null, Characteristic.FilterChangeIndication.CHANGE_FILTER);
			}
		}.bind(this));
	},

	getLockPhysicalControls: function(callback) {
		this.getBlueAirSettings(function(){
			if (this.appliance.child_lock == 0){
				callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
			} else {
				callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED);
			}
		}.bind(this));
	},

	setLockPhysicalControls: function(callback) {
		//Set lock
		return;
	},

	getCurrentAirPurifierState: function(callback) {
		this.getBlueAirSettings(function(){
			if (this.appliance.fan_speed > 0){
				callback(null, Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
			} else {
				callback(null, Characteristic.CurrentAirPurifierState.INACTIVE);
			}
		}.bind(this));
	},

	getTargetAirPurifierState: function(callback) {
		this.getBlueAirSettings(function(){
			if (this.appliance.mode == 'auto'){
				callback(null, Characteristic.TargetAirPurifierState.AUTO);
			} else if (this.appliance.mode == 'manual') {
				callback(null, Characteristic.TargetAirPurifierState.MANUAL);
			} else {
				callback(err);
			}
		}.bind(this));
	},

	setTargetAirPurifierState: function(callback) {
		//Set state
		return;
	},

	getActive: function(callback) {
		this.getBlueAirSettings(function(){
			if (this.appliance.fan_speed == 0){
				callback(null, Characteristic.Active.INACTIVE);
			} else if (this.appliance.fan_speed >= 1 && this.appliance.fan_speed <= 3) {
				callback(null, Characteristic.Active.ACTIVE);
			} else {
				callback(err);
			}
		}.bind(this));
	},

	setActive: function(callback) {
		//turn off
		return;
	},

	getFilterLife: function(callback) {
		this.getBlueAirInfo(function(){
				callback(null, this.appliance.filterlevel);
		}.bind(this));
	},

	getRotationSpeed: function(callback) {
		this.getBlueAirSettings(function(){
			if (this.appliance.fan_speed == 0){
				callback(null, 0);
			} else if (this.appliance.fan_speed == 1) {
				callback(null, 10);
			} else if (this.appliance.fan_speed == 2) {
				callback(null, 30);
			}	else if (this.appliance.fan_speed == 3) {
				callback(null, 100);
			}	else {
				callback(err);
			}
		}.bind(this));
	},

	setRotationSpeed: function(callback) {
		//set fan
		return;
	},

	getServices: function() {
		return this.services;
	}
}
};