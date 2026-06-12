# 🚀 Greece Sky Weather Card Pro - Installation Guide

## Quick Start (Zero Config)

### 1. Install from HACS
Search "Greece Sky" in HACS → Install **Greece Sky and Weather Card Pro**

### 2. Add Card
```yaml
type: custom:meteo-camera-card-pro
camera_entity: camera.your_camera
entities:
  wind_direction: sensor.your_wind_direction
  wind_speed: sensor.your_wind_speed
```

✅ **Done!** - The card works immediately with surface wind.

---

## Pro Features (Optional)

### Upper Atmosphere Wind (850 hPa)

#### Step 1: Create Package File

Create `/config/packages/open_meteo_850hpa.yaml` with this content:

```yaml
# Greece Sky Pro - Open-Meteo 850hPa Package
rest:
  - resource_template: >-
      https://api.open-meteo.com/v1/forecast
      ?latitude={{ state_attr('zone.home','latitude') if states('zone.home') != 'unknown' else '37.93' }}
      &longitude={{ state_attr('zone.home','longitude') if states('zone.home') != 'unknown' else '23.75' }}
      &current=wind_speed_850hPa,wind_direction_850hPa
    scan_interval: 900
    sensor:
      - name: "Upper Wind Direction 850hPa"
        unique_id: upper_wind_direction_850hpa
        unit_of_measurement: "°"
        icon: mdi:weather-windy-variant
        value_template: "{{ value_json.current.wind_direction_850hPa | default(0) }}"
      - name: "Upper Wind Speed 850hPa"
        unique_id: upper_wind_speed_850hpa
        unit_of_measurement: "km/h"
        icon: mdi:weather-windy
        value_template: "{{ value_json.current.wind_speed_850hPa | default(0) }}"
```

#### Step 2: Enable Packages

Add to your `configuration.yaml`:
```yaml
homeassistant:
  packages: !include_dir_named packages
```

#### Step 3: Restart Home Assistant

Wait for sensors to appear in Developer Tools → States:
- `sensor.upper_wind_direction_850hpa`
- `sensor.upper_wind_speed_850hpa`

#### Step 4: Update Your Card

```yaml
type: custom:meteo-camera-card-pro
camera_entity: camera.your_camera
camera:
  azimuth: 180
entities:
  wind_direction: sensor.your_wind_direction
  wind_speed: sensor.your_wind_speed
  # Upper Atmosphere Wind (850 hPa)
  wind_direction_850hpa: sensor.upper_wind_direction_850hpa
  wind_speed_850hpa: sensor.upper_wind_speed_850hpa
display:
  upper_wind_color: '#FF4444'
  upper_wind_scale: 0.7
  show_wind_shear: true
  wind_shear_threshold: 45
```

---

## 🔴 What You Get

| Feature | Description |
|---------|-------------|
| 🔵 **Surface Wind** | Blue arrow - ground-level wind from your station |
| 🔴 **Upper Wind** | Red arrow - 850 hPa wind (~1500m altitude) |
| ⚠️ **Wind Shear** | Orange indicator when direction differs >45° |

---

## 🧭 Card Modes

### Mode 1: Basic (Zero Config)
```yaml
type: custom:meteo-camera-card-pro
camera_entity: camera.front_door
entities:
  wind_direction: sensor.wind_direction
```
→ Shows surface wind only, works instantly

### Mode 2: Pro (Full Features)
```yaml
type: custom:meteo-camera-card-pro
camera_entity: camera.front_door
entities:
  wind_direction: sensor.wind_direction
  wind_direction_850hpa: sensor.upper_wind_direction_850hpa
display:
  show_wind_shear: true
```
→ Shows both arrows + shear indicator

---

## 📍 Location Override (Multi-Camera)

For different locations per camera:

```yaml
# Athens Camera
type: custom:meteo-camera-card-pro
camera_entity: camera.athens
location:
  latitude: 37.93
  longitude: 23.75
entities:
  wind_direction_850hpa: sensor.athens_850hpa

# Thessaloniki Camera
type: custom:meteo-camera-card-pro
camera_entity: camera.thessaloniki
location:
  latitude: 40.64
  longitude: 22.94
entities:
  wind_direction_850hpa: sensor.thessaloniki_850hpa
```

---

## ⚠️ Troubleshooting

### Card not showing upper wind?
1. Check sensors exist: Developer Tools → States → `upper_wind_direction_850hpa`
2. If not found, restart Home Assistant after adding package
3. Check package syntax in `/config/packages/open_meteo_850hpa.yaml`

### Package not loading?
1. Verify `packages: !include_dir_named packages` is in `configuration.yaml`
2. Check YAML indentation
3. Restart Home Assistant

### Location fallback?
If `zone.home` doesn't exist, defaults to:
- Latitude: 37.93
- Longitude: 23.75

To customize, edit the template in the package file.

---

## 🎯 Architecture

```
[Home Assistant]
    ↓
Sensors (optional)
    ↓
[Pro Card]
    ↓
Surface Wind Layer (blue)
Upper Wind Layer (red)
Wind Shear Layer (orange)
    ↓
Camera Overlay
```

**Card = Visualization only | HA = Data providers**

---

## 📦 Files

| File | Location | Purpose |
|------|----------|---------|
| Card JS | `/www/community/meteo-camera-card-pro/` | HACS install |
| Package | `/config/packages/open_meteo_850hpa.yaml` | Data layer |

---

**v4.1 Pro** - Greece Sky · Iakovos Venieris