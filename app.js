const conf = require('./config')
const express = require('express')
const app = express()

const request = require('request-promise')


const cron = require('node-cron')

let systemStatus = 0; // Total system status 
let fanStatus = 0; // Fan status

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
    notifyBridge(systemStatus);
    if (fanStatus === 1) {
        setDeviceStatus(1);
    }
    res.send('ON')
})

app.get('/off', (req, res) => {
    systemStatus = 0;
    console.log('Bridge ask to OFF he system');
    notifyBridge(systemStatus);
    if (fanStatus === 1) {
        setDeviceStatus(0);
    }
    res.send('OFF')
})

app.get('/status', (req, res) => {
    console.log('Bridge ask to system status');
    res.send(systemStatus.toString(10))
})

app.listen(conf.port, () => console.log(`Example app listening on port ${conf.port}!`))

////
cron.schedule('* * * * *', () => {
    let date =  Date();
    console.log(date.toString(), 'running a task every minute');
    startFan();
});

function startFan() {
    fanStatus = 1;
    if (systemStatus === 1) {
        setDeviceStatus(1);
    }
}

function stopFan() {
    fanStatus = 0;
    setDeviceStatus(0);
}

function setDeviceStatus(status) {
    let actionUrl = status ? conf.fan_on_url : conf.fan_off_url;
    if (actionUrl !== '') {
        request.get(actionUrl).then(() => { })
            .catch((err) => console.log('vDBG', 'Send to device err:', err));
    }
}

function notifyBridge(value) {
    request.post(
        conf.bridge_notification_url, {
        json: {
            characteristic: 'On',
            value: value.toString(10)
        }
    }
    ).then(() => {
        console.log('vDBG', 'Notification has beed sent');

    })
}  