/**
 * Greece Sky and Weather Card v4.0
 * A Home Assistant Lovelace Card by Iakovos Venieris
 * 
 * Architecture: Production-Ready with Plugin Isolation & Performance Modes
 * 
 * v4.0 Changes:
 * - Plugin isolation sandbox (exception handling + health monitoring)
 * - Scoped exports (no global pollution)
 * - Performance modes (low-power option)
 * - Single source distribution (/dist/)
 * - Error resilience in all lifecycle hooks
 * - HACS submission ready
 * 
 * @version 3.3
 */

// ============================================
// SCOPED EXPORTS (no pollution)
// ============================================

const MeteoCard = {
  version: '4.0',
  name: 'meteo-camera-card',
};

// ============================================
// EVENT BUS (plugin communication)
// ============================================

class EventBus {
  constructor() {
    this._listeners = new Map();
    this._maxListeners = 50;
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    const listeners = this._listeners.get(event);
    if (listeners.size >= this._maxListeners) {
      console.warn('EventBus: Max listeners reached for', event);
      return () => {};
    }
    listeners.add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this._listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    
    for (const cb of listeners) {
      try {
        cb(data);
      } catch (e) {
        console.error(`EventBus error on ${event}:`, e.message);
      }
    }
  }

  clear() {
    this._listeners.clear();
  }
}

// ============================================
// PLUGIN REGISTRY (class-based, safe)
// ============================================

class PluginRegistry {
  constructor() {
    this._plugins = new Map();
  }

  register(PluginClass) {
    const name = PluginClass.pluginName;
    if (!name) {
      throw new Error('Plugin must have static pluginName');
    }
    if (this._plugins.has(name)) {
      console.warn(`Plugin ${name} already registered, skipping`);
      return;
    }
    this._plugins.set(name, PluginClass);
  }

  create(name, config = {}) {
    const PluginClass = this._plugins.get(name);
    if (!PluginClass) return null;
    return new PluginClass(config);
  }

  list() {
    return Array.from(this._plugins.keys());
  }

  has(name) {
    return this._plugins.has(name);
  }
}

// Global registry (internal)
const _registry = new PluginRegistry();

// ============================================
// PLUGIN BASE CLASS (with lifecycle + isolation)
// ============================================

class MeteoPlugin {
  static pluginName = 'base';
  
  constructor(config = {}) {
    this.config = config;
    this._host = null;
    this._eventBus = null;
    this._enabled = true;
    this._health = { errors: 0, lastError: null, disabled: false };
    this._maxErrors = 3; // Disable after 3 errors
  }

  // === LIFECYCLE HOOKS (with error isolation) ===

  onInit(registry) {
    this._safeCall('onInit', () => {});
  }

  onConfig(config, prevConfig) {
    this._safeCall('onConfig', () => {
      // Override in subclass
    }, config, prevConfig);
  }

  onHass(hass) {
    this._safeCall('onHass', () => {
      // Override in subclass
    }, hass);
  }

  onUpdate(cache, config) {
    if (this._health.disabled) return;
    this._safeCall('onUpdate', () => {
      // Override in subclass
    }, cache, config);
  }

  onDestroy() {
    this._safeCall('onDestroy', () => {
      // Override in subclass
    });
  }

  // === SAFE CALL HELPER ===

  _safeCall(method, fn, ...args) {
    try {
      fn(...args);
    } catch (e) {
      this._health.errors++;
      this._health.lastError = { message: e.message, time: Date.now() };
      
      console.error(`Plugin ${this.constructor.pluginName}.${method} error:`, e.message);
      
      // Disable plugin after max errors
      if (this._health.errors >= this._maxErrors) {
        this._health.disabled = true;
        console.warn(`Plugin ${this.constructor.pluginName} disabled due to ${this._maxErrors} errors`);
      }
    }
  }

  // === PLUGIN LIFECYCLE ===

