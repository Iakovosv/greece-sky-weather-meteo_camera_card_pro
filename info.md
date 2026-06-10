# Greece Sky and Weather Card

A production-ready Home Assistant Lovelace card with weather overlay, wind visualization, and plugin system.

## Features

- 🎥 Live camera stream with weather overlay
- 💨 Rotating wind arrow with smooth 60fps animation
- 🌡️ Temperature, humidity, pressure, rain display
- ⚡ Gust detection with visual alerts
- 🔌 Extensible plugin system
- 🎨 Multiple themes and customization options

## Installation

### HACS (Recommended)

1. Search for "Greece Sky" in HACS
2. Click Install
3. Add to your dashboard

### Manual

1. Copy `meteo-camera-card.js` to `/config/www/`
2. Add resource in Home Assistant:
   - Settings → Dashboards → Resources
   - Add: `/local/meteo-camera-card.js` as Module

## Usage

```yaml
type: custom:meteo-camera-card
camera_entity: camera.your_camera
entities:
  temperature: sensor.temperature
  humidity: sensor.humidity
  wind_speed: sensor.wind_speed
  wind_direction: sensor.wind_direction
  wind_gust: sensor.wind_gust
  rain: sensor.rain
camera:
  azimuth: 0
```

## Configuration

See full documentation at [GitHub](https://github.com/your-repo/meteo-camera-card)

## Support

For issues and feature requests, open a GitHub issue.

---

**Author:** Iakovos Venieris  
**Version:** 3.2