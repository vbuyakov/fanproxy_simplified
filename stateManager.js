const Rx = require('rxjs')
const fs =  require('fs')

class StateManager {
    constructor() {
        this.state = {
            systemStatus: 0,
            temperature: null,
            schedule: [],
        }
        this.stateIsReady = false

        this.systemStatusSubject = new Rx.Subject()
        this.scheduleSubject = new Rx.Subject()
        this.ventModeSubject = new Rx.Subject()
        this.loadStateFromFile()

    }

    sendStateToFirebase() {
        //TODO: Implement
        console.log('This will send state to FB', this.state )
    }

    sendTemperatureToFirebase() {
        //TODO: Implement
        console.log('This will send temperature to FB', this.temperature )
    }

    updateState() {
        if(!this.stateIsReady) {
            return
        }
        this.saveStateToFile()
        this.sendStateToFirebase()
    }

    set systemStatus(newVal) {
        this.state.systemStatus = newVal
        this.updateState()
    }

    get systemStatus() {
        return this.state.systemStatus
    }

    get temperature() {
        return this.state.temerature
    }

    set temperature(newVal) {
        this.state.temerature = newVal
        this.sendTemperatureToFirebase()
    }

    loadStateFromFile() {
        fs.readFile('state.json', (err, data) => {
            if (!err) {
                let state = JSON.parse(data)
                this.state.systemStatus = state.systemStatus || 0
                this.systemStatusSubject.next(this.state.systemStatus)
                this.state.schedule = state.schedule || []
                this.stateIsReady = true
                this.scheduleSubject.next(this.state.schedule)
            }
            if(err) {
                console.error('Last state error: ', err)
            }
        });
    }

    saveStateToFile() {
        fs.writeFile('state.json', JSON.stringify(this.state), (err) => {
            if (err) {
                console.error('Error while store the state: ', err)
            }
        });
    }

}
module.exports = new StateManager();
