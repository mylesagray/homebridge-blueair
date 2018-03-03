var request = require("request");
var inherits = require('util').inherits;
var Service, Characteristic;
const moment = require('moment');
var CustomCharacteristic = {};

module.exports = function(homebridge) {
	var FakeGatoHistoryService = require('fakegato-history')(homebridge);
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	
	homebridge.registerAccessory("homebridge-blueair", "BlueAir", BlueAir);

	function BlueAir(log, config) {
		this.log = log;
		this.username = config.username;
		this.apikey = config.apikey;
		this.password = config.password;
		this.appliance = {};
		this.historicalmeasurements = [];
		this.name = config.name || 'Air Purifier';
		this.displayName = config.name;
		this.nameAirQuality = config.nameAirQuality || 'Air Quality';
		this.nameTemperature = config.nameTemperature || 'Temperature';
		this.nameHumidity = config.nameHumidity || 'Humidity';
		this.nameCO2 = config.nameCO2 || 'CO2';
		this.showAirQuality = config.showAirQuality || false;
		this.showTemperature = config.showTemperature || false;
		this.showHumidity = config.showHumidity || false;
		this.showCO2 = config.showCO2 || false;
		this.getHistoricalStats = config.getHistoricalStats || false;

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

		//Register the Lightbulb service (LED / Display)
		this.lightBulbService = new Service.Lightbulb(this.name + " LED");

		this.lightBulbService
		.getCharacteristic(Characteristic.On)
		.on('get', this.getLED.bind(this))
		.on('set', this.setLED.bind(this));

		this.services.push(this.lightBulbService);

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
			.getCharacteristic(Characteristic.VOCDensity)
			.on('get', this.getVOCDensity.bind(this));

			this.airQualitySensorService
			.getCharacteristic(Characteristic.CarbonDioxideLevel)
			.on('get', this.getCO2.bind(this));

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
			.getCharacteristic(Characteristic.CarbonDioxidePeakLevel)
			.on('get', this.getCO2Peak.bind(this));

			this.CO2SensorService
			.getCharacteristic(Characteristic.CarbonDioxideDetected)
			.on('get', this.getCO2Detected.bind(this));

			this.services.push(this.CO2SensorService);
		}

		if(this.getHistoricalStats){
			//Start fakegato-history custom charactaristic (Air Quality PPM charactaristic)
			CustomCharacteristic.AirQualCO2 = function() {
				Characteristic.call(this, 'Air Quality PM25', 'E863F10B-079E-48FF-8F27-9C2605A29F52');
				this.setProps({
					format: Characteristic.Formats.UINT16,
					unit: "ppm",
					maxValue: 99999,
					minValue: 0,
					minStep: 1,
					perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
				});
				this.value = this.getDefaultValue();
			};
			inherits(CustomCharacteristic.AirQualCO2, Characteristic);

			this.airQualitySensorService
			.getCharacteristic(CustomCharacteristic.AirQualCO2)
			.on('get', this.getCO2.bind(this));
			//end fakegato-history charactaristic

			//Fakegato-history masquerading as Eve Room.
			//Stores history on local filesystem of homebridge appliance
			this.loggingService = new FakeGatoHistoryService("room", this, {
				storage:'fs'
			});
			this.services.push(this.loggingService);
		}
	}


	BlueAir.prototype = {

		httpRequest: function(options, callback) {
			request(options,
				function (error, response, body) {
					this.log("Polled API:", options.url);
					callback(error, response, body);
				}.bind(this));
		},

		getHomehost: function(callback) {
			if(this.gothomehost != 1){
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
						this.log("Got home region:", json);
						this.gothomehost = 1;
						this.homehost = json;
						callback(null);
					}
				}.bind(this));
			}else{
				this.log("Already have region");
				callback(null);
			}
		},

		login: function(callback) {
			if(this.loggedin != 1){
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
							this.loggedin = 1;
							this.log("Logged in to API");
							this.authtoken = response.headers['x-auth-token'];
							callback(null);
						}
					}.bind(this));
				}.bind(this));
			} else {
				this.log("Already logged in");
				callback(null);
			}
		},

		getBlueAirID: function(callback) {
			if(this.havedeviceID != 1){
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
							this.havedeviceID = 1;
							this.log("Got device ID"); 
							//this.log("Found", numberofdevices, "appliance(s)");
						}
					}.bind(this));
				}.bind(this));
			} else {
				this.log("Already have device ID");
				callback(null);
			}
		},

		getBlueAirSettings: function(callback) {
			//Get time now and check if we pulled from API in the last 5 minutes
			//if so, don't refresh as this is the max resolution of API
			var time = new Date();
			time.setSeconds(time.getSeconds() - 5);

			if(typeof this.lastSettingRefresh !== 'undefined' || this.havedevicesettings != 1) {
				if(time > this.lastSettingRefresh || this.havedevicesettings != 1) {
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
						var json = JSON.parse(body);
						this.appliance = json.reduce(function(obj, prop) {
							obj[prop.name] = prop.currentValue;
							return obj;
						}, {});
						this.log("Got device settings")
						this.havedevicesettings = 1;
						this.lastSettingRefresh = new Date();
						callback(null);
					}
				}.bind(this));
			}.bind(this));
				} else {
					this.log("Already polled settings last 5 seconds, waiting.");
					callback(null);
				}
			}
		},

		getBlueAirInfo: function(callback) {
			//Get time now and check if we pulled from API in the last 5 minutes
			//if so, don't refresh as this is the max resolution of API
			var time = new Date();
			time.setMinutes(time.getMinutes() - 5);

			if(typeof this.lastInfoRefresh !== 'undefined' || this.havedeviceInfo != 1) {
				if(time > this.lastInfoRefresh || this.havedeviceInfo != 1) {
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
									this.havedeviceInfo = 1;
									this.lastInfoRefresh = new Date();
									callback(null);
								}
							}.bind(this));
						}.bind(this));
				} else {
					this.log("Device info polled in last 5 minutes, waiting.");
					callback(null);
				}
			}
		},

		getLatestValues: function(callback) {
			//Get time now and check if we pulled from API in the last 5 minutes
			//if so, don't refresh as this is the max resolution of API
			var time = new Date();
			time.setMinutes(time.getMinutes() - 5);

			if(typeof this.lastSensorRefresh !== 'undefined' || typeof this.measurements == 'undefined') {
				if(time > this.lastSensorRefresh || typeof this.measurements == 'undefined') {
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
								this.measurements = {};
								var json = JSON.parse(body);
								this.lastSensorRefresh = new Date();

								for (i = 0; i < json.sensors.length; i++) {
									switch(json.sensors[i]) {
										case "pm":
										this.measurements.pm = json.datapoints[0][i];
										//this.log("Particulate matter 2.5:", this.measurements.pm + " " + json.units[i]);
										break;

										case "tmp":
										this.measurements.tmp = json.datapoints[0][i];
										//this.log("Temperature:", this.measurements.tmp + " " + json.units[i]);
										break;

										case "hum":
										this.measurements.hum = json.datapoints[0][i];
										//this.log("Humidity:", this.measurements.hum + " " + json.units[i]);
										break;

										case "co2":
										this.measurements.co2 = json.datapoints[0][i];
										//this.log("CO2:", this.measurements.co2 + " " + json.units[i]);
										var levels = [
										[99999, 2101, Characteristic.AirQuality.POOR],
										[2100, 1601, Characteristic.AirQuality.INFERIOR],
										[1600, 1101, Characteristic.AirQuality.FAIR],
										[1100, 701, Characteristic.AirQuality.GOOD],
										[700, 0, Characteristic.AirQuality.EXCELLENT],
										];
										for(var item of levels){
											if(json.datapoints[0][i] >= item[1] && json.datapoints[0][i] <= item[0]){
												this.measurements.airquality = item[2];
												this.measurements.airqualityppm = json.datapoints[0][i];
											}
										}
										break;

										case "voc":
										this.measurements.voc = json.datapoints[0][i];
										//this.log("Volatile organic compounds:", this.measurements.voc + " " + json.units[i]);
										break;

										case "allpollu":
										this.measurements.allpollu = item[1];
										//this.log("All Pollution:", this.measurements.allpollu, json.units[i]);
										break;

										default:
										break;
									}
								}
								//Fakegato-history add data point
								//temperature, humidity and air quality
								//Air Quality measured here as CO2 ppm, not VOC as more BlueAir's CO2 much more closely follows Eve Room's "VOC" measurement)
								this.loggingService.addEntry({
									time: moment().unix(),
									temp: this.measurements.tmp,
									humidity: this.measurements.hum,
									ppm: this.measurements.airqualityppm
								});
								this.log("Sensor data refreshed");
								callback(null);
							}
						}.bind(this));
					}.bind(this));
				}
				else
				{
					this.log("Sensor data polled in last 5 minutes, waiting.");
					callback(null);
				}
			}
		},

		getHistoricalValues: function(callback) {
			//Get time now and check if we pulled from API in the last 5 minutes
			//if so, don't refresh as this is the max resolution of API
			var time = new Date();
			time.setMinutes(time.getMinutes() - 30);

			if(typeof this.lastHistoricalRefresh !== 'undefined' || typeof this.historicalmeasurements[0] == 'undefined') {
				if(time > this.lastHistoricalRefresh || typeof this.historicalmeasurements[0] == 'undefined') {
					//Build the request and use returned value
					this.getBlueAirID(function(){
						var timenow = new Date();
						var timelastmonth = new Date();
						timelastmonth.setMonth(timelastmonth.getMonth() - 1);
						var tsnow = timenow.toISOString();
						var tslastmonth = timelastmonth.toISOString();
						var options = {
							url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/datapoint/' + tslastmonth + '/' + tsnow + '/0/',
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
								this.log("Downloaded " + json.datapoints.length + " datapoints for " + json.sensors.length + " senors");
								for (i = 0; i < json.sensors.length; i++) {
									this.historicalmeasurements.push([]);
									switch(json.sensors[i]) {
										case "time":
										for (j = 0; j < json.datapoints.length; j++){
											this.historicalmeasurements[i][j] = json.datapoints[j][i];
										}
										break;

										case "pm":
										for (j = 0; j < json.datapoints.length; j++){
											this.historicalmeasurements[i][j] = json.datapoints[j][i];
										}
										break;

										case "tmp":
										for (j = 0; j < json.datapoints.length; j++){
											this.historicalmeasurements[i][j] = json.datapoints[j][i];
										}
										break;

										case "hum":
										for (j = 0; j < json.datapoints.length; j++){
											this.historicalmeasurements[i][j] = json.datapoints[j][i];
										}
										break;

										case "co2":
										for (j = 0; j < json.datapoints.length; j++){
											this.historicalmeasurements[i][j] = json.datapoints[j][i];
										}
										break;

										case "voc":
										for (j = 0; j < json.datapoints.length; j++){
											this.historicalmeasurements[i][j] = json.datapoints[j][i];
										}
										break;

										case "allpollu":
										for (j = 0; j < json.datapoints.length; j++){
											this.historicalmeasurements[i][j] = json.datapoints[j][i];
										}
										break;

										default:
										break;
									}
								}
								this.lastHistoricalRefresh = new Date();
								callback(null);
							}
						}.bind(this));
					}.bind(this));
				} else {
					this.log("Pulled historical data in last 30 mins, waiting");
					callback();
				}
			}
		},

		getAirQuality: function(callback) {
			this.getLatestValues(function(){
				callback(null, this.measurements.airquality);
			}.bind(this));
		},

		getPM25Density: function(callback) {
			this.getLatestValues(function(){
				callback(null, this.measurements.pm);
			}.bind(this));
		},

		getVOCDensity: function(callback) {
			this.getLatestValues(function(){
				callback(null, this.measurements.voc);
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

		getCO2Peak: function(callback) {
			this.getHistoricalValues(function(){
				var peakCO2 = Math.max(...this.historicalmeasurements[4]);
				callback(null, peakCO2);
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
					callback(null, 33);
				} else if (this.appliance.fan_speed == 2) {
					callback(null, 66);
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

		getLED: function(callback) {
			this.getBlueAirSettings(function(){
				if (this.appliance.brightness > 0) {
					callback(null, true);
				} else {
					callback(null, false);
				} 
			}.bind(this));
		},

		setLED: function(callback) {
			//set LED
			return;
		},

		getServices: function() {
			return this.services;
		}
	}
};