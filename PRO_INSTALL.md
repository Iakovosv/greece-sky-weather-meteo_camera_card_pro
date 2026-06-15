# 🚀 Greece Sky Weather Card Pro - Complete Installation Guide

---

## 🎯 How It Works

```
[Home Assistant]
       ↓
┌─────────────────────────┐
│   Package (Data Layer)  │  ← Optional: Open-Meteo sensors
│   /config/packages/     │
└─────────────────────────┘
       ↓
┌─────────────────────────┐
│   Pro Card (UI Layer)   │  ← Visualization only
│   meteo-camera-card-pro │
└─────────────────────────┘
       ↓
   🔵 Surface Wind (always)
   🔴 Upper Wind (optional)
   ⚠️ Wind Shear (optional)
```

**Key Principle:** Card = Visualization | HA = Data providers

---

## 🟢 MODE 1: Zero Config (Works Instantly!)

### What you need:
- HACS installed card
- Any wind sensor in HA

### Card Configuration:
```yaml
type: custom:meteo-camera-card-pro
camera_entity: camera.your_camera
entities:
  wind_direction: sensor.your_wind_direction
  wind_speed: sensor.your_wind_speed
```

✅ **Result:** Card works immediately with surface wind only

---

## 🔵 MODE 2: Standard (Your Weather Station)

### What you need:
- HACS installed card
- Your weather station sensors

### Card Configuration:
```yaml
type: custom:meteo-camera-card-pro
camera_entity: camera.your_camera
camera:
  azimuth: 192
entities:
  wind_direction: sensor.gw2000a_wind_direction
  wind_speed: sensor.gw2000a_wind_speed
  wind_gust: sensor.gw2000a_wind_gust
  temperature: sensor.gw2000a_outdoor_temperature
  humidity: sensor.gw2000a_humidity
  rain: sensor.gw2000a_rain_rate
```

✅ **Result:** Full weather data from your station

---

## 🔴 MODE 3: Pro (Upper Atmosphere Wind 850 hPa)

### Step 1: Modify configuration.yaml

**File:** `/config/configuration.yaml`

Add at the END of the file:
```yaml
# Greece Sky Pro - Package System
homeassistant:
  packages: !include_dir_named packages
```

---

### Step 2: Create Package File

**File:** `/config/packages/open_meteo_850hpa.yaml`

Create this NEW file:
```yaml
# Greece Sky Pro - Upper Atmosphere Wind (850 hPa)
rest:
  - scan_interval: 900
    resource: "https://api.open-meteo.com/v1/forecast"
    params:
      latitude: "{{ state_attr('zone.home','latitude') if states('zone.home') != 'unknown' else 37.93 }}"
      longitude: "{{ state_attr('zone.home','longitude') if states('zone.home') != 'unknown' else 23.75 }}"
      current: "wind_speed_850hPa,wind_direction_850hPa"
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

---

### Step 3: Restart Home Assistant

**Required!** Go to Configuration → Server Controls → Restart

---

### Step 4: Verify Sensors

Go to Developer Tools → States

Search for:
- `sensor.upper_wind_direction_850hpa` ← Should show degrees (0-360)
- `sensor.upper_wind_speed_850hpa` ← Should show km/h

---

### Step 5: Update Your Card

```yaml
type: custom:meteo-camera-card-pro
camera_entity: camera.ds_2cd2347g3_lis2uy_sl20250220aawrfw4553650_101
camera:
  azimuth: 192
entities:
  # Surface Wind (from your station)
  wind_direction: sensor.gw2000a_wind_direction
  wind_speed: sensor.gw2000a_wind_speed
  wind_gust: sensor.gw2000a_wind_gust
  temperature: sensor.gw2000a_outdoor_temperature
  humidity: sensor.gw2000a_humidity
  rain: sensor.gw2000a_rain_rate
  # Upper Atmosphere Wind (850 hPa)
  wind_direction_850hpa: sensor.upper_wind_direction_850hpa
  wind_speed_850hpa: sensor.upper_wind_speed_850hpa