  attach(host, eventBus) {
    this._host = host;
    this._eventBus = eventBus;
    this._health = { errors: 0, lastError: null, disabled: false };
    this.onInit?.(_registry);
  }

  detach() {
    this.onDestroy?.();
    this._host = null;
    this._eventBus = null;
  }

  update(cache, config) {
    if (this._health.disabled || !this._enabled) return;
    this.onUpdate?.(cache, config);
  }

  // === HELPERS ===

  get shadow() { return this._host?.shadowRoot; }
  query(selector) { return this.shadow?.querySelector(selector); }
  emit(event, data) { this._eventBus?.emit(event, data); }
  on(event, callback) { return this._eventBus?.on(event, callback); }
  get hass() { return this._host?._hass; }
  get cache() { return this._host?._cache; }

  enable() { this._enabled = true; }
  disable() { this._enabled = false; this._health.disabled = true; }
  
  getHealth() { return { ...this._health }; }
  isHealthy() { return !this._health.disabled; }
}

// ============================================
// WIND ENGINE (EMA + time-weighted)
// ============================================

class WindEngine {
  constructor() {
    this._dirHistory = [];
    this._speedHistory = [];
    this._gustHistory = [];
    this._maxHistory = 10;
    this._alpha = 0.3;
  }

  // EMA helper
  ema(value, prev, alpha = this._alpha) {
    if (prev === null) return value;
    return alpha * value + (1 - alpha) * prev;
  }

  // Direction with circular mean + EMA
  smoothDirection(deg, timestamp) {
    if (deg === null) return null;

    this._dirHistory.push({ value: deg, time: timestamp });
    this._cleanHistory(this._dirHistory);

    const len = this._dirHistory.length;
    if (len === 0) return null;

    let sinEma = 0, cosEma = 0;
    
    if (len > 1) {
      const prev = this._dirHistory[len - 2];
      const cur = this._dirHistory[len - 1];
      
      const toRad = d => (d * Math.PI) / 180;
      sinEma = this.ema(Math.sin(toRad(cur.value)), Math.sin(toRad(prev.value)));
      cosEma = this.ema(Math.cos(toRad(cur.value)), Math.cos(toRad(prev.value)));
    } else {
      const rad = (deg * Math.PI) / 180;
      sinEma = Math.sin(rad);
      cosEma = Math.cos(rad);
    }

    return Math.atan2(sinEma, cosEma) * (180 / Math.PI);
  }

  // Speed with EMA
  smoothSpeed(speed, timestamp) {
    if (speed === null) return null;

    this._speedHistory.push({ value: speed, time: timestamp });
    this._cleanHistory(this._speedHistory);

    if (this._speedHistory.length === 0) return null;
    
    const last = this._speedHistory[this._speedHistory.length - 1];
    const prev = this._speedHistory.length > 1 
      ? this._speedHistory[this._speedHistory.length - 2].value 
      : null;

    return this.ema(speed, prev);
  }

  // Time-aware gust detection
  detectGust(rawSpeed, timestamp, threshold) {
    if (rawSpeed === null) return false;

    this._gustHistory.push({ value: rawSpeed, time: timestamp });
    this._cleanHistory(this._gustHistory, 30000);

    if (this._gustHistory.length < 3) return false;

    // Time-weighted rolling average (exclude current)
    const now = timestamp;
    let sum = 0, weights = 0;
    
    this._gustHistory.slice(0, -1).forEach(entry => {
      const age = (now - entry.time) / 1000;
      const weight = Math.max(0.5, 1 - (age / 60));
      sum += entry.value * weight;
      weights += weight;
    });

    const avg = sum / weights;
    return (rawSpeed - avg) > threshold;
  }

  _cleanHistory(history, maxAge = 60000) {
    const now = Date.now();
    while (history.length > 0 && (now - history[0].time) > maxAge) history.shift();
    while (history.length > this._maxHistory) history.shift();
  }

  normalize(deg) { return ((deg % 360) + 360) % 360; }

