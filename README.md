# 🌤️ Greece Sky and Weather Card v4.0

**by Iakovos Venieris** - Home Assistant Lovelace Card

**Production-Ready with Plugin Isolation & HACS-Submission Ready**

---

## v4.0 Changes (New Features)

| Feature | Description |
|---------|-------------|
| 🎯 **Click to Expand** | Click card to see full-size camera image |
| 📍 **Arrow Position** | Full control: top, left, right, bottom |
| 🧭 **Azimuth Position** | Full control: top, right, left, bottom |
| 📐 **Data Size** | small / medium / large |
| 📷 **Show/Hide Camera** | Toggle camera visibility |
| 📐 **Azimuth Size** | Customizable compass size |

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
  azimuth: 250
display:
  arrow_color: '#00BFFF'
```

---

## Display Options

### 🔽 Arrow (Wind Direction Indicator)

| Option | Default | Description |
|--------|---------|-------------|
| `display.arrow_color` | #00BFFF | Arrow color (CSS color) |
| `display.arrow_size` | 50 | Arrow length (px) |
| `display.arrow_top` | 20% | Vertical position |
| `display.arrow_left` | 50% | Horizontal position |

**Examples:**
```yaml
display:
  arrow_color: '#FF6B6B'
  arrow_size: 80
  arrow_top: '30%'
  arrow_left: '25%'
```

### 🧭 Azimuth (Compass)

| Option | Default | Description |
|--------|---------|-------------|
| `display.show_azimuth` | true | Show/hide compass |
| `display.azimuth_size` | 50 | Compass diameter (px) |
| `display.azimuth_top` | 12px | Vertical position |
| `display.azimuth_right` | 12px | Horizontal position |

### 📊 Data Panel

| Option | Default | Description |
|--------|---------|-------------|
| `display.data_size` | medium | small / medium / large |
| `display.panel_opacity` | 0.75 | Background opacity |

### 📷 Camera

| Option | Default | Description |
|--------|---------|-------------|
| `display.show_camera` | true | Show/hide camera image |
| `display.click_to_expand` | true | Click to expand image |

### 🎨 General

| Option | Default | Description |
|--------|---------|-------------|
| `display.card_height` | 280px | Card height |
| `display.gust_threshold` | 2.0 | Gust alert threshold |

---

## Complete Configuration Example

```yaml
type: custom:meteo-camera-card
camera_entity: camera.front_door
camera:
  azimuth: 250
display:
  arrow_color: '#00BFFF'
  arrow_size: 60
  arrow_top: '25%'
  arrow_left: '50%'
  show_azimuth: true
  azimuth_size: 45
  azimuth_top: '15px'
  azimuth_right: '15px'
  data_size: 'medium'
  show_camera: true
  click_to_expand: true
  card_height: '300px'
entities:
  wind_direction: sensor.wind_direction
  wind_speed: sensor.wind_speed
  temperature: sensor.temperature
  humidity: sensor.humidity
```

---

## Compact Card (No Camera)

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

---

**v4.0** - Greece Sky · Iakovos Venieris
