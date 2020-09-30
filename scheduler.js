const cron = require('node-cron')
const fillTemplate = require('es6-dynamic-template')
const conf = require('./config.example')
const request = require('request-promise')
const stateManager = require('./stateManager')
const ventModeDuration = 15 * 60000
const temperatureCheckPeriod = 30 //In minutes
class Scheduler {
    constructor() {
        this.periods = []
        this.fanStatus = 0
        this.currentTemperature = null
        this.scheduleTemperatureUpdate(temperatureCheckPeriod)
        this.isInVentMode = false;
        this.ventModeTimer = null;
        stateManager.systemStatusSubject.subscribe((systemStatus) => {
            if (systemStatus === 1) {
                this.startSystem()
            } else {
                this.stopSystem()
            }
        })

        stateManager.scheduleSubject.subscribe((periods) => {
            this.setSchedule(periods)
        })

        stateManager.ventModeSubject.subscribe((isVentMode) => {
            if (isInVentMode && isVentMode) return;
            this.isInVentMode = isVentMode;
            if (isVentMode) {
                this.setDeviceStatus(0)
                this.ventModeTimer = setTimeout(() => {
                    this.setDeviceStatus(0)
                }, ventModeDuration)
            } else {
                this.setDeviceStatus(0)
                clearTimeout(this.ventModeTimer)
            }
        })
    }

    setSchedule(schedule) {
        while (this.periods.length > 0) {
            let period = this.periods.pop()
            console.log(period)
            if (period) {
                period.destroy()
            }

        }
        schedule.forEach((period) => {
            this.scheduleFan(...period)
        })
    }

    scheduleFan(fromH, toH, period, duration) {
        toH = (toH == 0) ? 23 : toH - 1
        this.periods.push(cron.schedule(`*/${period} ${fromH}-${toH} * * *`, () => {
            this.startFan(workingPeriod)
            console.log(Date().toString(), `running a task every ${period} m for ${duration} from ${fromH} to ${toH}`);
        }))
    }

    scheduleTemperatureUpdate(minutes) {
        this.fetchTemperature()
        return cron.schedule(`*/${minutes} * * * *`, () => {
            this.fetchTemperature()
        });
    }

    /**
     * @param {integer} workingPeriod - working period in Minutes
     */
    startFan(workingPeriod) {
        if (this.isInVentMode) {
            return
        }
        this.fanStatus = 1
        if (this.systemStatus === 1) {
            this.setDeviceStatus(1)
        }
        setTimeout(() => {
            this.stopFan()
            console.log(Date().toString(), `Stop Fan after ${workingPeriod} worked`);
        }, workingPeriod * 60000)
    }

    stopFan() {
        if (this.isInVentMode) {
            return
        }
        this.fanStatus = 0
        this.setDeviceStatus(0)
    }

    setShutter(shutter, angle) {
        if (angle < 0 || angle > 90 || shutter < 0) return
        const url = fillTemplate(conf.shutter_url,
            {
                shutter: shutter.toString(10),
                angle: angle.toString(10)
            })
        request.get(conf.shutter_url + angle.toString(10))
            .then(res => console.info(`Shutter was rotated to ${angle}`))
    }

    setDeviceStatus(status) {
        let actionUrl = status ? conf.fan_on_url : conf.fan_off_url;
        if (actionUrl !== '') {
            request.get(actionUrl).then(() => {
            })
                .catch((err) => console.error('Send to device err:', err));
        }
    }

    fetchTemperature() {
        request.get(conf.temperature_url).then((res) => {
            stateManager.temperature = res
        });
    }

    stopSystem() {
        stateManager.systemStatus = 0
        if (this.fanStatus === 1) {
            this.setDeviceStatus(0)
        }
    }

    startSystem() {
        stateManager.systemStatus = 1
        if (this.fanStatus === 1) {
            this.setDeviceStatus(1);
        }
    }


}

module.exports = new Scheduler();
