const conf = require('./config.example')
const express = require('express')
const app = express()
const stateManager = require('./stateManager')

const scheduler = require('./scheduler')

app.get('/on', (req, res) => {
    console.log('Http ask to ON the system');
    scheduler.startSystem()
    res.send('ON')
})

app.get('/off', (req, res) => {
    console.log('Http ask to OFF the system');
    scheduler.stopSystem()
    res.send('OFF')
})

app.get('/status', (req, res) => {
    console.log('Http ask to system status')
    res.send(stateManager.systemStatus.toString(10))
})

app.get('/temperature', (req, res) => {
    if (stateManager.temperature !== null) {
        res.send(stateManager.temperature.toString(10));
        return
    }

    res.status(500).send('temperature not ready')
})

app.get('/shutter', (req, res) => {
    let angle = parseInt(req.query.angle)
    let shutter = parseInt(req.query.shutter) || 1
    console.log(`Http ask to set shutter ${shutter} to ${angle} angle`)
    if (!isNaN(angle)) {
        scheduler.setShutter(shutter, angle)
    }
    res.status(201).send();
})

app.listen(conf.port, () => console.log(`Example app listening on port ${conf.port}!`))
