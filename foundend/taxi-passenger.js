// Taxi Passenger Module
(function () {
  const TAXI_LOCAL_REQ_KEY = 'taxi-requests-data';
  let passengerRequests = [];
  let onlineDrivers = [];
  let pollInterval = null;
  let pickupPickerInitialized = false;

  function getCurrentUser() {
    try {
      const state = JSON.parse(localStorage.getItem('bus-time-table-management-state') || '{}');
      if (state.currentUser && state.currentUser.username) {
        return state.currentUser;
      }
    } catch {}

    try {
      const pending = JSON.parse(sessionStorage.getItem('pendingUser') || '{}');
      if (pending && pending.username) return pending;
    } catch {}

    // Safe fallback so passenger never gets blocked from booking
    return { username: 'passenger', displayName: 'Passenger', role: 'Passenger' };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── Fetch Online Taxi Drivers ───
  async function fetchOnlineDrivers() {
    const listEl = document.getElementById('passengerOnlineDriversList');
    const countEl = document.getElementById('onlineDriversCount');
    if (!listEl) return;

    try {
      const res = await fetch('/api/taxi/drivers');
      if (res.ok) {
        const data = await res.json();
        onlineDrivers = data.drivers || [];
      } else {
        onlineDrivers = [];
      }
    } catch {
      onlineDrivers = [];
    }

    renderOnlineDriversList();
  }

  function renderOnlineDriversList() {
    const listEl = document.getElementById('passengerOnlineDriversList');
    const countEl = document.getElementById('onlineDriversCount');
    if (!listEl) return;

    const available = onlineDrivers.filter((d) => d.isOnline);
    if (countEl) {
      countEl.textContent = `${available.length} Online Now`;
    }

    if (onlineDrivers.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 1rem; text-align: center; color: #64748b; background: #ffffff; border-radius: 10px; border: 1px dashed #cbd5e1;">
          No taxi drivers registered yet. You can still post a taxi request using the form below!
        </div>
      `;
      return;
    }

    listEl.innerHTML = onlineDrivers.map((driver) => {
      const isOnline = Boolean(driver.isOnline);
      return `
        <div style="background: #ffffff; border: 1.5px solid ${isOnline ? '#86efac' : '#e2e8f0'}; border-radius: 12px; padding: 0.9rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.6rem; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <div>
              <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
                <span>🚖</span> ${escapeHtml(driver.name)}
              </div>
              <div style="font-size: 0.82rem; color: #475569; margin-top: 0.15rem;">
                ${escapeHtml(driver.vehicleType || 'Car')} ${driver.vehicleNumber ? `· <strong>${escapeHtml(driver.vehicleNumber)}</strong>` : ''}
              </div>
              ${driver.telephone ? `
                <div style="font-size: 0.8rem; color: #2563eb; margin-top: 0.2rem;">
                  📞 <a href="tel:${escapeHtml(driver.telephone)}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${escapeHtml(driver.telephone)}</a>
                </div>
              ` : ''}
            </div>

            <span style="font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; background: ${isOnline ? '#dcfce7' : '#f1f5f9'}; color: ${isOnline ? '#15803d' : '#64748b'};">
              ${isOnline ? '🟢 Online' : '⚪ Offline'}
            </span>
          </div>

          <button
            type="button"
            class="btn-select-driver"
            data-username="${escapeHtml(driver.username)}"
            data-name="${escapeHtml(driver.name)}"
            data-phone="${escapeHtml(driver.telephone || '')}"
            data-vehicle-type="${escapeHtml(driver.vehicleType || 'Car')}"
            data-vehicle-num="${escapeHtml(driver.vehicleNumber || '')}"
            style="width: 100%; font-size: 0.84rem; font-weight: 700; padding: 0.45rem 0.75rem; border-radius: 8px; border: none; cursor: pointer; background: ${isOnline ? '#15803d' : '#64748b'}; color: #ffffff; transition: opacity 0.2s;"
          >
            ${isOnline ? '⚡ Book & Accept Taxi' : 'Select Driver'}
          </button>
        </div>
      `;
    }).join('');
  }

  // ─── Fetch Passenger's Ride Requests ───
  async function fetchPassengerRequests() {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const res = await fetch(`/api/taxi/requests?passengerUsername=${encodeURIComponent(user.username)}`);
      if (res.ok) {
        const data = await res.json();
        passengerRequests = data.requests || [];
        localStorage.setItem(TAXI_LOCAL_REQ_KEY, JSON.stringify(passengerRequests));
      } else {
        fallbackRequests();
      }
    } catch {
      fallbackRequests();
    }
    renderPassengerTaxiView();
  }

  function fallbackRequests() {
    try {
      const all = JSON.parse(localStorage.getItem(TAXI_LOCAL_REQ_KEY) || '[]');
      const user = getCurrentUser();
      passengerRequests = all.filter((r) => r.passengerUsername?.toLowerCase() === user?.username?.toLowerCase());
    } catch {
      passengerRequests = [];
    }
  }

  function renderPassengerTaxiView() {
    const list = document.getElementById('passengerTaxiRequestsList');
    if (!list) return;

    if (passengerRequests.length === 0) {
      list.innerHTML = `
        <div class="taxi-empty-state" style="padding: 2rem 1.5rem; text-align: center; background: #f8fafc; border-radius: 16px; border: 1.5px dashed #cbd5e1;">
          <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">🚖</div>
          <h3 style="margin: 0 0 0.5rem; color: #1e293b; font-size: 1.15rem;">No Active Taxi Bookings</h3>
          <p style="margin: 0 0 1rem; color: #64748b; font-size: 0.92rem; max-width: 400px; margin-inline: auto;">
            Need a ride right now? Fill out the booking form on the left or select an online driver above. Drivers will quote their fares or confirm instantly!
          </p>
          <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary quick-route-chip" data-pickup="Pettah Station" data-dest="Colombo Fort" style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
              📍 Pettah ➔ Fort
            </button>
            <button type="button" class="btn btn-secondary quick-route-chip" data-pickup="Panadura Bus Stand" data-dest="Hirana Junction" style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
              📍 Panadura ➔ Hirana
            </button>
          </div>
        </div>
      `;
      return;
    }

    list.innerHTML = passengerRequests.map((req) => {
      const bids = req.bids || [];
      const isAccepted = req.status === 'Accepted' || req.status === 'In Progress';
      const isCompleted = req.status === 'Completed';
      const pendingBids = bids.filter((b) => b.status !== 'Declined');
      const timeStr = new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="card" style="margin-bottom: 1.25rem; border: 1.5px solid ${isCompleted ? '#cbd5e1' : isAccepted ? '#86efac' : '#fbbf24'}; border-radius: 16px; padding: 1.25rem; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05); background: #ffffff;">
          <!-- Request Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="background: ${isCompleted ? '#f1f5f9' : isAccepted ? '#dcfce7' : '#fef3c7'}; color: ${isCompleted ? '#475569' : isAccepted ? '#15803d' : '#92400e'}; font-weight: 700; font-size: 0.82rem; padding: 0.25rem 0.65rem; border-radius: 999px;">
                ${isCompleted ? '🏁 COMPLETED' : isAccepted ? '✅ TAXI CONFIRMED & BOOKED' : '⏳ WAITING FOR DRIVER OFFERS'}
              </span>
              <span style="font-size: 0.8rem; color: var(--muted); margin-left: 0.5rem;">Requested at ${timeStr}</span>
            </div>

            ${!isCompleted ? `
              <button class="btn btn-secondary btn-cancel-request" data-id="${req._id || req.id}" type="button" style="font-size: 0.82rem; padding: 0.35rem 0.75rem; color: #dc2626; border-color: #fca5a5;">
                ✕ Cancel Ride
              </button>
            ` : ''}
          </div>

          <!-- Route Display -->
          <div class="taxi-route-display" style="margin-bottom: 0.85rem;">
            <div class="taxi-stop-item">
              <span class="taxi-stop-dot pickup"></span>
              <span>Pickup: <strong>${escapeHtml(req.pickupLocation)}</strong></span>
            </div>
            <div class="taxi-stop-item">
              <span class="taxi-stop-dot dest"></span>
              <span>Drop-off: <strong>${escapeHtml(req.destination)}</strong></span>
            </div>
          </div>
          ${getTripRouteMapLink(req)}

          <div style="font-size: 0.88rem; color: #475569; margin-bottom: 0.75rem; display: flex; flex-wrap: wrap; gap: 1rem;">
            <span>Vehicle: <strong>${escapeHtml(req.vehiclePreference || 'Any')}</strong></span>
            ${req.passengerBudget ? `<span>Your Budget: <strong>LKR ${req.passengerBudget}</strong></span>` : ''}
            ${req.passengerNotes ? `<span style="color: #64748b;">Note: <em>${escapeHtml(req.passengerNotes)}</em></span>` : ''}
          </div>

          <!-- CONFIRMED DRIVER CARD (If Accepted) -->
          ${isAccepted ? `
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 1.1rem; margin-top: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <div>
                  <h4 style="margin: 0; color: #166534; font-size: 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
                    <span>🚖</span> ${escapeHtml(req.selectedDriver?.driverName || 'Taxi Driver')} is on the way!
                  </h4>
                  <p style="margin: 0.3rem 0 0; color: #15803d; font-size: 0.92rem;">
                    Vehicle: <strong>${escapeHtml(req.selectedDriver?.vehicleType || 'Car')}</strong> ${req.selectedDriver?.vehicleNumber ? `[<strong>${escapeHtml(req.selectedDriver.vehicleNumber)}</strong>]` : ''}
                  </p>
                  <p style="margin: 0.3rem 0 0; font-size: 0.92rem; color: #1e293b;">
                    Driver Contact: 📞 <a href="tel:${req.selectedDriver?.driverPhone}" style="color: #2563eb; font-weight: 700; text-decoration: underline;">${req.selectedDriver?.driverPhone || 'Not provided'}</a>
                  </p>
                </div>
                <div style="text-align: right; background: #ffffff; padding: 0.6rem 1rem; border-radius: 10px; border: 1px solid #bbf7d0;">
                  <span style="font-size: 0.75rem; color: #166534; font-weight: 700; text-transform: uppercase;">Agreed Booking Fare</span>
                  <div style="font-size: 1.5rem; font-weight: 800; color: #15803d;">
                    LKR ${req.selectedDriver?.agreedBudget || req.passengerBudget || 0}
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- DRIVER QUOTES / BUDGETS LIST (When Open) -->
          ${!isAccepted && !isCompleted ? `
            <div style="border-top: 1.5px solid #f1f5f9; padding-top: 1rem; margin-top: 0.5rem;">
              <h4 style="margin: 0 0 0.75rem; font-size: 0.98rem; color: #1e293b; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <span style="font-weight: 700;">Driver Quotes & Budget Offers (${pendingBids.length})</span>
                <span style="font-size: 0.82rem; font-weight: normal; color: #64748b;">
                  ${pendingBids.length === 0 ? 'Notifying online taxi drivers...' : 'Click "Accept & Book" to confirm your ride'}
                </span>
              </h4>

              ${pendingBids.length === 0 ? `
                <div style="text-align: center; padding: 1.25rem; background: #f8fafc; border-radius: 10px; color: #64748b; font-size: 0.9rem; border: 1px dashed #e2e8f0;">
                  ⏳ Waiting for online drivers to send their fare quotes. Quotes will appear here automatically!
                </div>
              ` : `
                <div style="display: grid; gap: 0.75rem;">
                  ${pendingBids.map((bid) => `
                    <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.65rem;">
                      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                          <div style="font-weight: 700; font-size: 1.05rem; color: #1e293b; display: flex; align-items: center; gap: 0.4rem;">
                            <span>🚖</span> ${escapeHtml(bid.driverName)}
                            <span style="font-weight: normal; font-size: 0.85rem; color: #64748b;">
                              (${escapeHtml(bid.vehicleType)} ${bid.vehicleNumber ? `· ${escapeHtml(bid.vehicleNumber)}` : ''})
                            </span>
                          </div>
                          ${bid.note ? `<p style="margin: 0.25rem 0 0; font-size: 0.88rem; color: #475569;">💬 "${escapeHtml(bid.note)}"</p>` : ''}
                          ${bid.driverPhone ? `<p style="margin: 0.2rem 0 0; font-size: 0.82rem; color: #64748b;">📞 ${escapeHtml(bid.driverPhone)}</p>` : ''}
                        </div>

                        <div style="text-align: right;">
                          <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Driver's Fare Offer</span>
                          <div style="font-size: 1.45rem; font-weight: 800; color: #15803d;">LKR ${bid.budget}</div>
                        </div>
                      </div>

                      <!-- Action Buttons: Accept & Booking or Delete -->
                      <div style="display: flex; gap: 0.6rem; justify-content: flex-end; border-top: 1px dashed #cbd5e1; padding-top: 0.65rem;">
                        <button
                          class="btn-delete-quote"
                          data-req-id="${req._id || req.id}"
                          data-driver="${escapeHtml(bid.driverUsername)}"
                          type="button"
                          style="font-size: 0.85rem; padding: 0.45rem 0.85rem; border-radius: 8px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #dc2626; cursor: pointer; font-weight: 600;"
                          title="Decline / Delete this quote"
                        >
                          🗑️ Delete Quote
                        </button>
                        <button
                          class="btn-accept-quote"
                          data-req-id="${req._id || req.id}"
                          data-driver="${escapeHtml(bid.driverUsername)}"
                          data-budget="${bid.budget}"
                          type="button"
                          style="font-size: 0.92rem; padding: 0.5rem 1.1rem; border-radius: 8px; border: none; background: #15803d; color: #ffffff; cursor: pointer; font-weight: 800; box-shadow: 0 2px 8px rgba(21, 128, 61, 0.3);"
                          title="Accept this offer and confirm ride"
                        >
                          ✓ Accept & Book (LKR ${bid.budget})
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function getTripRouteMapLink(request) {
    const coordinatePair = (coordinates) => {
      const lat = Number(coordinates?.lat);
      const lng = Number(coordinates?.lng);
      return Number.isFinite(lat) && lat >= -90 && lat <= 90
        && Number.isFinite(lng) && lng >= -180 && lng <= 180
        ? `${lat},${lng}`
        : '';
    };
    const origin = coordinatePair(request.pickupCoordinates) || String(request.pickupLocation || '').trim();
    const destination = coordinatePair(request.destinationCoordinates) || String(request.destination || '').trim();
    if (!origin || !destination) return '';

    const mapUrl = new URL('https://www.google.com/maps/dir/');
    mapUrl.searchParams.set('api', '1');
    mapUrl.searchParams.set('origin', origin);
    mapUrl.searchParams.set('destination', destination);
    mapUrl.searchParams.set('travelmode', 'driving');
    return `<p style="margin: 0 0 0.85rem;"><a href="${escapeHtml(mapUrl.toString())}" target="_blank" rel="noopener noreferrer">View trip route on map</a></p>`;
  }

  // ─── Submit Taxi Ride Request or Direct Booking ───
  async function handleRequestSubmit(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const user = getCurrentUser();
    const pickup = String(document.getElementById('taxiPickupLocation')?.value || '').trim();
    const pickupLatValue = String(document.getElementById('taxiPickupLat')?.value || '').trim();
    const pickupLngValue = String(document.getElementById('taxiPickupLng')?.value || '').trim();
    const pickupLat = Number(pickupLatValue);
    const pickupLng = Number(pickupLngValue);
    const dest = String(document.getElementById('taxiDestination')?.value || '').trim();
    const destinationLatValue = String(document.getElementById('taxiDestinationLat')?.value || '').trim();
    const destinationLngValue = String(document.getElementById('taxiDestinationLng')?.value || '').trim();
    const destinationLat = Number(destinationLatValue);
    const destinationLng = Number(destinationLngValue);
    const veh = String(document.getElementById('taxiVehiclePref')?.value || 'Any');
    const budgetVal = Number(document.getElementById('taxiBudget')?.value || 0);
    const notes = String(document.getElementById('taxiNotes')?.value || '').trim();
    const phone = String(document.getElementById('taxiPhone')?.value || user.telephone || '').trim();
    const msgEl = document.getElementById('taxiRequestMsg');

    const directUsername = String(document.getElementById('directDriverUsername')?.value || '').trim();
    const directPhone = String(document.getElementById('directDriverPhone')?.value || '').trim();
    const directVehicleNumber = String(document.getElementById('directDriverVehicleNumber')?.value || '').trim();

    if (!pickup || !dest) {
      if (msgEl) {
        msgEl.textContent = '⚠️ Please enter both pickup location and destination.';
        msgEl.className = 'form-error';
        msgEl.style.color = '#dc2626';
      }
      return;
    }

    if (!phone) {
      if (msgEl) {
        msgEl.textContent = '⚠️ Please enter your phone number so the driver can reach you.';
        msgEl.className = 'form-error';
        msgEl.style.color = '#dc2626';
      }
      return;
    }

    const submitBtn = document.getElementById('taxiSubmitBookingBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Processing Booking...';
    }

    const payload = {
      passengerUsername: user.username,
      passengerName: user.displayName || user.name || user.username,
      passengerPhone: phone,
      pickupLocation: pickup,
      pickupCoordinates: pickupLatValue && pickupLngValue && Number.isFinite(pickupLat) && Number.isFinite(pickupLng)
        ? { lat: pickupLat, lng: pickupLng }
        : undefined,
      destination: dest,
      destinationCoordinates: destinationLatValue && destinationLngValue && Number.isFinite(destinationLat) && Number.isFinite(destinationLng)
        ? { lat: destinationLat, lng: destinationLng }
        : undefined,
      vehiclePreference: veh,
      passengerNotes: notes,
      passengerBudget: budgetVal
    };

    if (directUsername) {
      payload.directDriver = {
        driverUsername: directUsername,
        driverName: directUsername,
        driverPhone: directPhone,
        vehicleType: veh,
        vehicleNumber: directVehicleNumber,
        agreedBudget: budgetVal || 500
      };
    }

    try {
      const res = await fetch('/api/taxi/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit taxi booking.');
      }

      if (msgEl) {
        msgEl.textContent = directUsername
          ? `✅ Ride booked & confirmed with driver! The driver is on their way.`
          : `✅ Taxi request posted! Online drivers are notified and will send quotes.`;
        msgEl.className = 'form-success';
        msgEl.style.color = '#15803d';
        setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 5000);
      }

      document.getElementById('taxiRequestForm')?.reset();
      clearDirectDriver();
      await fetchPassengerRequests();
    } catch (err) {
      if (msgEl) {
        msgEl.textContent = `❌ ${err.message || 'Could not connect to server.'}`;
        msgEl.className = 'form-error';
        msgEl.style.color = '#dc2626';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚖 Accept & Booking (Confirm Ride)';
      }
    }
  }

  // ─── Accept a Driver's Quote ───
  async function handleAcceptQuote(reqId, driverUsername, budget) {
    if (!reqId || !driverUsername) return;

    try {
      const res = await fetch(`/api/taxi/requests/${encodeURIComponent(reqId)}/accept-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverUsername })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to accept quote.');
      }

      alert(`✅ Taxi Offer of LKR ${budget} Accepted!\nDriver "${driverUsername}" has been confirmed and is on the way.`);
      await fetchPassengerRequests();
    } catch (e) {
      alert(`Error: ${e.message || 'Unable to accept quote.'}`);
    }
  }

  // ─── Delete a Driver's Quote ───
  async function handleDeleteQuote(reqId, driverUsername) {
    if (!reqId || !driverUsername) return;

    try {
      const res = await fetch(`/api/taxi/requests/${encodeURIComponent(reqId)}/bid/${encodeURIComponent(driverUsername)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Unable to remove quote.');
      }

      await fetchPassengerRequests();
    } catch (e) {
      alert(`Error: ${e.message || 'Unable to remove quote.'}`);
    }
  }

  // ─── Cancel Whole Request ───
  async function handleCancelRequest(reqId) {
    if (!reqId) return;

    try {
      const res = await fetch(`/api/taxi/requests/${encodeURIComponent(reqId)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Unable to cancel request.');
      await fetchPassengerRequests();
    } catch (e) {
      alert(`Error: ${e.message || 'Unable to cancel request.'}`);
    }
  }

  // ─── Direct Driver Selection ───
  function selectDirectDriver(username, name, phone, vehicleType, vehicleNum) {
    const directUserEl = document.getElementById('directDriverUsername');
    const directPhoneEl = document.getElementById('directDriverPhone');
    const directVehNumEl = document.getElementById('directDriverVehicleNumber');
    const noticeEl = document.getElementById('directDriverNotice');
    const badgeEl = document.getElementById('selectedDriverBadge');
    const nameText = document.getElementById('directDriverNameText');
    const detailsText = document.getElementById('directDriverDetailsText');
    const vehPref = document.getElementById('taxiVehiclePref');
    const submitBtn = document.getElementById('taxiSubmitBookingBtn');

    if (directUserEl) directUserEl.value = username;
    if (directPhoneEl) directPhoneEl.value = phone || '';
    if (directVehNumEl) directVehNumEl.value = vehicleNum || '';

    if (nameText) nameText.textContent = name || username;
    if (detailsText) detailsText.textContent = `${vehicleType || 'Car'} ${vehicleNum ? `· ${vehicleNum}` : ''} ${phone ? `· 📞 ${phone}` : ''}`;

    if (noticeEl) noticeEl.classList.remove('hidden');
    if (badgeEl) badgeEl.classList.remove('hidden');
    if (vehPref && vehicleType) vehPref.value = vehicleType;

    if (submitBtn) {
      submitBtn.textContent = `⚡ Accept & Book with ${name || username}`;
    }

    document.getElementById('taxiPickupLocation')?.focus();
  }

  function clearDirectDriver() {
    const directUserEl = document.getElementById('directDriverUsername');
    const directPhoneEl = document.getElementById('directDriverPhone');
    const directVehNumEl = document.getElementById('directDriverVehicleNumber');
    const noticeEl = document.getElementById('directDriverNotice');
    const badgeEl = document.getElementById('selectedDriverBadge');
    const submitBtn = document.getElementById('taxiSubmitBookingBtn');

    if (directUserEl) directUserEl.value = '';
    if (directPhoneEl) directPhoneEl.value = '';
    if (directVehNumEl) directVehNumEl.value = '';
    if (noticeEl) noticeEl.classList.add('hidden');
    if (badgeEl) badgeEl.classList.add('hidden');

    if (submitBtn) {
      submitBtn.textContent = '🚖 Accept & Booking (Confirm Ride)';
    }
  }

  // ─── Setup Service Tabs (Bus vs Taxi) ───
  function setupServiceTabs() {
    const busTab = document.getElementById('tabBusService');
    const taxiTab = document.getElementById('tabTaxiService');
    const busView = document.getElementById('busServiceView');
    const taxiView = document.getElementById('taxiServiceView');

    if (!busTab || !taxiTab || !busView || !taxiView) return;

    busTab.addEventListener('click', () => {
      busTab.className = 'btn btn-primary';
      taxiTab.className = 'btn btn-secondary';
      busView.classList.remove('hidden');
      taxiView.classList.add('hidden');
      if (pollInterval) clearInterval(pollInterval);
    });

    taxiTab.addEventListener('click', () => {
      taxiTab.className = 'btn btn-primary';
      busTab.className = 'btn btn-secondary';
      taxiView.classList.remove('hidden');
      busView.classList.add('hidden');
      initializePickupPicker();

      fetchOnlineDrivers();
      fetchPassengerRequests();

      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        fetchOnlineDrivers();
        fetchPassengerRequests();
      }, 4000);
    });
  }

  function initializePickupPicker() {
    if (pickupPickerInitialized || !window.TaxiMap) return;
    pickupPickerInitialized = true;
    Promise.all([
      window.TaxiMap.initLocationPicker({
      mapId: 'taxiPickupMap',
      locationInputId: 'taxiPickupLocation',
      latitudeInputId: 'taxiPickupLat',
      longitudeInputId: 'taxiPickupLng',
      statusId: 'taxiPickupMapStatus',
      locationLabel: 'Pickup point'
      }),
      window.TaxiMap.initLocationPicker({
        mapId: 'taxiDestinationMap',
        locationInputId: 'taxiDestination',
        latitudeInputId: 'taxiDestinationLat',
        longitudeInputId: 'taxiDestinationLng',
        statusId: 'taxiDestinationMapStatus',
        locationLabel: 'Drop-off point'
      })
    ]).catch(() => {
      pickupPickerInitialized = false;
    });
  }

  // ─── Setup Global Event Listeners ───
  function setupEventListeners() {
    const form = document.getElementById('taxiRequestForm');
    if (form) {
      form.removeEventListener('submit', handleRequestSubmit);
      form.addEventListener('submit', handleRequestSubmit);
    }

    const refreshBtn = document.getElementById('passengerTaxiRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        fetchOnlineDrivers();
        fetchPassengerRequests();
      });
    }

    const clearBtn = document.getElementById('clearDirectDriverBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearDirectDriver);
    }

    // Event delegation on document
    document.addEventListener('click', (e) => {
      // 1. Accept quote
      const acceptBtn = e.target.closest('.btn-accept-quote');
      if (acceptBtn) {
        e.preventDefault();
        const reqId = acceptBtn.getAttribute('data-req-id');
        const driver = acceptBtn.getAttribute('data-driver');
        const budget = acceptBtn.getAttribute('data-budget');
        handleAcceptQuote(reqId, driver, budget);
        return;
      }

      // 2. Delete quote
      const delBtn = e.target.closest('.btn-delete-quote');
      if (delBtn) {
        e.preventDefault();
        const reqId = delBtn.getAttribute('data-req-id');
        const driver = delBtn.getAttribute('data-driver');
        handleDeleteQuote(reqId, driver);
        return;
      }

      // 3. Cancel request
      const cancelReqBtn = e.target.closest('.btn-cancel-request');
      if (cancelReqBtn) {
        e.preventDefault();
        const reqId = cancelReqBtn.getAttribute('data-id');
        handleCancelRequest(reqId);
        return;
      }

      // 4. Select online driver
      const selectDriverBtn = e.target.closest('.btn-select-driver');
      if (selectDriverBtn) {
        e.preventDefault();
        const u = selectDriverBtn.getAttribute('data-username');
        const n = selectDriverBtn.getAttribute('data-name');
        const p = selectDriverBtn.getAttribute('data-phone');
        const vt = selectDriverBtn.getAttribute('data-vehicle-type');
        const vn = selectDriverBtn.getAttribute('data-vehicle-num');
        selectDirectDriver(u, n, p, vt, vn);
        return;
      }

      // 5. Quick sample route chip
      const chip = e.target.closest('.quick-route-chip');
      if (chip) {
        e.preventDefault();
        const pickupInput = document.getElementById('taxiPickupLocation');
        const destInput = document.getElementById('taxiDestination');
        if (pickupInput) pickupInput.value = chip.getAttribute('data-pickup') || '';
        if (destInput) destInput.value = chip.getAttribute('data-dest') || '';
        return;
      }
    });
  }

  function initTaxiPassenger() {
    setupServiceTabs();
    setupEventListeners();
    fetchOnlineDrivers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTaxiPassenger);
  } else {
    initTaxiPassenger();
  }
})();
