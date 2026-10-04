(function () {
  let mapsPromise;

  function loadGoogleMaps() {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (!mapsPromise) {
      mapsPromise = (async () => {
        const response = await fetch('/api/config/maps');
        if (!response.ok) throw new Error('Could not load map configuration.');
        const config = await response.json();
        if (!config.googleMapsApiKey) throw new Error('Map is not configured. Enter the location manually.');

        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.googleMapsApiKey)}&v=weekly`;
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
          document.head.appendChild(script);
        });

        if (!window.google?.maps) throw new Error('Google Maps is unavailable.');
        return window.google.maps;
      })().catch((error) => {
        mapsPromise = null;
        throw error;
      });
    }
    return mapsPromise;
  }

  async function initLocationPicker({ mapId, locationInputId, latitudeInputId, longitudeInputId, statusId, locationLabel }) {
    const mapElement = document.getElementById(mapId);
    if (!mapElement) return;

    const locationInput = document.getElementById(locationInputId);
    const latitudeInput = document.getElementById(latitudeInputId);
    const longitudeInput = document.getElementById(longitudeInputId);
    const status = document.getElementById(statusId);

    try {
      const maps = await loadGoogleMaps();
      const map = new maps.Map(mapElement, {
        center: { lat: 7.8731, lng: 80.7718 },
        zoom: 7,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
      const marker = new maps.Marker({ map, draggable: true });
      const locationNoun = locationLabel.toLowerCase();

      const selectLocation = (position) => {
        const lat = position.lat();
        const lng = position.lng();
        marker.setPosition(position);
        latitudeInput.value = lat.toFixed(6);
        longitudeInput.value = lng.toFixed(6);
        locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        status.textContent = `${locationLabel} selected. Drag the marker to adjust it.`;
      };

      map.addListener('click', (event) => selectLocation(event.latLng));
      marker.addListener('dragend', (event) => selectLocation(event.latLng));
      locationInput.addEventListener('input', () => {
        latitudeInput.value = '';
        longitudeInput.value = '';
        status.textContent = `Choose the ${locationNoun} on the map, or enter an address above.`;
      });
      status.textContent = `Click the map to pin the ${locationNoun}.`;
    } catch (error) {
      status.textContent = error.message || 'Map unavailable. Enter the pickup address manually.';
      mapElement.hidden = true;
    }
  }

  window.TaxiMap = { initLocationPicker };
})();