  shortestDiff(from, to) {
    let diff = to - from;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }

  reset() {
    this._dirHistory = [];
    this._speedHistory = [];
    this._gustHistory = [];
  }
}

// ============================================
// BUILT-IN ALERT PLUGIN (with isolation)
// ============================================

class AlertPlugin extends MeteoPlugin {
  static pluginName = 'alerts';

  constructor(config = {}) {
    super(config);
    this._alertTimeout = null;
    this._lastAlertTime = 0;
    this._cooldown = config.cooldown || 3000;
  }

  onUpdate(cache, config) {
    const gustThreshold = config?.display?.gust_threshold || 2.0;
    const windSpeed = cache?.windSpeed;
    const now = Date.now();

    if (now - this._lastAlertTime < this._cooldown) return;

    // Gust alert
    if (cache?.windSpeedDelta > gustThreshold) {
      this._showAlert('⚡ ΡΙΠΗ ΑΝΕΜΟΥ');
      this._lastAlertTime = now;
    }

    // Rain alert
    const rainThreshold = this.config?.rain_alert_threshold || 1;
    if (cache?.rain !== null && cache.rain > rainThreshold) {
      this._showAlert('🌧️ ΒΡΟΧΗ');
      this._lastAlertTime = now;
    }
  }

  _showAlert(message) {
    try {
      const el = this.query('.gust-alert');
      if (!el) return;
      el.textContent = message;
      el.classList.add('show');
      clearTimeout(this._alertTimeout);
      this._alertTimeout = setTimeout(() => el.classList.remove('show'), 2500);
    } catch (e) {
      // Silently fail - plugin isolation
    }
  }

  onDestroy() {
    clearTimeout(this._alertTimeout);
  }
}

_registry.register(AlertPlugin);

// ============================================
// MAIN CARD CLASS
// ============================================

