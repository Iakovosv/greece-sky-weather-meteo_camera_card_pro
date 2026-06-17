# 🌤️ Greece Sky and Weather Card Pro v4.1

**by Iakovos Venieris** - Home Assistant Lovelace Card

---

## v4.1 Features

| Feature | Description |
|---------|-------------|
| 🎯 **Click to Expand** | Click card to see full-size camera image |
| 📍 **Arrow Position** | Full control: top, left, right, bottom |
| 🧭 **Azimuth Position** | Full control: top, right, left, bottom |
| 🧭 **Compass North** | Red needle always points North (N) |
| 📐 **Wind Direction** | Arrow shows WHERE wind is going (360°) |
| 📐 **Data Size** | small / medium / large |
| 📷 **Show/Hide Camera** | Toggle camera visibility |
| 🔴 **Upper Atmosphere Wind** | 850 hPa wind direction arrow (optional) |
| ⚠️ **Wind Shear Indicator** | Alert when wind direction differs significantly |
| 📍 **Location Override** | Per-card location for multi-camera setups |

---

## How It Works

### 🧭 Compass (Azimuth)
- Red half of needle **always points North**
- Use `camera.azimuth` to set your camera direction

### 🔽 Wind Arrow
- Shows **WHERE the wind is going** (opposite of wind source)
- Respects your camera azimuth for accurate positioning
- Full 360° rotation based on wind direction

**Example:**
- Wind from North (0°) → Arrow points South (towards the sea/south)
- Camera looking South-West (250°) → Arrow adjusts accordingly

### 📊 Wind Label
- Shows direction: Β, ΒΑ, Α, ΝΑ, Ν, ΝΔ, Δ, ΒΔ (and intermediate)
- 16 directions (every 22.5°)

---

## 🔴 Upper Atmosphere Wind (850 hPa)

The card supports displaying **Upper Atmosphere Wind** at the 850 hPa pressure level (~1500m above sea level).

### 🧠 Architecture

The card follows a clean 3-layer architecture:

| Layer | Description |
|-------|-------------|
| **Data Layer** | HA entities (sensors) |
| **Meteorology Layer** | Calculations (wind shear) - NO camera awareness |
| **Visualization Layer** | Arrow rendering - camera-aware |

### 🔽 Wind Arrows

| Arrow | Color | Description |
|-------|-------|-------------|
| 🔵 **Surface Wind** | #00BFFF (blue) | Ground-level wind from weather station |
| 🔴 **Upper Atmosphere** | #FF4444 (red) | 850 hPa wind (~1500m altitude) |

### ⚠️ Wind Shear

Wind shear is calculated as the **meteorological difference** between surface and 850 hPa wind directions:

```
shear = |surfaceDir - upperDir| (using shortest path)
```

**NOT** the visual difference between arrows in the card.

---

## 🚀 Pro Installation

For **Upper Atmosphere Wind (850 hPa)** features, see:
👉 **[PRO_INSTALL.md](./PRO_INSTALL.md)** - Full installation guide

Quick setup:
1. Install from HACS
2. Add card (works instantly!)
3. Optional: Add package for 850hPa wind

---

## Installation

### HACS (Recommended)
Search "Greece Sky" in HACS → Install

### Manual
1. Copy `meteo-camera-card.js` to `/config/www/`
2. Settings → Dashboards → Resources → Add
   - URL: `/local/meteo-camera-card.js`
   - Type: module

---

## Quick Start

```yaml
type: custom:meteo-camera-card
camera_entity: camera.your_camera
entities:
  wind_direction: sensor.wind_direction
  wind_speed: sensor.wind_speed
  wind_gust: sensor.wind_gust
  temperature: sensor.temperature
  humidity: sensor.humidity
camera:
  azimuth: 250  # Camera direction (0-360°)
display:
  arrow_color: '#00BFFF'
```

---

## Configuration Options

### 📍 Camera

| Option | Default | Description |
|--------|---------|-------------|
| `camera_entity` | - | Camera entity |
| `camera.azimuth` | 0 | Camera direction (0-360°, 0=North) |

### 🔽 Arrow (Wind Direction)

| Option | Default | Description |
|--------|---------|-------------|
| `display.arrow_color` | #00BFFF | Arrow color |
| `display.arrow_size` | 50 | Arrow length (px) |
| `display.arrow_top` | 20% | Vertical position |
| `display.arrow_left` | 50% | Horizontal position |

### 🧭 Azimuth (Compass)

| Option | Default | Description |
|--------|---------|-------------|
| `display.show_azimuth` | true | Show compass |
| `display.azimuth_size` | 50 | Compass size (px) |
| `display.azimuth_top` | 12px | Vertical position |
| `display.azimuth_right` | 12px | Horizontal position |

### 📊 Data Panel

| Option | Default | Description |
|--------|---------|-------------|
| `display.data_size` | medium | small / medium / large |
| `display.panel_opacity` | 0.75 | Background opacity |

