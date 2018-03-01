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
    this.name = config.name || 'Air Purifier';
    this.showAirQuality = config.showAirQuality || false;
    this.showTemperature = config.showTemperature || false;
    this.showHumidity = config.showHumidity || false;
    this.nameAirQuality = config.nameAirQuality || 'Air Quality';
    this.nameTemperature = config.nameTemperature || 'Temperature';
    this.nameHumidity = config.nameHumidity || 'Humidity';

    this.base_API_url = "https://api.foobot.io/v2/user/" + this.username + "/homehost/";

    this.services = [];

    if(!this.username)
      throw new Error('Your must provide your BlueAir username.');

    if(!this.password)
      throw new Error('Your must provide your BlueAir password.');

    if(!this.apikey)
      throw new Error('Your must provide your BlueAir API Key.');

  // // Register the service
  // this.service = new Service.AirPurifier(this.name);

  // this.service
  // .getCharacteristic(Characteristic.Active)
  // .on('get', this.getActive.bind(this))
  // .on('set', this.setActive.bind(this));

  // this.service
  // .getCharacteristic(Characteristic.CurrentAirPurifierState)
  // .on('get', this.getCurrentAirPurifierState.bind(this));

  // this.service
  // .getCharacteristic(Characteristic.TargetAirPurifierState)
  // .on('get', this.getTargetAirPurifierState.bind(this))
  // .on('set', this.setTargetAirPurifierState.bind(this));

  // this.service
  // .getCharacteristic(Characteristic.LockPhysicalControls)
  // .on('get', this.getLockPhysicalControls.bind(this))
  // .on('set', this.setLockPhysicalControls.bind(this));

  // this.service
  // .getCharacteristic(Characteristic.RotationSpeed)
  // .on('get', this.getRotationSpeed.bind(this))
  // .on('set', this.setRotationSpeed.bind(this));

  // // Service information
  // this.serviceInfo = new Service.AccessoryInformation();

  // this.serviceInfo
  // .setCharacteristic(Characteristic.Manufacturer, 'BlueAir')
  // .setCharacteristic(Characteristic.Model, 'Air Purifier')
  // .setCharacteristic(Characteristic.SerialNumber, 'Undefined');

  // this.services.push(this.service);
  // this.services.push(this.serviceInfo);
  
  // // Register the Lightbulb service (LED / Display)
  // //this.lightBulbService = new Service.LightBulb(this.name + "LED");

  // //this.lightBulbService
  // //  .getCharacteristic(Characteristic.On)
  // //  .on('get', this.getLED.bind(this))
  // //  .on('set', this.setLED.bind(this));
  
  // //this.services.push(this.lightBulbService);
  
  // // Register the Filer Maitenance service
  // this.filterMaintenanceService = new Service.FilterMaintenance(this.name + "Filter");

  // this.filterMaintenanceService
  // .getCharacteristic(Characteristic.FilterChangeIndication)
  // .on('get', this.getFilterChange.bind(this));
  
  // this.filterMaintenanceService
  // .addCharacteristic(Characteristic.FilterLifeLevel)
  // .on('get', this.getFilterLife.bind(this));
  
  // this.services.push(this.filterMaintenanceService);

  // if(this.showAirQuality){
  //   this.airQualitySensorService = new Service.AirQualitySensor(this.nameAirQuality);

  //   this.airQualitySensorService
  //   .getCharacteristic(Characteristic.AirQuality)
  //   .on('get', this.getAirQuality.bind(this));

  //   this.airQualitySensorService
  //   .getCharacteristic(Characteristic.PM2_5Density)
  //   .on('get', this.getPM25.bind(this));

  //   //this.airQualitySensorService
  //   //  .setCharacteristic(Characteristic.AirParticulateSize, '2.5um');
  //   //
  //   this.services.push(this.airQualitySensorService);
  // }

  // if(this.showTemperature){
  //   this.temperatureSensorService = new Service.TemperatureSensor(this.nameTemperature);

  //   this.temperatureSensorService
  //   .getCharacteristic(Characteristic.CurrentTemperature)
  //   .on('get', this.getCurrentTemperature.bind(this));

  //   this.services.push(this.temperatureSensorService);
  // }

  // if(this.showHumidity){
  //   this.humiditySensorService = new Service.HumiditySensor(this.nameHumidity);

  //   this.humiditySensorService
  //   .getCharacteristic(Characteristic.CurrentRelativeHumidity)
  //   .on('get', this.getCurrentRelativeHumidity.bind(this));

  //   this.services.push(this.humiditySensorService);
  // }

  this.login();
}