class MeteoCameraCard extends HTMLElement {
  constructor() {
    super();

    // === CORE STATE ===
    this._hass = null;
    this._config = null;
    this._rendered = false;
    this._running = false;

    // === DOM REFS ===
    this._refs = {};

    // === ANIMATION STATE ===
    this._arrowAngle = 0;
    this._targetAngle = 0;
    this._smoothSpeed = 0.08;
    this._rafId = null;

    // === PERFORMANCE MODE ===
    this._perfMode = 'normal'; // normal | low-power
    this._pollThrottle = 1000; // ms between polls in low-power
    this._lastPoll = 0;

    // === STATE CACHE ===
    this._cache = {};
    this._prevCache = {};

    // === ENGINES ===
    this._windEngine = new WindEngine();
    this._eventBus = new EventBus();

    // === PLUGINS ===
    this._pluginInstances = new Map();

    // Create shadow DOM
    this.attachShadow({ mode: 'open' });
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  disconnectedCallback() {
    this._running = false;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Cleanup camera blob
    if (this._cameraBlobUrl) {
      URL.revokeObjectURL(this._cameraBlobUrl);
      this._cameraBlobUrl = null;
    }

    // Detach all plugins
    this._pluginInstances.forEach(plugin => {
      try { plugin.detach(); } catch (e) { /* ignore */ }
    });
    this._pluginInstances.clear();

    // Cleanup
    this._windEngine.reset();
    this._eventBus.clear();
    this._hass = null;
    this._rendered = false;
    this._refs = {};
    this._cache = {};
    this._prevCache = {};
  }

  setConfig(config) {
    if (!config.camera_entity) {
      throw new Error('camera_entity is required');
    }

    const d = config.display || {};
    const prevConfig = this._config;

    // Performance mode
    if (config.performance_mode) {
      this._perfMode = config.performance_mode;
    }

    this._config = {
      camera_entity: config.camera_entity,
      camera_image_url: config.camera_image_url,
      entities: {
        temperature: config.entities?.temperature || null,
        humidity: config.entities?.humidity || null,
        wind_speed: config.entities?.wind_speed || null,
        wind_direction: config.entities?.wind_direction || null,
        wind_gust: config.entities?.wind_gust || null,
        rain: config.entities?.rain || null,
        pressure: config.entities?.pressure || null,
      },
      camera: {
        azimuth: config.camera?.azimuth || 0,
        show_compass: config.camera?.show_compass !== false,
        camera_proxy: config.camera?.camera_proxy !== false,
      },
      display: {
        temperature_unit: d.temperature_unit || '°C',
        speed_unit: d.speed_unit || 'km/h',
        arrow_color: d.arrow_color || '#00BFFF',
        arrow_size: d.arrow_size || 50,
        arrow_top: d.arrow_top || '20%',      // Vertical position
        arrow_left: d.arrow_left || '50%',    // Horizontal position
        panel_opacity: d.panel_opacity || 0.75,
        card_height: d.card_height || '280px',
        gust_threshold: d.gust_threshold || 2.0,
        show_azimuth: d.show_azimuth !== false,
        azimuth_size: d.azimuth_size || 50,
        azimuth_top: d.azimuth_top || '12px',  // Vertical position
        azimuth_right: d.azimuth_right || '12px', // Horizontal position
        data_size: d.data_size || 'medium',  // small, medium, large
        show_camera: d.show_camera !== false,
        click_to_expand: d.click_to_expand !== false, // Click to expand
      },
      plugins: config.plugins || {},
    };

    // Notify plugins
    if (prevConfig) {
      this._pluginInstances.forEach(plugin => {
        try { plugin.onConfig?.(this._config, prevConfig); } catch (e) { /* ignore */ }
      });
    }

    if (this._hass) {
      this._render();
    }
  }

  set hass(hass) {
    const prevHass = this._hass;
    this._hass = hass;

    if (prevHass !== hass) {
      this._pluginInstances.forEach(plugin => {
        try { plugin.onHass?.(hass); } catch (e) { /* ignore */ }
      });
    }

    if (!this._rendered) {
      this._render();
      this._startEngine();
    } else {
      this._pollState();
    }
  }

  get hass() { return this._hass; }

  // ============================================
  // STATE HELPERS
  // ============================================

  _state(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId] || null;
  }

  _rawValue(entityId) {
    const s = this._state(entityId);
    if (!s) return null;
    const n = parseFloat(s.state);
    return isNaN(n) ? null : n;
  }

  _windLabel(deg) {
    if (deg === null) return '';
    const dirs = ['Β', 'ΒΒΑ', 'ΒΑ', 'ΑΒΑ', 'Α', 'ΝΑΑ', 'ΝΑ', 'ΝΝΑ', 'Ν', 'ΝΝΔ', 'ΝΔ', 'ΔΝΔ', 'Δ', 'ΔΒΔ', 'ΒΔ', 'ΒΒΔ'];
    return dirs[Math.floor(((deg + 11.25) % 360) / 22.5) % 16];
  }

  // ============================================
  // CAMERA LAYER
  // ============================================

  _getCameraUrl() {
    const cam = this._state(this._config.camera_entity);

    // Use entity_picture from camera entity (same-origin, no CORS issues)
    if (cam?.attributes?.entity_picture) {
      return cam.attributes.entity_picture;
    }

    // Try still_image_url if entity_picture not available
    if (cam?.attributes?.still_image_url) {
      return cam.attributes.still_image_url;
    }

    // Fall back to camera_image_url only if no camera entity picture
    if (this._config.camera_image_url) {
      return this._config.camera_image_url;
    }

    // Last resort: use camera_proxy through HA
    if (this._config.camera?.camera_proxy !== false) {
      return `/api/camera_proxy/${this._config.camera_entity}`;
    }
    return '';
  }

