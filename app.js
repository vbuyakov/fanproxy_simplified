const conf = require('./config')
const express = require('express')
const app = express()
const fillTemplate = require('es6-dynamic-template')

const request = require('request-promise')
const fs =  require('fs').promises



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
    console.log('vDBG', 'angle', angle);
    if (!isNaN(angle)) {
        setShutter(shutter, angle)
    }
    res.status(201).send();
})

////
function scheduleFan(fromH, toH, startPeriod, workingPeriod) {
    return cron.schedule(`*/${startPeriod} ${fromH}-${toH - 1} * * *`, () => {
        let date = Date()
        startFan(workingPeriod)
        console.log(date.toString(), `running a task every ${startPeriod} m for ${workingPeriod} from ${fromH} to ${toH}`);
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
    console.log('vDBG', 'Start Fan');

    fanStatus = 1;
    if (systemStatus === 1) {
        setDeviceStatus(1)
    }
    setTimeout(function () {
        stopFan();
    }, workingPeriod * 60000)
}

function stopFan() {
    console.log('vDBG', 'Stop fan');

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
        .then(res => console.log('vDBG', `Shutter was rotated to ${angle}`))
}

function setDeviceStatus(status) {
    let actionUrl = status ? conf.fan_on_url : conf.fan_off_url;
     console.log('vDBG', 'actionUrl', actionUrl);
    if (actionUrl !== '') {
        request.get(actionUrl).then(() => { })
            .catch((err) => console.log('vDBG', 'Send to device err:', err));
    }
}

function notifyBridge(uri, characteristic, value) {
    request.post(
        uri, {
        json: {
            characteristic: characteristic,
            value: value.toString(10)
        }
    }
    ).then(() => {
        console.log('vDBG', `Notification to ${uri} with ${value} has beed sent`);
    })
}

function getTemperature() {
    request.get(conf.temperature_url).then((res) => {
        console.log('vDBG', 'temperature', res);
        currentTemperature = res;
        notifyBridge(conf.notifications.temperature_url, 'CurrentTemperature', res);
    });
}

async function init() {
    let filehandle
    try {
        let filehandle = await fs.open('state.json', 'r')
        let state = JSON.parse(await filehandle.readFile())
        systemStatus = state.systemStatus || 0
    } catch(err) {
    //
    }
    finally {
        if (filehandle !== undefined) {
            await filehandle.close()
        }
    }
}

async function saveState(state) {
    let filehandle
    try {
        let filehandle = await fs.open('state.json', 'w')
        await filehandle.writeFile(JSON.stringify(state))
    } catch(err) {
        console.log('vDBG', 'Store state err: ', err)
    } finally {
        if (filehandle !== undefined) {
            await filehandle.close()
        }
    }
}

init().then(()=>{});

scheduleFan(0, 1, 40, 5)
scheduleFan(1, 6, 30, 5)
scheduleFan(6, 9, 20, 5)
scheduleFan(9, 16, 20, 10)
scheduleFan(16, 19, 30, 9)
scheduleFan(19, 0, 40, 10)
scheduleTemperatureUpdate(2)



app.listen(conf.port, () => console.log(`Example app listening on port ${conf.port}!`))