display:
  upper_wind_color: '#FF4444'
  upper_wind_scale: 0.7
  show_wind_shear: true
  wind_shear_threshold: 45
```

✅ **Result:** Blue + Red arrows + Wind Shear indicator

---

## 🔴 What You Get

| Feature | Color | Description |
|---------|-------|-------------|
| 🔵 **Surface Wind** | Blue #00BFFF | Ground-level wind from your station |
| 🔴 **Upper Wind** | Red #FF4444 | 850 hPa wind (~1500m altitude) |
| ⚠️ **Wind Shear** | Orange | Alert when difference >45° |

---

## 🎨 Visual Guide

```
┌────────────────────────────────┐
│           CAMERA               │
│                                │
│           ↓ (blue)            │  ← Surface Wind
│           ↓ (red)             │  ← Upper Wind
│                                │
│    ⚠️ Wind Shear: 65°          │  ← Only if enabled
│                                │
├────────────────────────────────┤
│ 🌡️ 24.5°C  💧 65%  💨 18km/h  │
└────────────────────────────────┘
```

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

### Problem: Card shows only blue arrow, no red arrow

**Solution:**
1. Go to Developer Tools → States
2. Search `upper_wind_direction_850hpa`
3. If not found → Package not loaded

**Check package:**
1. Configuration → Add-ons → File Editor
2. Open `/config/packages/open_meteo_850hpa.yaml`
3. Verify file exists and syntax is correct
4. Check `configuration.yaml` has `packages: !include_dir_named packages`
5. **Restart Home Assistant**

---

### Problem: Sensors show "unavailable"

**Solution:**
1. Check internet connection
2. Verify Open-Meteo API is accessible
3. Check latitude/longitude in package

**Test API manually:**
```
https://api.open-meteo.com/v1/forecast?latitude=39.62&longitude=22.42&current=wind_speed_850hPa,wind_direction_850hPa
```

---

### Problem: Package not loading

**Check 1:** `configuration.yaml` has packages enabled?
```yaml
homeassistant:
  packages: !include_dir_named packages
```

**Check 2:** File location correct?
```
/config/packages/open_meteo_850hpa.yaml
```

**Check 3:** YAML syntax errors?
- Use YAML validator
- Check indentation (spaces, not tabs)
- Check quote marks

---

### Problem: "zone.home" not found

**Solution:** The package has fallback, but you can customize.

Edit package and replace:
```yaml
latitude={{ state_attr('zone.home','latitude') if states('zone.home') != 'unknown' else 'YOUR_LAT' }}
longitude={{ state_attr('zone.home','longitude') if states('zone.home') != 'unknown' else 'YOUR_LON' }}
```

Replace `YOUR_LAT` and `YOUR_LON` with your coordinates.

**Example for your location:**
```yaml
latitude={{ '39.62' }}
longitude={{ '22.42' }}
```

---

### Problem: Wind Shear not showing

**Check:**
1. `show_wind_shear: true` is in card config
2. Both sensors have valid data
3. Shear > threshold (default 45°)

**Adjust threshold and position:**
```yaml
display:
  show_wind_shear: true
  wind_shear_threshold: 30  # Lower = more sensitive
  wind_shear_top: '85%'     # Position below arrows
  wind_shear_left: '50%'
  wind_shear_font_size: 10
  expanded_native_style: true  # Show icons in expanded view
```

---

## 📁 File Checklist

| File | Location | Required |
|------|----------|----------|
| Card | HACS install | ✅ Yes |
| `configuration.yaml` | `/config/` | ✅ For packages |
| `packages/` folder | `/config/packages/` | ✅ For 850hPa |
| `open_meteo_850hpa.yaml` | `/config/packages/` | ⚪ Optional |

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