### 📷 Camera Display

| Option | Default | Description |
|--------|---------|-------------|
| `display.show_camera` | true | Show/hide camera |
| `display.click_to_expand` | true | Click to enlarge |

### 🎨 General

| Option | Default | Description |
|--------|---------|-------------|
| `display.card_height` | 280px | Card height |
| `display.gust_threshold` | 2.0 | Gust alert threshold |
| `display.temperature_unit` | °C | Temperature unit |
| `display.speed_unit` | km/h | Speed unit |

### 🔴 Upper Atmosphere Wind

| Option | Default | Description |
|--------|---------|-------------|
| `entities.wind_direction_850hpa` | - | 850 hPa wind direction sensor (optional) |
| `entities.wind_speed_850hpa` | - | 850 hPa wind speed sensor (optional) |
| `display.upper_wind_color` | #FF4444 | Upper wind arrow color |
| `display.upper_wind_scale` | 0.7 | Upper arrow size (relative to main) |
| `display.show_wind_shear` | false | Show wind shear indicator |
| `display.wind_shear_threshold` | 45 | Degrees threshold for shear alert |
| `display.wind_shear_top` | 65% | Vertical position of wind shear |
| `display.wind_shear_left` | 50% | Horizontal position of wind shear |
| `display.wind_shear_font_size` | 11 | Font size for wind shear text |
| `display.expanded_native_style` | true | Show icons in expanded view |

### 📍 Location Override

| Option | Default | Description |
|--------|---------|-------------|
| `location.latitude` | HA config | Override latitude (optional) |
| `location.longitude` | HA config | Override longitude (optional) |

---

## Examples

### Weather Station with Camera
```yaml
type: custom:meteo-camera-card
camera_entity: camera.front_door
camera:
  azimuth: 250
display:
  arrow_color: '#00BFFF'
  arrow_size: 60
  show_azimuth: true
  azimuth_size: 45
  data_size: 'medium'
  click_to_expand: true
entities:
  wind_direction: sensor.wind_direction
  wind_speed: sensor.wind_speed
  wind_gust: sensor.wind_gust
  temperature: sensor.temperature
  humidity: sensor.humidity
```

### Compact Weather Display
```yaml
type: custom:meteo-camera-card
camera:
  azimuth: 180
display:
  show_camera: false
  data_size: 'large'
  card_height: '150px'
entities:
  wind_direction: sensor.wind_direction
  wind_speed: sensor.wind_speed
  temperature: sensor.temperature
```

### Weather Station with Upper Atmosphere Wind
```yaml
type: custom:meteo-camera-card
camera_entity: camera.front_door
camera:
  azimuth: 250
display:
  arrow_color: '#00BFFF'
  upper_wind_color: '#FF4444'
  upper_wind_scale: 0.7
  show_wind_shear: true
  wind_shear_threshold: 45
  wind_shear_top: '85%'          # Position below arrows
  wind_shear_left: '50%'
  wind_shear_font_size: 10
  expanded_native_style: true    # Show icons in expanded view
entities:
  wind_direction: sensor.wind_direction
  wind_speed: sensor.wind_speed
  wind_gust: sensor.wind_gust
  temperature: sensor.temperature
  humidity: sensor.humidity
  # Upper Atmosphere Wind (850 hPa)
  wind_direction_850hpa: sensor.wind_direction_850hpa
  wind_speed_850hpa: sensor.wind_speed_850hpa
```

### Multi-Camera Dashboard (Location Override)
```yaml
# Athens Camera
type: custom:meteo-camera-card
camera_entity: camera.athens
location:
  latitude: 37.93
  longitude: 23.75
entities:
  wind_direction: sensor.athens_wind_direction
  wind_direction_850hpa: sensor.athens_850hpa_direction

# Thessaloniki Camera
type: custom:meteo-camera-card
camera_entity: camera.thessaloniki
location:
  latitude: 40.64
  longitude: 22.94
entities:
  wind_direction: sensor.thessaloniki_wind_direction
  wind_direction_850hpa: sensor.thessaloniki_850hpa_direction
```

---

## Performance Modes

```yaml
# Normal mode (default)
performance_mode: normal

# Low-power mode (1 update/second)
performance_mode: low-power
```

## ☕ Support the Project
If you find these tools valuable, you can support "Greece Sky and Weather" by buying me a coffee. Your contributions help me spend more time developing advanced tools for the community!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/greeceskyandweather)



---


## ⚖️ License

© Iakovos Venieris - All Rights Reserved

⛔ **STRICTLY PROHIBITED:**
* **Commercial use** without prior written permission.
* **Modification** of the code.
* **Redistribution** or incorporation into other projects.

📧 **For licensing inquiries:** Please contact the creator.
Email: greekskyweather@gmai.com

**v4.1 Pro** - Greece Sky · Iakovos Venieris