  // Load camera image via fetch to bypass CORS
  async _loadCameraImage() {
    const url = this._getCameraUrl();
    console.log("Camera: _loadCameraImage called, url =", url);
    const img = this.shadowRoot?.getElementById('camera-img');
    if (!img || !url) return;
    
    if (url.startsWith('/')) {
      img.src = url;
      return;
    }
    
    try {
      // Extract credentials from URL if present
      let fetchUrl = url;
      let headers = {};
      
      const urlMatch = url.match(/^https?:\/\/([^:]+):([^@]+)@(.*)$/);
      if (urlMatch) {
        const [, username, password, rest] = urlMatch;
        fetchUrl = 'http://' + rest;
        const credentials = btoa(username + ':' + password);
        headers = { 'Authorization': 'Basic ' + credentials };
        console.log('Camera: Using Basic Auth for', fetchUrl);
      }
      
      const response = await fetch(fetchUrl, { 
        headers,
        credentials: 'include' 
      });
      
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      
      const blob = await response.blob();
      console.log('Camera: Loaded blob, size:', blob.size);
      
      if (this._cameraBlobUrl) URL.revokeObjectURL(this._cameraBlobUrl);
      this._cameraBlobUrl = URL.createObjectURL(blob);
      img.src = this._cameraBlobUrl;
    } catch (e) {
      console.error('Camera: Fetch failed', e);
      img.src = url;
    }
  }

  // ============================================
  // PLUGIN SYSTEM
  // ============================================

  _initPlugins() {
    const pluginConfigs = this._config.plugins || {};

    for (const [name, config] of Object.entries(pluginConfigs)) {
      if (config === true || (typeof config === 'object' && config.enabled !== false)) {
        const instance = _registry.create(name, typeof config === 'object' ? config : {});
        if (instance) {
          try {
            instance.attach(this, this._eventBus);
            this._pluginInstances.set(name, instance);
          } catch (e) {
            console.error(`Plugin ${name} attach failed:`, e.message);
          }
        }
      }
    }
  }

  _updatePlugins() {
    this._pluginInstances.forEach(plugin => {
      try {
        plugin.update(this._cache, this._config);
      } catch (e) {
        // Already handled in plugin isolation
      }
    });
  }

  // ============================================
  // RENDER LAYER
  // ============================================

  _render() {
    const cfg = this._config;
    const d = cfg.display;
    const camUrl = this._getCameraUrl();
    console.log("Camera: camUrl =", camUrl);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; --accent: ${d.arrow_color}; }
        
        .card {
          position: relative;
          width: 100%;
          height: ${d.card_height};
          border-radius: 12px;
          overflow: hidden;
          background: #111;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .camera-wrap { position: absolute; inset: 0; ${!d.show_camera ? 'display: none;' : ''} }
        .camera-img { width: 100%; height: 100%; object-fit: cover; }
        .camera-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #1a2a3a 0%, #0d1a25 100%);
          color: rgba(255,255,255,0.5); font-size: 14px;
        }
        
        .wind-arrow {
          position: absolute; top: ${d.arrow_top}; left: ${d.arrow_left};
          width: 4px; height: ${d.arrow_size}px;
          background: linear-gradient(to top, transparent, var(--accent));
          transform-origin: bottom center; border-radius: 2px;
          box-shadow: 0 0 10px var(--accent), 0 0 20px var(--accent);
          will-change: transform;
        }
        
        .wind-arrow::before {
          content: ''; position: absolute; top: -12px; left: 50%;
          transform: translateX(-50%);
          border-left: 8px solid transparent; border-right: 8px solid transparent;
          border-bottom: 14px solid var(--accent);
          filter: drop-shadow(0 0 5px var(--accent));
        }
        
        .gust-alert {
          position: absolute; top: ${d.arrow_top}; left: ${d.arrow_left}; transform: translate(-50%, -100%);
          background: rgba(255,100,100,0.9); color: #fff;
          padding: 5px 15px; border-radius: 20px;
          font-size: 11px; font-weight: bold;
          display: none; z-index: 100;
          animation: gust-flash 0.4s ease;
        }
        
