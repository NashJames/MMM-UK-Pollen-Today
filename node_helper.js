const fs = require('fs')
const util = require('util')
const Log = require('logger')
const { CronJob } = require('cron')
const { create } = require('node_helper')
const sanitizeHtml = require('sanitize-html')

const writeFileAsync = util.promisify(fs.writeFile)

const URL = 'https://www.metoffice.gov.uk/weather/warnings-and-advice/seasonal-advice/pollen-forecast'
const NO_DATA_STRING = 'We are currently out of pollen season. The pollen forecast will return in March.'
// const TEST_URL = 'https://web.archive.org/web/20230807152747/https://www.metoffice.gov.uk/weather/warnings-and-advice/seasonal-advice/pollen-forecast'

module.exports = create({
  socketNotificationReceived: async function (notification, payload) {
    if (notification === 'SCHEDULE_POLLEN_DATA') {
      new CronJob(payload.cronSchedule, () => this.getPollen(), null, false, 'Europe/London', null, true)
    }
  },

  getPollen: async function () {
    try {
      const response = await fetch(URL, { method: 'GET', headers: { 'Content-Type': 'text/html' } })
      const metofficeHTML = sanitizeHtml(await response.text(), {
        allowedAttributes: { div: ['id'], span: ['class', 'title'] },
      })

      if (metofficeHTML.includes(NO_DATA_STRING)) {
        Log.info(`${this.name} -> Looks like we're not in pollen season!`)
        return
      }

      await writeFileAsync('./modules/MMM-UK-Pollen-Today/cache/pollen-forecast.html', metofficeHTML)

      Log.info(`${this.name} -> Pollen data sucessfully updated!`)
      this.sendSocketNotification('POLLEN_DATA_UPDATED')
    } catch (err) {
      Log.error(`${this.name} -> ${err}`)
    }
  },
})
