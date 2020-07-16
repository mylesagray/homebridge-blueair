[![npm](https://img.shields.io/npm/v/homebridge-blueair.svg)](https://www.npmjs.com/package/homebridge-blueair)
[![GitHub last commit](https://img.shields.io/github/last-commit/mylesgray/homebridge-blueair.svg)](https://github.com/mylesgray/homebridge-blueair)

Like this? I don't care much for beer, but coffee is bitchin' [![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.me/mylesgray)

# homebridge-blueair
This is a [homebridge](https://github.com/nfarina/homebridge) plugin which lets you integrate your non-HomeKit [BlueAir](https://www.blueair.com/gb/air-purifiers) air purifier into HomeKit.

Currently supported are all Classic i-Series air purifiers, however, Classic series without sensors but do have wifi controls, should be supportable if I can be provided with API output by anyone!

This plugin exposes all BlueAir (Foobot) API characteristics and assigns them to native HomeKit Characteristics. The plugin will also mimic the Elgato Eve *Room* device such that, if using Eve.app on an iOS device, you will have historical logging and graphs of these metrics.

Currently all history state is stored on the local filesystem of the device running homebridge.

## Screenshots

### Eve

Overview  | Detail 1 | Detail 2 | Detail 3
:--------:|:--------:|:--------:|:--------:
![Overview](https://dl.dropboxusercontent.com/s/4gwkocdl91nx758/IMG_1318.png?dl=0) | ![Detail 1](https://dl.dropboxusercontent.com/s/jrwekvhlyomxawk/IMG_1319.png?dl=0) | ![Detail 2](https://dl.dropboxusercontent.com/s/v14je4qg50sudj3/IMG_1320.png?dl=0) | ![Detail 3](https://dl.dropboxusercontent.com/s/7xmqwsek0403m57/IMG_1321.png?dl=0)

### Home
Overview  | Air Purifer On/Off | Air Purifer Fan Speed | Air Purifier Detail 
:--------:|:------------------:|:---------------------:|:--------------------:
![Overview](https://dl.dropboxusercontent.com/s/ae2cozmepd25nn0/IMG_1324.png?dl=0) | ![Air Purifer On/Off](https://dl.dropboxusercontent.com/s/efnyu5ocwzpk18o/IMG_1326.png?dl=0) | ![Air Purifer Fan Speed](https://dl.dropboxusercontent.com/s/t1qgk01lj0hezbi/IMG_1327.png?dl=0) | ![Air Purifier Detail](https://dl.dropboxusercontent.com/s/j0zro2vidoc3xdp/IMG_1325.png?dl=0)

Air Quality Overview  | Air Quality Detail | Temperature Overview | Temperature Detail
:--------------------:|:------------------:|:--------------------:|:-------------------:
![Air Quality Overview](https://dl.dropboxusercontent.com/s/b7yqdtnusojxcyf/IMG_1329.png?dl=0) | ![Air Quality Detail](https://dl.dropboxusercontent.com/s/re4k2wkxvh10ghw/IMG_1328.png?dl=0) | ![Temperature Overview](https://dl.dropboxusercontent.com/s/5gmxbt0ph7pz96g/IMG_1330.png?dl=0) | ![Temperature Detail](https://dl.dropboxusercontent.com/s/3do2d5cvxvnn0i1/IMG_1331.png?dl=0)

Humidity Overview  | Humidity Detail | CO2 Overview | CO2 Detail
:-----------------:|:---------------:|:------------:|:------------:
![Humidity Overview](https://dl.dropboxusercontent.com/s/92utbgvdr2v4xde/IMG_1332.png?dl=0) | ![Humidity Detail](https://dl.dropboxusercontent.com/s/iihjfaugqct5a2z/IMG_1333.png?dl=0) | ![CO2 Overview](https://dl.dropboxusercontent.com/s/27iimf1x5t9eovv/IMG_1334.png?dl=0) | ![CO2 Detail](https://dl.dropboxusercontent.com/s/cblaxcfbg2duu2m/IMG_1335.png?dl=0)

LED Overview  | LED Detail | LED Brightness | CO2 Automation
:------------:|:----------:|:--------------:|:---------------------:
![LED Overview](https://dl.dropboxusercontent.com/s/fn58gdei0zznngw/IMG_1336.png?dl=0) | ![LED Detail](https://dl.dropboxusercontent.com/s/w1cyj3vukeq8jij/IMG_1341.png?dl=0) | ![LED Brightness](https://dl.dropboxusercontent.com/s/jd4ugcml1lktv8c/IMG_1340.png?dl=0) | ![CO2 Automation](https://dl.dropboxusercontent.com/s/14j4zdhgbpospl9/IMG_1338.png?dl=0)

## Configuration

### Installation

```
npm install homebridge-blueair
```

### config.json

An explaination of the config is below, a `config-example.json` is also provided along with the plugin for ease of use.

For instructions on how to retrieve your apikey [see here](https://github.com/mylesgray/homebridge-blueair/wiki/API_Key).

```
/// i-Series
  {
    "accessory": "BlueAir",
    "name": "BlueAir 680i",
    "airPurifierIndex": 0, //optional if you have multiple air purifiers
    "nameAirQuality": "Air Quality", //optional
    "nameTemperature": "Temperature", //optional
    "nameHumidity": "Humidity", //optional
    "nameCO2": "Carbon Dioxide", //optional
    "username": "{BlueAir-Email}",
    "password": "{BlueAir-Password}",
    "showTemperature": true, //show temp sensor
    "showHumidity": true, //show humidity sensor
    "showAirQuality": true, //show air quality sensor
    "showCO2": true, //show CO2 sensor
    "showLED": true, //register the air purifier's LED as a lightbulb service
    "getHistoricalStats": true //enable historical logging in Eve.app
},

/// Classic Series or Sense

{
    "accessory": "BlueAir",
    "name": "BlueAir Sense",
    "airPurifierIndex": 1, //optional, should match your actual device order
    "purifierOnly": true, //must be true for Classic/Sense+ device
    "username": "{BlueAir-Email}",
    "password": "{BlueAir-Password}"
    "showLED": true //register the air purifier's LED as a lightbulb service
},

/// Aware

{
    "accessory": "BlueAir",
    "name": "BlueAir Aware",
    "airPurifierIndex": 2, //optional, should match your actual device order
    "sensorOnly": true, //must be true for Aware device
    "nameAirQuality": "Air Quality", //optional
    "nameTemperature": "Temperature", //optional
    "nameHumidity": "Humidity", //optional
    "nameCO2": "Carbon Dioxide", //optional
    "username": "{BlueAir-Email}",
    "password": "{BlueAir-Password}",
    "showTemperature": true, //show temp sensor
    "showHumidity": true, //show humidity sensor
    "showAirQuality": true, //show air quality sensor
    "showCO2": true, //show CO2 sensor
    "getHistoricalStats": true //enable historical logging in Eve.app
}
```

## Releases
See [CHANGELOG.md](https://github.com/mylesgray/homebridge-blueair/blob/master/CHANGELOG.md)

## To-dos
See [open enhancement issues](https://github.com/mylesgray/homebridge-blueair/labels/enhancement)

## API research
There is no documented API for the BlueAir devices, through some API proxying with Charles I was able to find out they use the Foobot API backend for their intelligence and map all requests for get/set.

### Postman collection and environment
I coallated all requests that my device made into an easy-to-use [Postman collection](https://www.getpostman.com/collections/1a8ff6c577e58a7b6f90).

You need to create a Postman Environment with the following variables in it to use the collection:
![Postman Environment](https://dl.dropboxusercontent.com/s/yu3lz7r47pe00ex/Screenshot%202018-03-04%2015.06.10.png?dl=0)

## Thanks

This plugin is heavily based on (hacked together from) two other plugins, [homebridge-efergy](https://github.com/luc-ass/homebridge-efergy) and [homebridge-mi-air-purifier](https://github.com/seikan/homebridge-mi-air-purifier), without these plugins I could not have created the foundation on which this was built. Thanks to @luc-ass and @seikan for their work on these.

The [fakegato-history](https://github.com/simont77/fakegato-history) plugin on which this is based was built by @simont77, without this, we wouldn't have pretty graphs to gawk at.