        @keyframes gust-flash {
          0% { opacity: 0; transform: translate(-50%, -100%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -100%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
        
        .compass {
          position: absolute; top: ${d.azimuth_top}; right: ${d.azimuth_right};
          width: ${d.azimuth_size}px; height: ${d.azimuth_size}px; border-radius: 50%;
          background: rgba(0,0,0,${d.panel_opacity});
          border: 2px solid rgba(255,255,255,0.2);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          ${!d.show_azimuth ? 'display: none;' : ''}
        }
        
        .compass-needle {
          width: ${Math.round(d.azimuth_size * 0.6)}px; height: 3px;
          background: linear-gradient(90deg, #ff5555 50%, #fff 50%);
          border-radius: 2px; will-change: transform;
        }
        
        .compass-label {
          font-size: ${Math.round(d.azimuth_size * 0.25)}px;
          color: rgba(255,255,255,0.7);
          font-weight: bold;
          margin-top: 2px;
        }
        
        .compass.hidden { display: none; }
        
        .panel {
          position: absolute; bottom: 0; left: 0; right: 0;
          display: flex; justify-content: space-around; align-items: flex-end;
          padding: 12px 8px;
          background: linear-gradient(transparent, rgba(0,0,0,${d.panel_opacity}));
        }
        
        .data-item {
          display: flex; flex-direction: column;
          align-items: center; min-width: ${d.data_size === 'small' ? '40px' : d.data_size === 'large' ? '70px' : '55px'};
        }
        
        .data-icon { font-size: ${d.data_size === 'small' ? '12px' : d.data_size === 'large' ? '20px' : '16px'}; margin-bottom: 2px; }
        .data-value { font-size: ${d.data_size === 'small' ? '12px' : d.data_size === 'large' ? '20px' : '15px'}; font-weight: 600; color: #fff; }
        .data-label { font-size: ${d.data_size === 'small' ? '7px' : d.data_size === 'large' ? '11px' : '9px'}; color: rgba(255,255,255,0.6); text-transform: uppercase; margin-top: 1px; }
        
        .data-item.wind { min-width: 70px; }
        .data-item.wind .data-value { color: var(--accent); font-size: 18px; }
        
        .data-item.gust .data-value { color: #ff6b6b; }
        .data-item.gust .data-label { color: #ff6b6b; }
        
        .plugin-layer { position: absolute; inset: 0; pointer-events: none; }
        
        .credit {
          position: absolute; top: 8px; left: 8px;
          font-size: 8px; color: rgba(255,255,255,0.25); font-family: sans-serif;
        }
        
        .expanded-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.95);
          display: none; align-items: center; justify-content: center;
          cursor: pointer;
        }
        
        .expanded-overlay.active { display: flex; }
        
        .expanded-overlay img {
          max-width: 95vw; max-height: 95vh; object-fit: contain;
          border-radius: 8px; box-shadow: 0 0 50px rgba(0,0,0,0.5);
        }
      </style>
      
      <div class="card" id="main-card">
        <div class="camera-wrap">
          ${camUrl 
            ? `<img class="camera-img" id="camera-img" alt="Camera">` 
            : `<div class="camera-placeholder">📷 Κάμερα unavailable</div>`
          }
        </div>
        
        <div class="plugin-layer"></div>
        <div class="credit">Greece Sky v4.0 · Iakovos Venieris</div>
        <div class="gust-alert">⚡ ΡΙΠΗ ΑΝΕΜΟΥ</div>
        
        ${cfg.camera.show_compass !== false ? `<div class="compass"><div class="compass-needle"></div><div class="compass-label">N</div></div>` : ''}
        <div class="wind-arrow"></div>
        
        <div class="panel">
          <div class="data-item temp" style="display:none">
            <span class="data-icon">🌡️</span><span class="data-value">--</span><span class="data-label">Θερμοκρασία</span>
          </div>
          <div class="data-item hum" style="display:none">
            <span class="data-icon">💧</span><span class="data-value">--</span><span class="data-label">Υγρασία</span>
          </div>
          <div class="data-item wind" style="display:none">
            <span class="data-icon">💨</span><span class="data-value">-- km/h</span><span class="data-label"></span>
          </div>
          <div class="data-item gust" style="display:none">
            <span class="data-icon">🌬️</span><span class="data-value">--</span><span class="data-label">Ριπές</span>
          </div>
          <div class="data-item rain" style="display:none">
            <span class="data-icon">🌧️</span><span class="data-value">--mm</span><span class="data-label">Βροχή</span>
          </div>
          <div class="data-item pressure" style="display:none">
            <span class="data-icon">📊</span><span class="data-value">--hPa</span><span class="data-label">Πίεση</span>
          </div>
        </div>
      </div>
      
      <div class="expanded-overlay" id="expanded-overlay">
        <img id="expanded-img" src="" alt="Expanded Camera View">
      </div>
    `;

    // Cache DOM refs
    this._refs = {
      arrow: this.shadowRoot.querySelector('.wind-arrow'),
      needle: this.shadowRoot.querySelector('.compass-needle'),
      gustAlert: this.shadowRoot.querySelector('.gust-alert'),
      pluginLayer: this.shadowRoot.querySelector('.plugin-layer'),
      mainCard: this.shadowRoot.querySelector('#main-card'),
      expandedOverlay: this.shadowRoot.querySelector('#expanded-overlay'),
      expandedImg: this.shadowRoot.querySelector('#expanded-img'),
      temp: this.shadowRoot.querySelector('.temp'),
      hum: this.shadowRoot.querySelector('.hum'),
      wind: this.shadowRoot.querySelector('.wind'),
      gust: this.shadowRoot.querySelector('.gust'),
      rain: this.shadowRoot.querySelector('.rain'),
      pressure: this.shadowRoot.querySelector('.pressure'),
    };

    // Setup click to expand
    if (this._config.display?.click_to_expand !== false) {
      const mainCard = this._refs.mainCard;
      const overlay = this._refs.expandedOverlay;
      const img = this._refs.expandedImg;
      const cameraImg = this.shadowRoot.querySelector('#camera-img');
      
      if (mainCard && overlay && img) {
        mainCard.style.cursor = 'pointer';
        mainCard.addEventListener('click', () => {
          if (cameraImg?.src) {
            img.src = cameraImg.src;
            overlay.classList.add('active');
          }
        });
        
        overlay.addEventListener('click', () => {
          overlay.classList.remove('active');
        });
      }
    }

    this._rendered = true;
    this._loadCameraImage();
    this._initPlugins();
    this._pollState();
  }

  // ============================================
  // UPDATE LAYER
  // ============================================

  _pollState() {
    if (!this._rendered || !this._config) return;

    // Low-power mode throttling
    if (this._perfMode === 'low-power') {
      const now = Date.now();
      if (now - this._lastPoll < this._pollThrottle) return;
      this._lastPoll = now;
    }

    const cfg = this._config;
    const d = cfg.display;
    const now = Date.now();

    // Store previous
    this._prevCache = { ...this._cache };

    // Get RAW values
    const windDirRaw = this._rawValue(cfg.entities.wind_direction);
    const windSpeedRaw = this._rawValue(cfg.entities.wind_speed);
    const gust = this._rawValue(cfg.entities.wind_gust);
    const temp = this._rawValue(cfg.entities.temperature);
    const hum = this._rawValue(cfg.entities.humidity);
    const rain = this._rawValue(cfg.entities.rain);
    const pressure = this._rawValue(cfg.entities.pressure);

    // Update cache
    Object.assign(this._cache, {
      windDir: windDirRaw,
      windSpeed: windSpeedRaw,
      temp, hum, rain, pressure, gust,
      windSpeedDelta: windSpeedRaw !== null && this._prevCache.windSpeed !== null 
        ? windSpeedRaw - this._prevCache.windSpeed 
        : null,
    });

    // EMA smoothing
    const smoothDir = this._windEngine.smoothDirection(windDirRaw, now);
    const smoothSpeed = this._windEngine.smoothSpeed(windSpeedRaw, now);
    console.log("DEBUG wind:", { windDirRaw, smoothDir, azimuth: cfg.camera.azimuth });

    if (smoothDir !== null) {
      // Arrow shows WHERE wind is going (opposite of wind direction + camera azimuth)
      const targetAngle = this._windEngine.normalize(smoothDir + 180 - (cfg.camera.azimuth || 0));
      this._targetAngle = targetAngle;
      console.log("DEBUG target:", { smoothDir, azimuth: cfg.camera.azimuth, targetAngle });
    }

    // Update DOM
    this._updateEl(this._refs.temp, temp !== null, `${temp?.toFixed(1) || '--'}${d.temperature_unit}`);
    this._updateEl(this._refs.hum, hum !== null, `${hum?.toFixed(0) || '--'}%`);

    if (smoothSpeed !== null || smoothDir !== null) {
      this._refs.wind.style.display = '';
      this._refs.wind.querySelector('.data-value').textContent = `${smoothSpeed?.toFixed(1) || '--'} ${d.speed_unit}`;
      if (smoothDir !== null) {
        this._refs.wind.querySelector('.data-label').textContent = this._windLabel(this._windEngine.normalize(smoothDir + 180));
      }
    } else {
      this._refs.wind.style.display = 'none';
    }

    if (gust !== null) {
      this._refs.gust.style.display = '';
      this._refs.gust.querySelector('.data-value').textContent = `${gust.toFixed(1)} ${d.speed_unit}`;
    } else {
      this._refs.gust.style.display = 'none';
    }

    this._updateEl(this._refs.rain, rain !== null, `${rain?.toFixed(1) || '--'}mm`);
    this._updateEl(this._refs.pressure, pressure !== null, `${pressure?.toFixed(0) || '--'}hPa`);

    // Update plugins
    this._updatePlugins();
  }

  _updateEl(el, show, value) {
    if (!el) return;
    el.style.display = show ? '' : 'none';
    if (show) el.querySelector('.data-value').textContent = value;
  }

  // ============================================
  // ANIMATION LAYER
  // ============================================

  _startEngine() {
    if (this._running) return;
    this._running = true;

    const animate = () => {
      if (!this._running) {
        this._rafId = null;
        return;
      }

      const diff = this._windEngine.shortestDiff(this._arrowAngle, this._targetAngle);
      this._arrowAngle = this._windEngine.normalize(this._arrowAngle + diff * this._smoothSpeed);

      const azimuth = this._config?.camera?.azimuth || 0;
      this._refs.arrow?.style.setProperty('transform', `translateX(-50%) rotate(${this._arrowAngle}deg)`);
      this._refs.needle?.style.setProperty('transform', `rotate(${azimuth}deg)`);

      this._rafId = requestAnimationFrame(animate);
    };

    this._rafId = requestAnimationFrame(animate);
  }

  getCardSize() {
    return 4;
  }
}

// ============================================
// REGISTER (scoped, HACS-compatible)
// ============================================

if (!customElements.get('meteo-camera-card')) {
  customElements.define('meteo-camera-card', MeteoCameraCard);
}

// Export for external plugin registration (optional)
if (typeof window !== 'undefined') {
  window.GSCard = {
    version: MeteoCard.version,
    PluginRegistry: class extends PluginRegistry {
      constructor() { super(); }
      register(PluginClass) { super.register(PluginClass); }
    },
    MeteoPlugin,
    WindEngine,
    EventBus,
    _registry,
  };
}

console.log('Greece Sky v4.0 loaded ✓');

// Card descriptor for HACS card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'meteo-camera-card',
  name: 'Greece Sky Weather Card',
  description: 'Weather camera card with wind visualization and plugins',
  preview: true,
});