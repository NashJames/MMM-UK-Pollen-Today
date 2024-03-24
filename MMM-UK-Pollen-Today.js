Module.register('MMM-UK-Pollen-Today', {
  defaults: {
    region: 'se',
    cronSchedule: '0 6 * * *',
    showAirborneAllergens: true,
    colours: {
      NONE: '#333333',
      LOW: '#009966',
      MODERATE: '#ffde33',
      HIGH: '#ff9933',
      VERY_HIGH: '#cc0033',
      NO_DATA: '#ffffff',
    },
  },

  getStyles: function () {
    return ['main.css']
  },

  start: function () {
    const monthNum = parseInt(new Date().toISOString().slice(5, 7))
    if (monthNum > 2 && monthNum < 10) {
      Log.info(`${this.name} -> Checking Met Office...`)
      this.sendSocketNotification('SCHEDULE_POLLEN_DATA', this.config)
    }
  },

  socketNotificationReceived: function (notification) {
    if (notification === 'POLLEN_DATA_UPDATED') this.updateDom()
  },

  formatPollenData: async function () {
    try {
      const response = await fetch('/modules/MMM-UK-Pollen-Today/cache/pollen-forecast.html')
      if (!response.ok) return

      const metofficeHTML = await response.text()
      const region = this.config.region

      const htmlWrapper = document.createElement('div')
      htmlWrapper.innerHTML = metofficeHTML

      const regionElement = htmlWrapper.querySelector(`#${region}`)

      const pollenLevel = regionElement.querySelector('.icon').title
      const airbornAllergens = regionElement.querySelector(`#${region}-paras`).innerHTML.slice(4, -5)

      const textColourMap = {
        'No significant pollution': this.config.colours.NONE,
        'Low pollen': this.config.colours.LOW,
        'Moderate pollen': this.config.colours.MODERATE,
        'High pollen': this.config.colours.HIGH,
        'Very high pollen': this.config.colours.VERY_HIGH,
      }
      const pollenColour = textColourMap[pollenLevel] ?? this.config.colours.NO_DATA

      return { pollenLevel, pollenColour, airbornAllergens }
    } catch (error) {
      Log.error(`${this.name} -> ${error}`)
    }
  },

  getDom: async function () {
    const pollenData = await this.formatPollenData()
    if (!pollenData) return

    const pollenIcon = await (await fetch('/modules/MMM-UK-Pollen-Today/assets/pollen-icon.svg')).text()

    const wrapper = document.createElement('div')
    wrapper.className = 'pollen-container'

    const pollenLevel = wrapper.appendChild(document.createElement('div'))
    pollenLevel.style.color = pollenData.pollenColour
    pollenLevel.style.fill = pollenData.pollenColour
    pollenLevel.className = 'pollen-level'
    pollenLevel.innerHTML = pollenIcon

    const pollenLevelTitle = pollenLevel.appendChild(document.createElement('p'))
    pollenLevelTitle.className = 'pollen-level-title'
    pollenLevelTitle.innerHTML = pollenData.pollenLevel

    if (this.config.showAirborneAllergens) {
      const airbornAllergens = wrapper.appendChild(document.createElement('p'))
      airbornAllergens.className = 'airborne-allergens'
      airbornAllergens.innerHTML = pollenData.airbornAllergens
    }

    return wrapper
  },
})
