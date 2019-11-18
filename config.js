module.exports = {
    port: 8889,
    notifications: {
        fan_url: 'http://192.168.88.229:8085/cabinet-fan-1?password=zzz',
        temperature_url: 'http://192.168.88.229:8085/outdor-temp?password=zzz',
    },
    fan_on_url: 'http://192.168.88.239/on?token=dfak9Haj',
    fan_off_url: 'http://192.168.88.239/off?token=dfak9Haj',
    temperature_url: 'http://192.168.88.239/temperature?token=dfak9Haj',
    shutter_url: 'http://192.168.88.239/shutter?token=dfak9Haj&angle=',
}