// Custom Characteristics and service...
BlueAir.PowerConsumption = function() {
  Characteristic.call(this, 'Watts', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
  this.setProps({
    format: Characteristic.Formats.FLOAT,
    maxValue: 999999999,
    minValue: 1,
    minStep: 0.001,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
  });
  this.value = this.getDefaultValue();
};
inherits(BlueAir.PowerConsumption, Characteristic);

BlueAir.TotalConsumption = function() {
  Characteristic.call(this, 'kWh', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
  this.setProps({
    format: Characteristic.Formats.FLOAT,
    maxValue: 999999999,
    minValue: 1,
    minStep: 0.001,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
  });
  this.value = this.getDefaultValue();
};
inherits(BlueAir.TotalConsumption, Characteristic);

BlueAir.PowerService = function(displayName, subtype) {
  Service.call(this, displayName, '00000001-0000-1000-8000-135D67EC4377', subtype);
  this.addCharacteristic(BlueAir.PowerConsumption);
  this.addCharacteristic(BlueAir.TotalConsumption);
};
inherits(BlueAir.PowerService, Service);



BlueAir.prototype = {

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
    request.get(options, function(error, response, body) {
      if (error) {
        this.log('HTTP function failed: %s', error);
        callback(error);
      }
      else {
        var json = JSON.parse(body);
        this.log('Homehost:', json);
        callback(json);
      }
    }.bind(this));
  },

  login: function() {
    //Build the request and use returned value
    this.getHomehost(function(homehost){
      var options = {
        url: 'https://' + homehost + '/v2/user/' + this.username + '/login/',
        method: 'get',
        headers: {
          'X-API-KEY-TOKEN': this.apikey,
          'Authorization': 'Basic ' + Buffer.from(this.username + ':' + this.password).toString('base64')
        }
      };
        //Send request
        request(options, function(error, response, body) {
          if (error) {
            this.log('HTTP function failed: %s', error);
            return(error);
          }
          else {
            var json = JSON.parse(body);
            this.log('Logged in:', json);
            this.log('Auth token:', response.headers['x-auth-token']);
            return(json);
          }
        }.bind(this))
      }.bind(this));
  },

  getConsumption: function(callback) {
    this.httpRequest(this.W_url, 'get', function(error, response, body) {
      if (error) {
        this.log('HTTP function failed: %s', error);
        callback(error);
      }
      else {
          // stupidly complex because of the way the
          // json is formated by the server...
          var json = JSON.parse(body);
          var obj = json[0].data[0];
          var key = Object.keys(obj)[0];
          var data = obj[key];
          this.log('Read Total Conumption:', data, 'W');
          callback(null, data);
        }
      }.bind(this))
  },

  getTotalConsumption: function(callback) {
    this.httpRequest(this.kWh_url, 'get', function(error, response, body) {
      if (error) {
        this.log('HTTP function failed: %s', error);
        callback(error);
      }
      else {
        var json = JSON.parse(body);
        var kWh = parseFloat(json['sum']);
        this.log('Read Total Consumption:', kWh, 'kWh today');
        callback(null, kWh);
      }
    }.bind(this))
  },

  getServices: function() {
    var that = this;

    var informationService = new Service.AccessoryInformation();
    informationService
    .setCharacteristic(Characteristic.Name, this.name)
    .setCharacteristic(Characteristic.Manufacturer, "BlueAir")
    .setCharacteristic(Characteristic.Model, "Unknown")
    .setCharacteristic(Characteristic.SerialNumber, "1234567890");

    var myPowerService = new BlueAir.PowerService("Power Functions");
    myPowerService
    .getCharacteristic(BlueAir.PowerConsumption)
    .on('get', this.getConsumption.bind(this));
    myPowerService
    .getCharacteristic(BlueAir.TotalConsumption)
    .on('get', this.getTotalConsumption.bind(this));

    return [informationService, myPowerService];
  }
}
};