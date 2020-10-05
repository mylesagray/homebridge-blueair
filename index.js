/* jshint node: true */
"use strict";
var request = require("request");
var os = require('os');
var fs = require('fs');
var path = require('path');
var inherits = require('util').inherits;
var Service, Characteristic;
var moment = require('moment');
var CustomCharacteristic = {};
var hostname = os.hostname();

module.exports = function(homebridge) {
	var FakeGatoHistoryService = require('fakegato-history')(homebridge);
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	
	homebridge.registerAccessory("homebridge-blueair", "BlueAir", BlueAir);
	
	function BlueAir(log, config) {
		function boolValueWithDefault(value, defaultValue) {
			if (value === undefined) {
				return defaultValue;
			} else {
				return value;
			}
		}
		
		this.log = log;
		this.username = config.username;
		this.apikey = "eyJhbGciOiJIUzI1NiJ9.eyJncmFudGVlIjoiYmx1ZWFpciIsImlhdCI6MTQ1MzEyNTYzMiwidmFsaWRpdHkiOi0xLCJqdGkiOiJkNmY3OGE0Yi1iMWNkLTRkZDgtOTA2Yi1kN2JkNzM0MTQ2NzQiLCJwZXJtaXNzaW9ucyI6WyJhbGwiXSwicXVvdGEiOi0xLCJyYXRlTGltaXQiOi0xfQ.CJsfWVzFKKDDA6rWdh-hjVVVE9S3d6Hu9BzXG9htWFw";
		this.password = config.password;
		this.appliance = {};
		this.appliance.info = {};
		this.historicalmeasurements = [];
		this.name = config.name || 'Air Purifier';
		this.displayName = config.name;
		this.purifierOnly = boolValueWithDefault(config.purifierOnly, false);
		this.sensorOnly = boolValueWithDefault(config.sensorOnly, false);
		this.airPurifierIndex = config.airPurifierIndex || 0;
		this.nameAirQuality = config.nameAirQuality || 'Air Quality';
		this.nameTemperature = config.nameTemperature || 'Temperature';
		this.nameHumidity = config.nameHumidity || 'Humidity';
		this.nameCO2 = config.nameCO2 || 'CO2';
		this.showAirQuality = boolValueWithDefault(config.showAirQuality, false);
		this.showTemperature = boolValueWithDefault(config.showTemperature, false);
		this.showHumidity = boolValueWithDefault(config.showHumidity, false);
		this.showCO2 = boolValueWithDefault(config.showCO2, false);
		this.getHistoricalStats = boolValueWithDefault(config.getHistoricalStats, false);
		this.showLED = boolValueWithDefault(config.showLED, true);
		
		this.base_API_url = "https://api.blueair.io/v2/user/" + this.username + "/homehost/";
		
		this.services = [];
		
		if(!this.username)
		throw new Error('Your must provide your BlueAir username.');
		
		if(!this.password)
		throw new Error('Your must provide your BlueAir password.');
		
		if(!this.apikey)
		throw new Error('Your must provide your BlueAir API Key.');
		
		if(!this.sensorOnly) {
			// Register the service
			this.service = new Service.AirPurifier(this.name);
			
			this.service
			.getCharacteristic(Characteristic.Active)
			.on('get', this.getActive.bind(this))
			.on('set', this.setActive.bind(this))
			.getDefaultValue();
			
			this.service
			.getCharacteristic(Characteristic.CurrentAirPurifierState)
			.on('get', this.getCurrentAirPurifierState.bind(this))
			.getDefaultValue();
			
			this.service
			.getCharacteristic(Characteristic.TargetAirPurifierState)
			.on('get', this.getTargetAirPurifierState.bind(this))
			.on('set', this.setTargetAirPurifierState.bind(this))
			.getDefaultValue();
			
			this.service
			.getCharacteristic(Characteristic.LockPhysicalControls)
			.on('get', this.getLockPhysicalControls.bind(this))
			.on('set', this.setLockPhysicalControls.bind(this))
			.getDefaultValue();
			
			this.service
			.getCharacteristic(Characteristic.RotationSpeed)
			.on('get', this.getRotationSpeed.bind(this))
			.on('set', this.setRotationSpeed.bind(this))
			.getDefaultValue();
			
			this.services.push(this.service);
			
			//Register the Filer Maitenance service
			this.filterMaintenanceService = new Service.FilterMaintenance(this.name + " Filter");
			
			this.filterMaintenanceService
			.getCharacteristic(Characteristic.FilterChangeIndication)
			.on('get', this.getFilterChange.bind(this))
			.getDefaultValue();
			
			this.filterMaintenanceService
			.addCharacteristic(Characteristic.FilterLifeLevel)
			.on('get', this.getFilterLife.bind(this))
			.getDefaultValue();
			
			this.services.push(this.filterMaintenanceService);
		}
		
		// Service information
		this.serviceInfo = new Service.AccessoryInformation();
		
		this.serviceInfo
		.setCharacteristic(Characteristic.Manufacturer, 'BlueAir')
		.setCharacteristic(Characteristic.Model, this.appliance.info.compatibility)
		.setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.appliance.info.uuid)
		.setCharacteristic(Characteristic.FirmwareRevision, this.appliance.info.firmware);
		
		this.services.push(this.serviceInfo);
		
		if (!this.sensorOnly && this.showLED) {
			//Register the Lightbulb service (LED / Display)
			this.lightBulbService = new Service.Lightbulb(this.name + " LED");
			
			this.lightBulbService
			.getCharacteristic(Characteristic.On)
			.on('get', this.getLED.bind(this))
			.on('set', this.setLED.bind(this))
			.getDefaultValue();
			
			this.lightBulbService
			.getCharacteristic(Characteristic.Brightness)
			.on('get', this.getLEDBrightness.bind(this))
			.on('set', this.setLEDBrightness.bind(this))
			.getDefaultValue();
			
			this.services.push(this.lightBulbService);
		}
		
		if(!this.purifierOnly && this.showAirQuality){
			this.airQualitySensorService = new Service.AirQualitySensor(this.nameAirQuality);
			
			this.airQualitySensorService
			.getCharacteristic(Characteristic.PM2_5Density)
			.on('get', this.getPM25Density.bind(this))
			.getDefaultValue();
			
			this.airQualitySensorService
			.getCharacteristic(Characteristic.AirQuality)
			.on('get', this.getAirQuality.bind(this))
			.getDefaultValue();
			
			this.airQualitySensorService
			.getCharacteristic(Characteristic.VOCDensity)
			.on('get', this.getVOCDensity.bind(this))
			.getDefaultValue();
			
			this.airQualitySensorService
			.getCharacteristic(Characteristic.CarbonDioxideLevel)
			.on('get', this.getCO2.bind(this))
			.getDefaultValue();
			
			this.airQualitySensorService
			.setCharacteristic(Characteristic.AirParticulateSize, '2.5um');
			
			this.services.push(this.airQualitySensorService);
		}
		
		if(!this.purifierOnly && this.showTemperature){
			this.temperatureSensorService = new Service.TemperatureSensor(this.nameTemperature);
			
			this.temperatureSensorService
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getTemperature.bind(this))
			.getDefaultValue();
			
			this.services.push(this.temperatureSensorService);
		}
		
		if(!this.purifierOnly && this.showHumidity){
			this.humiditySensorService = new Service.HumiditySensor(this.nameHumidity);
			
			this.humiditySensorService
			.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.on('get', this.getHumidity.bind(this))
			.getDefaultValue();
			
			this.services.push(this.humiditySensorService);
		}
		
		if(!this.purifierOnly && this.showCO2){
			this.CO2SensorService = new Service.CarbonDioxideSensor(this.nameCO2);
			
			this.CO2SensorService
			.getCharacteristic(Characteristic.CarbonDioxideLevel)
			.on('get', this.getCO2.bind(this))
			.getDefaultValue();
			
			this.CO2SensorService
			.getCharacteristic(Characteristic.CarbonDioxidePeakLevel)
			.on('get', this.getCO2Peak.bind(this))
			.getDefaultValue();
			
			this.CO2SensorService
			.getCharacteristic(Characteristic.CarbonDioxideDetected)
			.on('get', this.getCO2Detected.bind(this))
			.getDefaultValue();
			
			this.services.push(this.CO2SensorService);
		}
		
		if(!this.purifierOnly && this.getHistoricalStats){
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
		
		//Poll info on first run and every 10 minutes
		this.getAllState();
		setInterval(this.getAllState.bind(this), 600000);
	}
	
	
	BlueAir.prototype = {
		
		tryParseJSON: function(jsonString){
			try {
				var o = JSON.parse(jsonString);
				
				// Handle non-exception-throwing cases:
				// Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
				// but... JSON.parse(null) returns null, and typeof null === "object", 
				// so we must check for that, too. Thankfully, null is falsey, so this suffices:
				if (o && typeof o === "object") {
					return o;
				}
			}
			catch (e) { }
			
			return false;
		},
		
		getAllState: function(){
			if (this.deviceuuid !== 'undefined'){
				if(!this.sensorOnly)
				this.getBlueAirSettings(function(){});
				this.getBlueAirInfo(function(){});
				if(!this.purifierOnly)
				this.getLatestValues(function(){});
			} else {
				this.log.debug("No air purifiers found");
			}
		},
		
		httpRequest: function(options, callback) {
			request(options,
				function (error, response, body) {
					this.log.debug("Polled API:", options.url, options.json);
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
							this.log.debug('HTTP function failed: %s', error);
							callback(error);
						}
						else {
							this.log.debug("Got home region:", body);
							this.gothomehost = 1;
							this.homehost = body.replace(/['"]+/g, '');
							callback(null);
						}
					}.bind(this));
				}else{
					this.log.debug("Already have region");
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
						this.httpRequest(options, function(error, response) {
							if (error) {
								this.log.debug('HTTP function failed: %s', error);
								callback(error);
							}
							else {
								this.loggedin = 1;
								this.log.debug("Logged in to API");
								this.authtoken = response.headers['x-auth-token'];
								callback(null);
							}
						}.bind(this));
					}.bind(this));
				} else {
					this.log.debug("Already logged in");
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
								this.log.debug('HTTP function failed: %s', error);
								callback(error);
							}
							else {
								var json = this.tryParseJSON(body);
								var numberofdevices = '';
								this.deviceuuid = json[this.airPurifierIndex].uuid;
								this.devicename = json[this.airPurifierIndex].name;
								this.havedeviceID = 1;
								this.log.debug("Got device ID"); 
								callback(null);
							}
						}.bind(this));
					}.bind(this));
				} else {
					this.log.debug("Already have device ID");
					callback(null);
				}
			},
			
			getBlueAirSettings: function(callback) {
				//Get time now and check if we pulled from API in the last 5 minutes
				//if so, don't refresh as this is the max resolution of API
				var time = new Date();
				time.setSeconds(time.getSeconds() - 5);
				if (this.deviceuuid !== 'undefined') {
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
										this.log.debug('HTTP function failed: %s', error);
										callback(error);
									}
									else {
										var json = this.tryParseJSON(body);
										this.appliance = json.reduce(function(obj, prop) {
											obj[prop.name] = prop.currentValue;
											return obj;
										}, {});
										this.log.debug("Got device settings");
										this.havedevicesettings = 1;
										this.lastSettingRefresh = new Date();
										callback(null);
									}
								}.bind(this));
							}.bind(this));
						} else {
							this.log.debug("Already polled settings last 5 seconds, waiting.");
							callback(null);
						}
					}
				} else {
					this.log.debug("No air purifiers found");
				}
			},
			
			getBlueAirInfo: function(callback) {
				//Get time now and check if we pulled from API in the last 5 minutes
				//if so, don't refresh as this is the max resolution of API
				var time = new Date();
				time.setMinutes(time.getMinutes() - 5);
				if (this.deviceuuid !== 'undefined') {
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
										this.log.debug('HTTP function failed: %s', error);
										callback(error);
									}
									else {
										var json = this.tryParseJSON(body);
										this.appliance.info = json;
										this.log.debug("Got device info");
										var filterusageindays = Math.round(((this.appliance.info.initUsagePeriod/60)/60)/24);
										var filterlifeleft = (180 - filterusageindays);
										this.appliance.filterlevel = 100* (filterlifeleft / 180);
										this.havedeviceInfo = 1;
										this.lastInfoRefresh = new Date();
										callback(null);
									}
								}.bind(this));
							}.bind(this));
						} else {
							this.log.debug("Device info polled in last 5 minutes, waiting.");
							callback(null);
						}
					}
				} else {
					this.log.debug("No air purifiers found");
				}
			},
			
			getLatestValues: function(callback) {
				//Get time now and check if we pulled from API in the last 5 minutes
				//if so, don't refresh as this is the max resolution of API
				var time = new Date();
				time.setMinutes(time.getMinutes() - 5);
				if (this.deviceuuid !== 'undefined') {
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
										this.log.debug('HTTP function failed: %s', error);
										callback(error);
									}
									else {
										this.measurements = {};
										var json = this.tryParseJSON(body);
										this.lastSensorRefresh = new Date();
										
										if (json.datapoints.length >= 1)
										{
											for (let i = 0; i < json.sensors.length; i++) {
												switch(json.sensors[i]) {
													case "pm":
													this.measurements.pm = json.datapoints[0][i];
													//this.log.debug("Particulate matter 2.5:", this.measurements.pm + " " + json.units[i]);
													break;
													
													case "tmp":
													this.measurements.tmp = json.datapoints[0][i];
													//this.log.debug("Temperature:", this.measurements.tmp + " " + json.units[i]);
													break;
													
													case "hum":
													this.measurements.hum = json.datapoints[0][i];
													//this.log.debug("Humidity:", this.measurements.hum + " " + json.units[i]);
													break;
													
													case "co2":
													this.measurements.co2 = json.datapoints[0][i];
													//this.log.debug("CO2:", this.measurements.co2 + " " + json.units[i]);
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
													//this.log.debug("Volatile organic compounds:", this.measurements.voc + " " + json.units[i]);
													break;
													
													case "allpollu":
													this.measurements.allpollu = item[1];
													//this.log.debug("All Pollution:", this.measurements.allpollu, json.units[i]);
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
											this.log.debug("Sensor data refreshed");
										} else {
											this.log.debug("No sensor data available");
										}
										callback(null);
									}
								}.bind(this));
							}.bind(this));
						}
						else
						{
							this.log.debug("Sensor data polled in last 5 minutes, waiting.");
							callback(null);
						}
					}
				} else {
					this.log.debug("No air purifiers found");
				}
			},
			
			getHistoricalValues: function(callback) {
				//Get time now and check if we pulled from API in the last 5 minutes
				//if so, don't refresh as this is the max resolution of API
				var time = new Date();
				time.setMinutes(time.getMinutes() - 30);
				if (this.deviceuuid !== 'undefined') {
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
									//Get datapoints rounded to 600s as higher resolution reduces history in Eve
									url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/datapoint/' + tslastmonth + '/' + tsnow + '/600/',
									method: 'get',
									headers: {
										'X-API-KEY-TOKEN': this.apikey,
										'X-AUTH-TOKEN': this.authtoken
									}
								};
								//Send request
								this.httpRequest(options, function(error, response, body) {
									
									if (error) {
										
										this.log.debug('HTTP function failed: %s', error);
										callback(error);
										
									}
									else {
										
										var json = this.tryParseJSON(body);
										this.log.debug("Downloaded " + json.datapoints.length + " datapoints for " + json.sensors.length + " senors");
										
										if (json.datapoints.length >= 1)
										{
											for (let i = 0; i < json.sensors.length; i++) {
												this.historicalmeasurements.push([]);
												switch(json.sensors[i]) {
													case "time":
													for (let j = 0; j < json.datapoints.length; j++){
														this.historicalmeasurements[i][j] = json.datapoints[j][i];
													}
													break;
													
													case "pm":
													for (let j = 0; j < json.datapoints.length; j++){
														this.historicalmeasurements[i][j] = json.datapoints[j][i];
													}
													break;
													
													case "tmp":
													for (let j = 0; j < json.datapoints.length; j++){
														this.historicalmeasurements[i][j] = json.datapoints[j][i];
													}
													break;
													
													case "hum":
													for (let j = 0; j < json.datapoints.length; j++){
														this.historicalmeasurements[i][j] = json.datapoints[j][i];
													}
													break;
													
													case "co2":
													for (let j = 0; j < json.datapoints.length; j++){
														this.historicalmeasurements[i][j] = json.datapoints[j][i];
													}
													break;
													
													case "voc":
													for (let j = 0; j < json.datapoints.length; j++){
														this.historicalmeasurements[i][j] = json.datapoints[j][i];
													}
													break;
													
													case "allpollu":
													for (let j = 0; j < json.datapoints.length; j++){
														this.historicalmeasurements[i][j] = json.datapoints[j][i];
													}
													break;
													
													default:
													break;
												}
											}
										}
										
										this.lastHistoricalRefresh = new Date();
										callback(null);
									}
									
									// //Add filesystem writer to create persistent record of historical import
									// fs.file = "./"+hostname+"_"+this.name+'_persist.json';
									
									// //Only run once (i.e. as long as persistence file doesn't exist)
									// if (fs.existsSync(fs.file) === false){
									
									// 	//Load historicals from API into Elgato synchronously
									
									// 	for (let i = 0; i < this.historicalmeasurements[0].length; i++){
									// 		this.loggingService.addEntry({
									// 			time: this.historicalmeasurements[0][i],
									// 			temp: this.historicalmeasurements[2][i],
									// 			humidity: this.historicalmeasurements[3][i],
									// 			ppm: this.historicalmeasurements[4][i]
									// 		});
									// 	}
									
									// } else {
									
									// 	this.log.debug("Historical import has previously run, not importing.");
									
									// }
									
								}.bind(this));
								
							}.bind(this));
							
						}
						
					} else {
						this.log.debug("Pulled historical data in last 30 mins, waiting");
						callback();
					}
				} else {
					this.log.debug("No air purifiers found");
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
					if (this.appliance.child_lock === "0"){
						callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
					} else {
						callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED);
					}
				}.bind(this));
			},
			
			setLockPhysicalControls: function(state, callback) {
				if(state === 1){
					this.LockState = 1;
				} else if (state === 0){
					this.LockState = 0;
				}
				
				//Build POST request body
				var requestbody = {
					"currentValue": this.LockState,
					"scope": "device",
					"defaultValue": this.LockState,
					"name": "child_lock",
					"uuid": this.deviceuuid
				};
				
				//Build POST request
				var options = {
					url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/child_lock/',
					method: 'post',
					headers: {
						'X-API-KEY-TOKEN': this.apikey,
						'X-AUTH-TOKEN': this.authtoken
					},
					json: requestbody
				};
				
				//Send request
				this.httpRequest(options, function(error) {
					if (error) {
						this.log.debug('HTTP function failed: %s', error);
						callback(error);
					}
					else {
						callback(null);
					}
				}.bind(this));
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
						callback();
					}
				}.bind(this));
			},
			
			setTargetAirPurifierState: function(state, callback) {
				//Set fan to auto turned on without a speed set
				if(state === 0){
					this.targetPurifierState = 'manual';
				} else if (state === 1){
					this.targetPurifierState = 'auto';
				}
				
				//Build POST request body
				var requestbody = {
					"currentValue": this.targetPurifierState,
					"scope": "device",
					"defaultValue": this.targetPurifierState,
					"name": "mode",
					"uuid": this.deviceuuid
				};
				
				//Build POST request
				var options = {
					url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/mode/',
					method: 'post',
					headers: {
						'X-API-KEY-TOKEN': this.apikey,
						'X-AUTH-TOKEN': this.authtoken
					},
					json: requestbody
				};
				
				//Send request
				this.httpRequest(options, function(error) {
					if (error) {
						this.log.debug('HTTP function failed: %s', error);
						callback(error);
					}
					else {
						callback(null);
					}
				}.bind(this));
			},
			
			getActive: function(callback) {
				this.getBlueAirSettings(function(){
					if (this.appliance.fan_speed === "0"){
						callback(null, Characteristic.Active.INACTIVE);
					} else if (this.appliance.fan_speed >= 1 && this.appliance.fan_speed <= 3) {
						callback(null, Characteristic.Active.ACTIVE);
					} else {
						callback();
					}
				}.bind(this));
			},
			
			setActive: function(state, callback) {
				//Set fan to auto when turned on, else set fan_speed to 0
				if (state === 1) {
					this.setTargetAirPurifierState(1, function(){
						callback(null);
					}.bind(this));
				} else if (state === 0) {
					
					this.fanState = 0;
					
					//Build POST request body
					var requestbody = {
						"currentValue": this.fanState,
						"scope": "device",
						"defaultValue": this.fanState,
						"name": "fan_speed",
						"uuid": this.deviceuuid
					};
					
					//Build POST request
					var options = {
						url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/fanspeed/',
						method: 'post',
						headers: {
							'X-API-KEY-TOKEN': this.apikey,
							'X-AUTH-TOKEN': this.authtoken
						},
						json: requestbody
					};
					
					//Send request
					this.httpRequest(options, function(error) {
						if (error) {
							this.log.debug('HTTP function failed: %s', error);
							callback(error);
						}
						else {
							callback(null);
						}
					}.bind(this));
				}
			},
			
			getFilterLife: function(callback) {
				this.getBlueAirInfo(function(){
					callback(null, this.appliance.filterlevel);
				}.bind(this));
			},
			
			getRotationSpeed: function(callback) {
				this.getBlueAirSettings(function(){
					if (this.appliance.fan_speed === "0"){
						callback(null, 0);
					} else if (this.appliance.fan_speed === "1") {
						callback(null, 33);
					} else if (this.appliance.fan_speed === "2") {
						callback(null, 66);
					}	else if (this.appliance.fan_speed === "3") {
						callback(null, 100);
					}	else {
						callback();
					}
				}.bind(this));
			},
			
			setRotationSpeed: function(fan_speed, callback) {
				//Correlate percentages to fan levels in API
				//[high threshold, low threshold, API fan level]
				var levels = [
					[67, 100, 3],
					[34, 66, 2],
					[1, 33, 1],
					[0, 0 , 0]
				];
				
				//Set fan speed based on percentage passed
				for(var item of levels){
					if(fan_speed >= item[0] && fan_speed <= item[1]){
						this.appliance.fan_speed = item[2];
					}
				}
				
				//Build POST request body
				var requestbody = {
					"currentValue": this.appliance.fan_speed,
					"scope": "device",
					"defaultValue": this.appliance.fan_speed,
					"name": "fan_speed",
					"uuid": this.deviceuuid
				};
				
				//Build POST request
				var options = {
					url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/fanspeed/',
					method: 'post',
					headers: {
						'X-API-KEY-TOKEN': this.apikey,
						'X-AUTH-TOKEN': this.authtoken
					},
					json: requestbody
				};
				
				//Send request
				this.httpRequest(options, function(error) {
					if (error) {
						this.log.debug('HTTP function failed: %s', error);
						callback(error);
					}
					else {
						callback(null);
					}
				}.bind(this));
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
			
			setLED: function(state, callback) {
				//Set brightness last read value if turned on, set to 0 if off
				if(state === true){
					if(this.appliance.brightness !== "0"){
						this.LEDState = this.appliance.brightness;
					} else {
						this.LEDState = 4;
					}
				} else if (state === false){
					this.LEDState = 0;
				}
				
				//Build POST request body
				var requestbody = {
					"currentValue": this.LEDState,
					"scope": "device",
					"defaultValue": this.LEDState,
					"name": "brightness",
					"uuid": this.deviceuuid
				};
				
				//Build POST request
				var options = {
					url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/brightness/',
					method: 'post',
					headers: {
						'X-API-KEY-TOKEN': this.apikey,
						'X-AUTH-TOKEN': this.authtoken
					},
					json: requestbody
				};
				
				//Send request
				this.httpRequest(options, function(error) {
					if (error) {
						this.log.debug('HTTP function failed: %s', error);
						callback(error);
					}
					else {
						callback(null);
					}
				}.bind(this));
			},
			
			getLEDBrightness: function(callback) {
				this.getBlueAirSettings(function(){
					if (this.appliance.brightness === "0"){
						callback(null, 0);
					} else if (this.appliance.brightness === "1") {
						callback(null, 25);
					} else if (this.appliance.brightness === "2") {
						callback(null, 50);
					}	else if (this.appliance.brightness === "3") {
						callback(null, 75);
					}	else if (this.appliance.brightness === "4") {
						callback(null, 100);
					} else {
						callback();
					}
				}.bind(this));
			},
			
			setLEDBrightness: function(brightness, callback) {
				//Correlate percentages to LED brightness levels in API
				//[high threshold, low threshold, API brightness level]
				var levels = [
					[76, 100, 4],
					[51, 75, 3],
					[26, 50, 2],
					[1, 25, 1],
					[0, 0 , 0]
				];
				
				//Set brightness based on percentage passed
				for(var item of levels){
					if(brightness >= item[0] && brightness <= item[1]){
						this.LEDState = item[2];
					}
				}
				
				//Build POST request body
				var requestbody = {
					"currentValue": this.LEDState,
					"scope": "device",
					"defaultValue": this.LEDState,
					"name": "brightness",
					"uuid": this.deviceuuid
				};
				
				//Build POST request
				var options = {
					url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/brightness/',
					method: 'post',
					headers: {
						'X-API-KEY-TOKEN': this.apikey,
						'X-AUTH-TOKEN': this.authtoken
					},
					json: requestbody
				};
				
				//Send request
				this.httpRequest(options, function(error) {
					if (error) {
						this.log.debug('HTTP function failed: %s', error);
						callback(error);
					}
					else {
						callback(null);
					}
				}.bind(this));
			},
			
			getServices: function() {
				return this.services;
			}
		};
	};
