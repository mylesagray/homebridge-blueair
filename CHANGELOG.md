# release notes

## v0.5.4

* Updated blueair API and added back in multi-purifier support

## v0.5.3

* Temporary removal of multi-purifier support because of API changes

## v0.5.2

* Bugfix for BlueAir API change

## v0.5.1

* Added auto configuration of supported elements of each purifier type.

## v0.5.0

* Added Sense and Aware support.

## v0.4.2

* Added JSON checking before attempting to parse to ensure non-JSON responses don't crash.

## v0.4.1

* LED now optional and can be specified in config with `showLED: true` - PR #18
* Merged PR #19 to fix defaults assignment

## v0.4.0

* Added support for multiple air purifiers using the airPurifierIndex config option.

## v0.3.2

* Added support for sensorless models
* Hardcoded API key as it is globally shared

## v0.1.2

* Moved logging to debug only mode
* Updated readme

## v0.1.1

* Fixed faulty filter life calculation logic
* Added auto polling every 5 minutes in background for historical use
* Added get all metrics run on app startup to populate Home without forced refresh

## v0.1.0-beta

* Initial release
