const conf = require('./config')
const express = require('express')
const app = express()
const fillTemplate = require('es6-dynamic-template')

const request = require('request-promise')
const fs =  require('fs')
const util = require('util');
const fsOpen = util.promisify(fs.open)



const cron = require('node-cron')

let systemStatus = 0; // Total system status 
let fanStatus = 0; // Fan status
let currentTemperature = null; //Curent temperature from sensor

app.get('/', (req, res) => {
    let name = req.query.name;
    if (name) {
        res.send(`Hi, ${name}! How are you?`);
    } else {
        res.send('Hello World!')
    }
})

app.get('/on', (req, res) => {
    systemStatus = 1;
    console.log('Bridge ask to ON the system');
    notifyBridge(conf.notifications.fan_url, 'On', systemStatus);
    saveState({systemStatus})
    if (fanStatus === 1) {
        setDeviceStatus(1);
    }
    res.send('ON')
})

app.get('/off', (req, res) => {
    systemStatus = 0;
    console.log('Bridge ask to OFF he system');
    notifyBridge(conf.notifications.fan_url, 'On', systemStatus);
    saveState({systemStatus})
    if (fanStatus === 1) {
        setDeviceStatus(0);
    }
    res.send('OFF')
})

app.get('/status', (req, res) => {
    console.log('Bridge ask to system status')
    res.send(systemStatus.toString(10))
})

app.get('/temperature', (req, res) => {
    getTemperature()
    if (currentTemperature) {
        res.send(currentTemperature.toString(10));
    } else {
        res.status(500).send('temperature not ready')
    }
})

app.get('/shutter', (req, res) => {
    let angle = parseInt(req.query.angle)
    let shutter = parseInt(req.query.shutter) || 1
    if (!isNaN(angle)) {
        setShutter(shutter, angle)
    }
    res.status(201).send();
})

////
function scheduleFan(fromH, toH, startPeriod, workingPeriod) {
	toH = (toH == 0) ? 23 : toH - 1	
    return cron.schedule(`*/${startPeriod} ${fromH}-${toH} * * *`, () => {
        startFan(workingPeriod)
        console.log(Date().toString(), `running a task every ${startPeriod} m for ${workingPeriod} from ${fromH} to ${toH}`);
    });
}

function scheduleTemperatureUpdate(minutes) {
    getTemperature()
    return cron.schedule(`*/${minutes} * * * *`, () => {
        getTemperature()
    });
}

/**
 * 
 * @param {integer} workingPeriod - working period in Minutes
 */
function startFan(workingPeriod) {
    fanStatus = 1;
    if (systemStatus === 1) {
        setDeviceStatus(1)
    }
    setTimeout(function () {
        stopFan();
        console.log(Date().toString(), `Stop Fan after ${workingPeriod} worked`);
    }, workingPeriod * 60000)
}

function stopFan() {
    fanStatus = 0
    setDeviceStatus(0)
}

function setShutter(shutter, angle) {
    if (angle < 0 || angle > 90 || shutter < 0) return
    const url = fillTemplate(conf.shutter_url,
        {
            shutter: shutter.toString(10),
            angle: angle.toString(10)
        })
    request.get(conf.shutter_url + angle.toString(10))
        .then(res => console.info('vDBG', `Shutter was rotated to ${angle}`))
}

function setDeviceStatus(status) {
    let actionUrl = status ? conf.fan_on_url : conf.fan_off_url;
    if (actionUrl !== '') {
        request.get(actionUrl).then(() => { })
            .catch((err) => console.error('vDBG', 'Send to device err:', err));
    }
}

function notifyBridge(uri, characteristic, value) {
    if (!conf.notifications.enabled) {
        return;
    }
    request.post(
        uri, {
        json: {
            characteristic: characteristic,
            value: value.toString(10)
        }
    }
    ).then(() => {
    })
}

function getTemperature() {
    request.get(conf.temperature_url).then((res) => {
        currentTemperature = res;
        notifyBridge(conf.notifications.temperature_url, 'CurrentTemperature', res);
    });
}

async function init() {
    fs.readFile('state.json', (err, data) => {
        if (!err) {
            let state = JSON.parse(data)
            systemStatus = state.systemStatus || 0
        }
        if(err) {
            console.error('vDBG', 'Load state err: ', err)
        }
      });
}

async function saveState(state) {
    fs.writeFile('state.json', JSON.stringify(state), (err) => {
        if (err) {
            console.error('vDBG', 'Store state err: ', err)
        }
      });
}

init().then(()=>{});

scheduleFan(0, 9, 25, 8)
scheduleFan(9, 22,25,3)
scheduleFan(22, 0, 20,18)
scheduleTemperatureUpdate(2)



app.listen(conf.port, () => console.log(`Example app listening on port ${conf.port}!`))
