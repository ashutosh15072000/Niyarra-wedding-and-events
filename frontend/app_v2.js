// Last updated: 2026-03-29 21:15:00
const API_URL = '/api';
let guestsList = [];

// DOM Elements
const tbody = document.getElementById('guest-tbody');
const totalPaxEl = document.getElementById('total-pax');
const arrivedPaxEl = document.getElementById('arrived-pax');
const addForm = document.getElementById('add-guest-form');
let currentSide = localStorage.getItem('niyarra_current_side') || 'Bride';

// Initialize global side selector UI
function initSideSelector() {
    const selectors = document.querySelectorAll('.global-side-selector');
    if (selectors.length === 0) return;

    selectors.forEach(selector => {
        selector.value = currentSide;

        // Remove existing listener if any (to avoid duplicates)
        selector.removeEventListener('change', handleSideChange);
        selector.addEventListener('change', handleSideChange);
    });
}

function handleSideChange(e) {
    currentSide = e.target.value;
    localStorage.setItem('niyarra_current_side', currentSide);

    // Sync all other selectors on the page
    document.querySelectorAll('.global-side-selector').forEach(s => {
        s.value = currentSide;
    });

    if (document.getElementById('guest-tbody')) {
        renderTable(guestsList);
    }
    if (document.getElementById('transport-tbody')) {
        renderTransportTable(guestsList);
    }
    if (document.getElementById('transportChart')) {
        fetchGuests();
    }
    if (document.getElementById('messages-tbody')) {
        if (typeof initMessagePage === 'function') initMessagePage();
    }
}

// Side selector for forms (Add/Edit)
function initFormSideSelectors() {
    document.querySelectorAll('.form-side-selector').forEach(selector => {
        const options = selector.querySelectorAll('.form-side-option');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                const radio = opt.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSideSelector();
    initFormSideSelectors();
});

// Auth Flow
function getToken() { return sessionStorage.getItem('niyarra_admin_auth'); }
function setToken() { sessionStorage.setItem('niyarra_admin_auth', 'verified'); }
function removeToken() { sessionStorage.removeItem('niyarra_admin_auth'); }

// Hamburger Global Toggle
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-hamburger');
    const dropdown = document.getElementById('nav-dropdown');
    if (btn && dropdown) {
        dropdown.classList.toggle('hidden');
    } else if (dropdown && !e.target.closest('.hamburger-container')) {
        dropdown.classList.add('hidden');
    }
});

// Filters
const filterNameEl = document.getElementById('filter-name');
const filterStatusEl = document.getElementById('filter-status');
const filterDayEl = document.getElementById('filter-day');

function updateAuthUI() {
    const token = getToken();
    if (!token) {
        const mainContent = document.querySelector('.content');
        if (mainContent) mainContent.style.display = 'none';

        const hamburger = document.querySelector('.hamburger-container');
        if (hamburger) hamburger.style.display = 'none';

        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            const closeBtn = loginModal.querySelector('.close-modal');
            if (closeBtn) closeBtn.style.display = 'none';
        }
    } else {
        const blm = document.getElementById('btn-login-modal');
        if (blm) blm.classList.add('hidden');
        const blo = document.getElementById('btn-logout');
        if (blo) blo.classList.remove('hidden');
        document.querySelectorAll('.admin-col').forEach(el => el.classList.remove('hidden'));
    }
}
updateAuthUI();

// Fetch Logic
async function fetchGuests() {
    try {
        const res = await fetch(`${API_URL}/guests`);
        const data = await res.json();
        guestsList = data;
        if (document.getElementById('guest-tbody')) {
            renderTable(guestsList);
        }
        if (document.getElementById('transport-tbody')) {
            populateTableDropdowns(guestsList);
            renderTransportTable(guestsList);
        }
        if (document.getElementById('transportChart')) {
            populateStatsDropdowns(guestsList);
            const mode = document.getElementById('stats-type-selector') ? document.getElementById('stats-type-selector').value : 'transportation';
            if (mode === 'transportation') {
                renderTransportStats(guestsList);
            } else if (mode === 'hotels') {
                renderHotelStats(guestsList);
                renderRoomStats(guestsList);
            }
        }
        updateStats(guestsList);
    } catch (error) {
        console.error('Error fetching guests:', error);
    }
}

async function handleAddGuest(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('guest-name')?.value || "",
        pax: parseInt(document.getElementById('guest-pax')?.value || 1),
        hotel: document.getElementById('guest-hotel')?.value || "",
        room: document.getElementById('guest-room')?.value || "",
        floor: document.getElementById('guest-floor')?.value || "",
        guest_mobile: document.getElementById('guest-mobile')?.value || "",
        members_names: Array.from(document.querySelectorAll('.guest-pax-member')).map(el => el.value).filter(v => v).join(', '),
        driver_name: document.getElementById('guest-driver-name')?.value || "",
        driver_mobile: document.getElementById('guest-driver')?.value || "",
        day0: document.getElementById('guest-day0')?.checked || false,
        day1: document.getElementById('guest-day1')?.checked || false,
        day2: document.getElementById('guest-day2')?.checked || false,
        day3: document.getElementById('guest-day3')?.checked || false,
        description: document.getElementById('guest-description')?.value || "",
        extra_bedding: document.getElementById('guest-extra-bedding')?.checked || false,
        transport_needed: document.getElementById('guest-transport-needed')?.checked || false,
        transport_type: document.getElementById('guest-transport-type')?.value || "",
        arrival_location: document.getElementById('guest-arrival-location')?.value || "",
        arrival_date: document.getElementById('guest-arrival-date')?.value || "",
        arrival_time: document.getElementById('guest-arrival-time')?.value || "",
        flight_train_number: document.getElementById('guest-flight-train')?.value || "",
        pickup_arranged: document.getElementById('guest-pickup-arranged')?.checked || false,
        dropoff_arranged: document.getElementById('guest-dropoff-arranged')?.checked || false,
        departure_transport_type: document.getElementById('guest-departure-transport-type')?.value || "",
        departure_location: document.getElementById('guest-departure-location')?.value || "",
        departure_flight_train_number: document.getElementById('guest-departure-flight-train')?.value || "",
        departure_date: document.getElementById('guest-departure-date')?.value || "",
        departure_time: document.getElementById('guest-departure-time')?.value || "",
        side: document.querySelector('input[name="guest_side"]:checked')?.value || "Bride"
    };
    try {
        const res = await fetch(`${API_URL}/guests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error('API Error:', res.status, errText);
            alert(`Error saving guest: ${res.status} - ${errText}`);
            return;
        }
        addForm.reset();
        fetchGuests();
    } catch (e) {
        console.error('Network Error:', e);
        alert(`Network error: ${e.message}`);
    }
}

async function toggleCheckin(id) {
    try {
        await fetch(`${API_URL}/guests/${id}/checkin`, { method: 'PUT' });
        fetchGuests();
    } catch (e) { console.error(e); }
}

async function deleteGuest(id) {
    if (!confirm('Are you sure you want to permanently delete this guest?')) return;
    try {
        const res = await fetch(`${API_URL}/guests/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const errText = await res.text();
            alert(`Error deleting guest: ${errText}`);
            return;
        }
        fetchGuests();
    } catch (e) {
        console.error(e);
        alert(`Network error: ${e.message}`);
    }
}

function openWhatsApp(guest) {
    // Correct mobile formatting
    let num = guest.driver_mobile || '';
    num = num.replace(/\D/g, ''); // strip non-numeric
    if (num && num.length === 10) num = '91' + num;
    else if (num.startsWith('0')) num = '91' + num.substring(1);

    const message = `Hello ${guest.name},\nHere are your accommodation details:\n🏨 *Hotel:* ${guest.hotel || 'N/A'}\n🚪 *Room:* ${guest.room || 'N/A'}\n🏢 *Floor:* ${guest.floor || 'N/A'}\n🚗 *Driver Contact:* ${guest.driver_mobile || 'N/A'}\n\nHave a great stay!`;
    const encoded = encodeURIComponent(message);
    const url = num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
}

// Render Logic
function renderTable(data) {
    if (!tbody) return;
    tbody.innerHTML = '';
    const isOverride = window.location.pathname.includes('modification.html');
    const isAdmin = !!getToken() || isOverride;

    const fName = filterNameEl ? filterNameEl.value.toLowerCase() : '';
    const fStatus = filterStatusEl ? filterStatusEl.value : 'all';
    const fDay = filterDayEl ? filterDayEl.value : 'all';

    const filtered = data.filter(g => {
        if (g.side && g.side !== currentSide) return false;
        if (fName && !g.name.toLowerCase().includes(fName)) return false;
        if (fStatus === 'arrived' && !g.checked_in) return false;
        if (fStatus === 'pending' && g.checked_in) return false;
        if (fDay !== 'all') {
            if (fDay === '0' && !g.day0) return false;
            if (fDay === '1' && !g.day1) return false;
            if (fDay === '2' && !g.day2) return false;
            if (fDay === '3' && !g.day3) return false;
        }
        return true;
    });

    filtered.forEach(g => {
        const tr = document.createElement('tr');
        if (g.checked_in) tr.classList.add('arrived');

        const statusHtml = g.checked_in ? `<span class="status-badge arrived">Arrived</span>` : `<span class="status-badge pending">Pending</span>`;

        const isGuestPage = window.location.pathname.includes('guests.html');
        let adminHtml = '';
        if (!isGuestPage) {
            if (isAdmin) {
                adminHtml = `<td class="admin-col"><button class="btn btn-outline" onclick="openEdit(${g.id})"><i data-lucide="edit"></i> Edit</button></td>`;
            } else {
                adminHtml = `<td class="admin-col hidden"></td>`; // Keep structure but hide
            }
        }

        let days = [];
        if (g.day0) days.push('0');
        if (g.day1) days.push('1');
        if (g.day2) days.push('2');
        if (g.day3) days.push('3');
        const daysStr = days.length ? days.map(d => 'D' + d).join(', ') : '-';

        let nameHtml = `<strong>${g.name}</strong>`;
        if (g.members_names) {
            nameHtml += `<br><small style="color:#64748b;">${g.members_names}</small>`;
        }

        let driverDetails = g.driver_name ? `<strong>${g.driver_name}</strong><br>` : '';
        driverDetails += g.driver_mobile || '-';

        let transportStr = '-';
        if (g.transport_needed) {
            let parts = [];
            if (g.transport_type) parts.push(`<strong>${g.transport_type}</strong>`);
            if (g.flight_train_number) parts.push(g.flight_train_number);

            let timeStr = '';
            if (g.arrival_location || g.arrival_date || g.arrival_time) {
                let d = [g.arrival_date, g.arrival_time].filter(Boolean).join(' ');
                timeStr += `<br><small style="color:#64748b;">Arr: ${g.arrival_location || ''} ${d}</small>`;
            }
            if (g.dropoff_arranged && (g.departure_date || g.departure_time || g.departure_location || g.departure_transport_type)) {
                let d = [g.departure_date, g.departure_time].filter(Boolean).join(' ');
                let l = [g.departure_transport_type, g.departure_flight_train_number, g.departure_location].filter(Boolean).join(' - ');
                let combinedVal = [l, d].filter(Boolean).join(' ');
                timeStr += `<br><small style="color:#64748b;">Dep: ${combinedVal}</small>`;
            }

            let statusBadge = '';
            if (g.pickup_arranged && g.dropoff_arranged) statusBadge = '<span class="status-badge arrived" style="font-size: 0.7em;">Both Set</span>';
            else if (g.pickup_arranged) statusBadge = '<span class="status-badge arrived" style="font-size: 0.7em;">Pickup Set</span>';
            else if (g.dropoff_arranged) statusBadge = '<span class="status-badge arrived" style="font-size: 0.7em;">Dropoff Set</span>';
            else statusBadge = '<span class="status-badge pending" style="font-size: 0.7em;">Action Needed</span>';

            transportStr = parts.join(' - ') + timeStr + '<br>' + statusBadge;
        }

        let descHtml = '-';
        if (g.description) {
            descHtml = `<div style="font-size: 13px; min-width: 150px; max-width: 300px; white-space: pre-wrap; overflow-wrap: break-word;">${g.description}</div>`;
        }

        tr.innerHTML = `
            <td>${nameHtml}</td>
            <td><span class="side-badge ${g.side === 'Groom' ? 'side-groom' : 'side-bride'}">${g.side || 'Bride'}</span></td>
            <td>${g.pax}</td>
            <td>${g.guest_mobile || '-'}</td>
            <td>${g.hotel || '-'}</td>
            <td class="col-room">${g.room || '-'}</td>
            <td class="col-floor">${g.floor || '-'}</td>
            <td class="col-driver">${driverDetails}</td>
            <td>${daysStr}</td>
            <td class="col-transport">${transportStr}</td>
            <td class="col-status">${statusHtml}</td>
            <td class="col-notes">${descHtml}</td>
            <td class="col-actions">
                <div class="nav-actions">
                    <button class="btn btn-icon-only btn-checkin ${g.checked_in ? 'active' : ''}" onclick="toggleCheckin(${g.id})" title="Mark Arrived">
                        <i data-lucide="map-pin"></i>
                    </button>
                    <button class="btn btn-whatsapp" onclick='openWhatsApp(${JSON.stringify(g)})' title="Send Details via WhatsApp">
                        <i data-lucide="message-circle"></i>
                    </button>
                    <button class="btn btn-icon-only" onclick="deleteGuest(${g.id})" title="Delete Guest" style="color: #ef4444; border-color: #fca5a5;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
            ${adminHtml}
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
    updateAuthUI();
}

function renderTransportTable(data) {
    const tbody = document.getElementById('transport-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const isAdmin = !!getToken();

    // Filters logic
    const fName = filterNameEl ? filterNameEl.value.toLowerCase().trim() : '';
    const filterArrivalDateEl = document.getElementById('filter-arrival-date');
    const fArrDate = filterArrivalDateEl ? filterArrivalDateEl.value : '';
    const filterArrivalTimeEl = document.getElementById('filter-arrival-time');
    const fArrTime = filterArrivalTimeEl ? filterArrivalTimeEl.value : '';

    const filterDepartureDateEl = document.getElementById('filter-departure-date');
    const fDepDate = filterDepartureDateEl ? filterDepartureDateEl.value : '';
    const filterDepartureTimeEl = document.getElementById('filter-departure-time');
    const fDepTime = filterDepartureTimeEl ? filterDepartureTimeEl.value : '';

    let transportGuests = data.filter(g => g.transport_needed || g.arrival_location || g.departure_location);

    transportGuests = transportGuests.filter(g => {
        if (g.side && g.side !== currentSide) return false;
        if (fName && !g.name.toLowerCase().includes(fName)) return false;
        if (fArrDate && g.arrival_date !== fArrDate) return false;
        if (fArrTime && g.arrival_time !== fArrTime) return false;
        if (fDepDate && g.departure_date !== fDepDate) return false;
        if (fDepTime && g.departure_time !== fDepTime) return false;
        return true;
    });

    transportGuests.forEach(g => {
        const tr = document.createElement('tr');

        let membersHtml = '';
        if (g.members_names) { // g.members_names is a string, not an array
            membersHtml = `<div style="font-size: 0.8em; color: #64748b; margin-top: 4px;">+ ${g.members_names}</div>`;
        }

        let arrStr = '-';
        if (g.transport_needed || g.arrival_location || g.arrival_date) {
            let parts = [];
            if (g.transport_type) parts.push(`<strong>${g.transport_type}</strong>`);
            if (g.flight_train_number) parts.push(g.flight_train_number);
            let top = parts.join(' - ');

            let timeStr = '';
            if (g.arrival_location || g.arrival_date || g.arrival_time) {
                let d = [g.arrival_date, g.arrival_time].filter(Boolean).join(' ');
                timeStr = `<br><small style="color:#64748b;">${g.arrival_location || ''} ${d}</small>`;
            }
            arrStr = top + timeStr;
            if (!arrStr.replace(/<[^>]*>/g, '').trim()) arrStr = '-';
        }

        let depStr = '-';
        if (g.dropoff_arranged || g.departure_location || g.departure_date) {
            let parts = [];
            if (g.departure_transport_type) parts.push(`<strong>${g.departure_transport_type}</strong>`);
            if (g.departure_flight_train_number) parts.push(g.departure_flight_train_number);
            let top = parts.join(' - ');

            let timeStr = '';
            if (g.departure_location || g.departure_date || g.departure_time) {
                let d = [g.departure_date, g.departure_time].filter(Boolean).join(' ');
                timeStr = `<br><small style="color:#64748b;">${g.departure_location || ''} ${d}</small>`;
            }
            depStr = top + timeStr;
            if (!depStr.replace(/<[^>]*>/g, '').trim()) depStr = '-';
        }

        let statusBadge = '';
        if (g.pickup_arranged && g.dropoff_arranged) statusBadge = '<span class="status-badge arrived" style="font-size: 0.7em;">Both Set</span>';
        else if (g.pickup_arranged) statusBadge = '<span class="status-badge arrived" style="font-size: 0.7em;">Pickup Set</span>';
        else if (g.dropoff_arranged) statusBadge = '<span class="status-badge arrived" style="font-size: 0.7em;">Dropoff Set</span>';
        else statusBadge = '<span class="status-badge pending" style="font-size: 0.7em;">Action Needed</span>';

        let adminActions = '';
        if (isAdmin) {
            adminActions = `
                <td class="admin-col">
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-sm action-btn edit" onclick="openEdit(${g.id})" title="Edit"><i data-lucide="edit-2"></i></button>
                    </div>
                </td>
            `;
        }

        tr.innerHTML = `
            <td>
                <div style="font-weight: 500;">${g.name}</div>
                ${membersHtml}
            </td>
            <td><span class="side-badge ${g.side === 'Groom' ? 'side-groom' : 'side-bride'}">${g.side || 'Bride'}</span></td>
            <td>${g.guest_mobile || '-'}</td>
            <td>${g.driver_name || '-'}</td>
            <td>${g.driver_mobile || '-'}</td>
            <td>${g.pax}</td>
            <td>${arrStr}</td>
            <td>${depStr}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-buttons" style="justify-content: flex-start;">
                    <a href="https://wa.me/${g.driver_mobile ? g.driver_mobile.replace(/[^0-9]/g, '') : ''}" target="_blank" class="btn btn-outline btn-sm action-btn outline" title="Message Driver" ${!g.driver_mobile ? 'disabled style="pointer-events:none;opacity:0.5"' : ''}><i data-lucide="message-circle"></i></a>
                    <a href="https://wa.me/${g.guest_mobile ? g.guest_mobile.replace(/[^0-9]/g, '') : ''}" target="_blank" class="btn btn-outline btn-sm action-btn outline" title="Message Guest" ${!g.guest_mobile ? 'disabled style="pointer-events:none;opacity:0.5"' : ''}><i data-lucide="user"></i></a>
                </div>
            </td>
            ${adminActions}
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function populateTableDropdowns(data) {
    const arrSelect = document.getElementById('filter-arrival-date');
    const depSelect = document.getElementById('filter-departure-date');
    if (!arrSelect || !depSelect) return;

    // Extract unique populated dates
    const uniqueArrDates = [...new Set(data.map(g => g.arrival_date).filter(Boolean))].sort();
    const uniqueDepDates = [...new Set(data.map(g => g.departure_date).filter(Boolean))].sort();

    // Save current values to restore selection during filter updates
    const currArr = arrSelect.value;
    const currDep = depSelect.value;

    arrSelect.innerHTML = '<option value="">All Arrival Dates</option>';
    uniqueArrDates.forEach(d => {
        arrSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
    if (uniqueArrDates.includes(currArr)) arrSelect.value = currArr;

    depSelect.innerHTML = '<option value="">All Departure Dates</option>';
    uniqueDepDates.forEach(d => {
        depSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
    if (uniqueDepDates.includes(currDep)) depSelect.value = currDep;
}

function populateStatsDropdowns(data) {
    const modeEl = document.getElementById('stats-transport-mode');
    if (!modeEl) return;

    // Default to 'arrivals' if not set
    const mode = modeEl.value || 'arrivals';
    populateStatsDateDropdown(data, mode);
}

function renderTransportStats(data) {
    const ctx = document.getElementById('transportChart');
    if (!ctx) return;

    // View Cleanup: Ensure chart is shown and hotel grid is hidden
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) chartContainer.style.display = 'block';

    const gridContainer = document.getElementById('hotel-block-grid');
    if (gridContainer) gridContainer.style.display = 'none';

    // Hierarchical filters
    const statsTransportModeEl = document.getElementById('stats-transport-mode');
    const statsFilterDateEl = document.getElementById('stats-filter-date');

    const modeVal = statsTransportModeEl ? statsTransportModeEl.value : 'arrivals';
    const selectedDate = statsFilterDateEl ? statsFilterDateEl.value : '';

    // Determine Mode
    const isDepartureMode = modeVal === 'departures';
    const modeLabel = isDepartureMode ? 'Departures' : 'Arrivals';
    const timeField = isDepartureMode ? 'departure_time' : 'arrival_time';
    const detailsField = isDepartureMode ? 'departure_details' : 'arrival_details';

    const thead = document.getElementById('stats-details-thead');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Side</th>
                <th>Pax</th>
                <th>Hotel</th>
                <th>Days Coming</th>
                <th>${isDepartureMode ? 'Departure' : 'Arrival'} Time</th>
                <th>Transport Details</th>
                <th>Driver Name</th>
                <th>Driver Mobile</th>
                <th>Status</th>
            </tr>
        `;
    }

    // Filter to guests who have a time for the current mode and match side
    let filteredGuests = data.filter(g => g[timeField] && (!g.side || g.side === currentSide));

    // Apply specific date filter if a date is selected
    if (selectedDate) {
        const dateField = isDepartureMode ? 'departure_date' : 'arrival_date';
        filteredGuests = filteredGuests.filter(g => g[dateField] === selectedDate);
    }

    const categories = {
        'Morning (06:00-11:59)': [],
        'Afternoon (12:00-16:59)': [],
        'Evening (17:00-20:59)': [],
        'Night (21:00-05:59)': []
    };

    filteredGuests.forEach(g => {
        const timeVal = g[timeField];
        if (!timeVal) return;
        let h = parseInt(timeVal.split(':')[0]);
        if (isNaN(h)) return;

        let label = '';
        if (h >= 6 && h < 12) label = 'Morning (06:00-11:59)';
        else if (h >= 12 && h < 17) label = 'Afternoon (12:00-16:59)';
        else if (h >= 17 && h < 21) label = 'Evening (17:00-20:59)';
        else label = 'Night (21:00-05:59)';

        categories[label].push(g);
    });

    const labels = Object.keys(categories);
    const chartData = labels.map(l => categories[l].length);

    if (window.transportChartInstance) {
        window.transportChartInstance.destroy();
    }

    window.transportChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Number of Guests ${isDepartureMode ? 'Departing' : 'Arriving'}`,
                data: chartData,
                backgroundColor: [
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            onHover: (event, elements) => {
                // If a specific date is selected, we do NOT change the table on hover
                if (selectedDate) return;

                const detailsContainer = document.getElementById('stats-details-container');
                const tbody = document.getElementById('stats-details-tbody');
                const titleLabel = document.getElementById('stats-hover-label');

                if (elements.length > 0 && detailsContainer && tbody) {
                    const idx = elements[0].index;
                    const hoveredLabel = labels[idx];
                    const guests = categories[hoveredLabel];

                    titleLabel.textContent = `${hoveredLabel} (${modeLabel})`;
                    tbody.innerHTML = '';

                    if (guests.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8;">No guests ${isDepartureMode ? 'departing' : 'arriving'} during this block.</td></tr>`;
                    } else {
                        guests.forEach(g => {
                            let transportTop = [g.transport_type, g.flight_train_number].filter(Boolean).join(' - ');
                            let statusBadge = g.checked_in ? '<span class="arrived-badge">Arrived</span>' : '<span class="pending-badge">Pending</span>';

                            let daysArr = [];
                            if (g.day0) daysArr.push('D0');
                            if (g.day1) daysArr.push('D1');
                            if (g.day2) daysArr.push('D2');
                            if (g.day3) daysArr.push('D3');
                            let daysStr = daysArr.length ? daysArr.join(', ') : '<span class="empty-cell">-</span>';

                            tbody.innerHTML += `
                                <tr class="hover-row">
                                    <td style="font-weight: 600; color: var(--text-main);">${g.name}</td>
                                    <td><span class="pax-badge">${g.pax}</span></td>
                                    <td>${g.hotel || '<span class="empty-cell">-</span>'}</td>
                                    <td><span class="days-badge">${daysStr}</span></td>
                                    <td><span class="time-badge">${g[timeField]}</span></td>
                                    <td>${transportTop ? `<span class="transport-badge">${transportTop}</span>` : '<span class="empty-cell">-</span>'}</td>
                                    <td>${g.driver_name || '<span class="empty-cell">-</span>'}</td>
                                    <td>${g.driver_mobile || '<span class="empty-cell">-</span>'}</td>
                                    <td>${statusBadge}</td>
                                </tr>
                            `;
                        });
                    }

                    if (detailsContainer.style.display === 'none') {
                        detailsContainer.style.opacity = 0;
                        detailsContainer.style.transform = "translateY(10px)";
                        detailsContainer.style.display = 'block';
                        setTimeout(() => {
                            detailsContainer.style.opacity = 1;
                            detailsContainer.style.transform = "translateY(0)";
                        }, 500);
                    }

                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#ffffff', // Pure white ticks
                        font: { weight: '600' }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: {
                        color: '#ffffff', // Pure white ticks
                        font: { weight: '600' }
                    },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff', // Pure white legend
                        font: { weight: '700', size: 13 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            const label = context.label;
                            const guests = categories[label];
                            let tooltipLines = [`Count: ${context.parsed.y}`];
                            if (guests.length > 0) {
                                tooltipLines.push(`${modeLabel}:`);
                                guests.forEach(g => tooltipLines.push('- ' + g.name + ' (' + g[timeField] + ')'));
                            }
                            return tooltipLines;
                        }
                    }
                }
            }
        }
    });

    // AUTO-SHOW LOGIC: If a date is selected, show the full list immediately
    if (selectedDate) {
        const detailsContainer = document.getElementById('stats-details-container');
        const tbody = document.getElementById('stats-details-tbody');
        const titleLabel = document.getElementById('stats-hover-label');

        if (detailsContainer && tbody) {
            titleLabel.textContent = `Full Roster for ${selectedDate} (${modeLabel})`;
            tbody.innerHTML = '';

            filteredGuests.forEach(g => {
                let transportTop = [g.transport_type, g.flight_train_number].filter(Boolean).join(' - ');
                let statusBadge = g.checked_in ? '<span class="arrived-badge">Arrived</span>' : '<span class="pending-badge">Pending</span>';

                let daysArr = [];
                if (g.day0) daysArr.push('D0');
                if (g.day1) daysArr.push('D1');
                if (g.day2) daysArr.push('D2');
                if (g.day3) daysArr.push('D3');
                let daysStr = daysArr.length ? daysArr.join(', ') : '<span class="empty-cell">-</span>';

                tbody.innerHTML += `
                    <tr class="hover-row">
                        <td style="font-weight: 600; color: var(--text-main);">${g.name}</td>
                        <td><span class="pax-badge">${g.pax}</span></td>
                        <td>${g.hotel || '<span class="empty-cell">-</span>'}</td>
                        <td><span class="days-badge">${daysStr}</span></td>
                        <td><span class="time-badge">${g[timeField]}</span></td>
                        <td>${transportTop ? `<span class="transport-badge">${transportTop}</span>` : '<span class="empty-cell">-</span>'}</td>
                        <td>${g.driver_name || '<span class="empty-cell">-</span>'}</td>
                        <td>${g.driver_mobile || '<span class="empty-cell">-</span>'}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });

            detailsContainer.style.display = 'block';
            detailsContainer.style.opacity = 1;
            detailsContainer.style.transform = "translateY(0)";

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } else {
        // If no date, hide the table until hover
        const detailsContainer = document.getElementById('stats-details-container');
        if (detailsContainer) detailsContainer.style.display = 'none';
    }
}
function renderHotelStats(data) {
    renderHotelBlockGrid(data);
}

function renderRoomStats(data) {
    // Handled inside renderHotelBlockGrid
}

function renderHotelBlockGrid(data) {
    // Apply Day filter
    const fDayEl = document.getElementById('stats-filter-day');
    const fDay = fDayEl ? fDayEl.value : '';

    let filteredGuests = data.filter(g => !g.side || g.side === currentSide);
    if (fDay === 'day0') filteredGuests = filteredGuests.filter(g => g.day0);
    else if (fDay === 'day1') filteredGuests = filteredGuests.filter(g => g.day1);
    else if (fDay === 'day2') filteredGuests = filteredGuests.filter(g => g.day2);
    else if (fDay === 'day3') filteredGuests = filteredGuests.filter(g => g.day3);

    // Hide the transport chart, show the hotel block grid
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) chartContainer.style.display = 'none';
    if (window.transportChartInstance) {
        window.transportChartInstance.destroy();
        window.transportChartInstance = null;
    }

    const detailsContainer = document.getElementById('stats-details-container');
    if (detailsContainer) detailsContainer.style.display = 'none';

    // Setup hover table header
    const thead = document.getElementById('stats-details-thead');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Side</th>
                <th>Family Members</th>
                <th>Mobile</th>
                <th>Pax</th>
                <th>Hotel</th>
                <th>Room</th>
                <th>Floor</th>
                <th>Days Coming</th>
                <th>Status</th>
            </tr>
        `;
    }

    // Build or reuse the hotel block grid container
    let gridContainer = document.getElementById('hotel-block-grid');
    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.id = 'hotel-block-grid';
        gridContainer.style.cssText = 'max-width: 900px; margin: 0 auto 30px; display: flex; flex-direction: column; gap: 20px;';
        const chartEl = document.querySelector('.chart-container');
        if (chartEl && chartEl.parentNode) {
            chartEl.parentNode.insertBefore(gridContainer, chartEl);
        } else {
            const mainContent = document.querySelector('.content');
            if (mainContent) mainContent.appendChild(gridContainer);
        }
    }
    gridContainer.style.display = 'block';
    gridContainer.innerHTML = '';

    // Group by Hotel (Block) -> Floor
    const blocks = {};
    filteredGuests.forEach(g => {
        const block = g.hotel ? g.hotel.trim() : 'No Hotel Assigned';
        const floor = g.floor ? g.floor.trim() : 'No Floor';
        if (!blocks[block]) blocks[block] = {};
        if (!blocks[block][floor]) blocks[block][floor] = [];
        blocks[block][floor].push(g);
    });

    const blockNames = Object.keys(blocks).sort();

    if (blockNames.length === 0) {
        gridContainer.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-size:1.1rem;">No hotel data available for the selected filter.</div>`;
        return;
    }

    blockNames.forEach(blockName => {
        const floors = blocks[blockName];
        const floorNames = Object.keys(floors).sort();

        // Totals for block header
        const allGuests = floorNames.flatMap(f => floors[f]);
        const totalPax = allGuests.reduce((s, g) => s + g.pax, 0);
        const arrivedPax = allGuests.filter(g => g.checked_in).reduce((s, g) => s + g.pax, 0);
        const pendingPax = totalPax - arrivedPax;

        const blockCard = document.createElement('div');
        blockCard.style.cssText = `background: var(--card-bg); backdrop-filter: var(--glass-blur); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);`;

        // Block header
        blockCard.innerHTML = `
            <div style="background: linear-gradient(135deg, var(--primary), #6366f1); padding: 18px 24px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: #fff; letter-spacing: -0.02em;">🏨 ${blockName}</div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.8); margin-top: 3px;">${floorNames.length} floor(s) &bull; ${allGuests.length} guest group(s)</div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="text-align:center;">
                        <div style="font-size: 1.4rem; font-weight: 800; color: #4ade80;">${arrivedPax}</div>
                        <div style="font-size: 0.7rem; color: #86efac;">Arrived</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size: 1.4rem; font-weight: 800; color: #f87171;">${pendingPax}</div>
                        <div style="font-size: 0.7rem; color: #fca5a5;">Pending</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size: 1.4rem; font-weight: 800; color: #fff;">${totalPax}</div>
                        <div style="font-size: 0.7rem; color: #94a3b8;">Total Pax</div>
                    </div>
                </div>
            </div>
            <div style="padding: 4px 0;" class="floor-list-${blockName.replace(/[^a-zA-Z0-9]/g, '-')}"></div>
        `;

        const floorList = blockCard.querySelector(`.floor-list-${blockName.replace(/[^a-zA-Z0-9]/g, '-')}`);

        floorNames.forEach((floorName, idx) => {
            const guests = floors[floorName];
            const fTotal = guests.reduce((s, g) => s + g.pax, 0);
            const fArrived = guests.filter(g => g.checked_in).reduce((s, g) => s + g.pax, 0);
            const fPending = fTotal - fArrived;
            const fPct = fTotal > 0 ? Math.round((fArrived / fTotal) * 100) : 0;
            const isLast = idx === floorNames.length - 1;

            const floorRow = document.createElement('div');
            floorRow.style.cssText = `display: flex; align-items: center; padding: 18px 24px; gap: 20px; cursor: pointer; transition: all 0.3s ease; border-bottom: ${isLast ? 'none' : '1px solid var(--border)'};`;
            floorRow.innerHTML = `
                <div style="min-width: 120px; font-weight: 700; color: var(--text-main); font-size: 1rem;">Floor: ${floorName}</div>
                <div style="flex: 1;">
                    <div style="height: 12px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="width: ${fPct}%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 99px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 16px; align-items: center; font-size: 0.9rem;">
                    <span style="color: #4ade80; font-weight: 800; text-shadow: 0 0 10px rgba(74, 222, 128, 0.2);">✓ ${fArrived} <span style="font-size: 0.8em; opacity: 0.8;">arr.</span></span>
                    <span style="color: #f87171; font-weight: 800; text-shadow: 0 0 10px rgba(248, 113, 113, 0.2);">✗ ${fPending} <span style="font-size: 0.8em; opacity: 0.8;">pend.</span></span>
                    <span style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 3px 12px; color: #ffffff; font-weight: 700;">${fTotal} PAX</span>
                    <span style="color: var(--primary); font-weight: 800; font-size: 1rem;">${fPct}%</span>
                </div>
            `;

            floorRow.addEventListener('mouseenter', () => {
                floorRow.style.background = 'rgba(255, 255, 255, 0.05)';
                floorRow.style.transform = 'translateX(5px)';
                showHotelRoster(guests, `${blockName} — Floor ${floorName}`, detailsContainer);
            });
            floorRow.addEventListener('mouseleave', () => {
                floorRow.style.background = '';
                floorRow.style.transform = '';
            });

            floorList.appendChild(floorRow);
        });

        gridContainer.appendChild(blockCard);
    });
}

function showHotelRoster(guests, title, detailsContainer) {
    const titleLabel = document.getElementById('stats-hover-label');
    const tbody = document.getElementById('stats-details-tbody');
    if (!titleLabel || !tbody || !detailsContainer) return;

    titleLabel.textContent = title;
    tbody.innerHTML = '';

    if (guests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted); font-style: italic;">No guests assigned here.</td></tr>';
    } else {
        guests.forEach(g => {
            let statusBadge = g.checked_in ? '<span class="status-badge arrived">Arrived</span>' : '<span class="status-badge pending">Pending</span>';
            let daysArr = [];
            if (g.day0) daysArr.push('D0');
            if (g.day1) daysArr.push('D1');
            if (g.day2) daysArr.push('D2');
            if (g.day3) daysArr.push('D3');
            let daysStr = daysArr.length ? daysArr.join(', ') : '<span class="empty-cell">-</span>';

            tbody.innerHTML += `
                <tr class="hover-row">
                    <td style="font-weight: 700; color: var(--text-main); padding: 16px 12px;">${g.name}</td>
                    <td><span class="side-badge ${g.side === 'Groom' ? 'side-groom' : 'side-bride'}">${g.side || 'Bride'}</span></td>
                    <td style="font-size: 0.85em; color: var(--text-muted);">${g.members_names || '<span class="empty-cell">-</span>'}</td>
                    <td style="color: var(--text-main);">${g.guest_mobile || '<span class="empty-cell">-</span>'}</td>
                    <td><span class="pax-badge">${g.pax}</span></td>
                    <td style="color: var(--text-main);">${g.hotel || '<span class="empty-cell">-</span>'}</td>
                    <td><span style="font-weight:800; color: #93c5fd;">${g.room || '<span class="empty-cell">-</span>'}</span></td>
                    <td style="color: var(--text-main);">${g.floor || '<span class="empty-cell">-</span>'}</td>
                    <td><span class="time-badge">${daysStr}</span></td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
    }

    if (detailsContainer.style.display === 'none') {
        detailsContainer.style.opacity = 0;
        detailsContainer.style.transform = 'translateY(10px)';
        detailsContainer.style.display = 'block';
        setTimeout(() => {
            detailsContainer.style.opacity = 1;
            detailsContainer.style.transform = 'translateY(0)';
        }, 50);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateStats(data) {
    if (!totalPaxEl || !arrivedPaxEl) return;

    // Check for day filter in Stats page context
    const fDayEl = document.getElementById('stats-filter-day');
    const fDay = fDayEl ? fDayEl.value : '';

    let tPax = 0; let aPax = 0;
    data.forEach(g => {
        if (g.side && g.side !== currentSide) return;

        // Apply day filter if present
        if (fDay) {
            if (fDay === 'day0' && !g.day0) return;
            if (fDay === 'day1' && !g.day1) return;
            if (fDay === 'day2' && !g.day2) return;
            if (fDay === 'day3' && !g.day3) return;
        }

        tPax += g.pax;
        if (g.checked_in) aPax += g.pax;
    });
    totalPaxEl.textContent = tPax;
    arrivedPaxEl.textContent = aPax;
}

function handleExport() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('Error: Excel library (XLSX) is not loaded or was blocked by the browser.');
            return;
        }
        if (!guestsList || guestsList.length === 0) {
            alert('No guests data available to export.');
            return;
        }

        const exportData = guestsList.map(g => ({
            "Guest Name": g.name,
            "Side": g.side || "Bride",
            "Guest Mobile": g.guest_mobile,
            "Pax": g.pax,
            "Family Members": g.members_names,
            "Hotel Name": g.hotel,
            "Room No": g.room,
            "Floor": g.floor,
            "Driver Name": g.driver_name,
            "Driver Mobile No": g.driver_mobile,
            "Day 0": g.day0 ? "Y" : "N",
            "Day 1": g.day1 ? "Y" : "N",
            "Day 2": g.day2 ? "Y" : "N",
            "Day 3": g.day3 ? "Y" : "N",
            "Checked In": g.checked_in ? "YES" : "NO",
            "Transport Needed": g.transport_needed ? "YES" : "NO",
            "Transport Type": g.transport_type || "",
            "Arrival Location": g.arrival_location || "",
            "Arrival Date": g.arrival_date || "",
            "Arrival Time": g.arrival_time || "",
            "Flight/Train No": g.flight_train_number || "",
            "Pickup Arranged": g.pickup_arranged ? "YES" : "NO",
            "Dropoff Arranged": g.dropoff_arranged ? "YES" : "NO",
            "Departure Transport Type": g.departure_transport_type || "",
            "Departure Location": g.departure_location || "",
            "Departure Flight/Train No": g.departure_flight_train_number || "",
            "Departure Date": g.departure_date || "",
            "Departure Time": g.departure_time || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Guests");

        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "Niyarra_Guests.xlsx";
        document.body.appendChild(a);

        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);

    } catch (err) {
        console.error(err);
        alert("Export Exception: " + err.message);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-export')) {
        handleExport();
    }
});

// Auth Handlers
const btnLoginModal = document.getElementById('btn-login-modal');
if (btnLoginModal) btnLoginModal.addEventListener('click', () => {
    document.getElementById('login-modal').classList.remove('hidden');
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.add('hidden');
    });
});

const loginForm = document.getElementById('login-form');
if (loginForm) loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;

    if (u === 'admin' && p === 'admin') {
        setToken();
        document.getElementById('login-modal').classList.add('hidden');
        window.location.reload();
    } else {
        let errorEl = document.getElementById('login-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'login-error';
            errorEl.className = 'error-msg';
            errorEl.style.color = 'red';
            errorEl.style.marginBottom = '10px';
            loginForm.prepend(errorEl);
        }
        errorEl.innerText = "Invalid credentials. Try admin/admin.";
    }
});

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', () => {
    removeToken();
    window.location.reload();
});

// Edit Guest Handler
function openEdit(id) {
    const g = guestsList.find(x => x.id === id);
    if (!g) return;
    document.getElementById('edit-guest-id').value = g.id;
    document.getElementById('edit-guest-name').value = g.name;
    document.getElementById('edit-guest-pax').value = g.pax;
    document.getElementById('edit-guest-mobile').value = g.guest_mobile || '';
    document.getElementById('edit-guest-hotel').value = g.hotel || '';
    document.getElementById('edit-guest-room').value = g.room || '';
    document.getElementById('edit-guest-floor').value = g.floor || '';
    document.getElementById('edit-guest-driver-name').value = g.driver_name || '';
    document.getElementById('edit-guest-driver').value = g.driver_mobile || '';

    // Set Side
    const sideValue = g.side || 'Bride';
    const sideRadio = document.querySelector(`#edit-guest-side-selector input[value="${sideValue}"]`);
    if (sideRadio) {
        sideRadio.checked = true;
        // Update active class on parent label
        document.querySelectorAll('#edit-guest-side-selector .form-side-option').forEach(opt => {
            if (opt.querySelector('input').value === sideValue) opt.classList.add('active');
            else opt.classList.remove('active');
        });
    }

    // Check if new parameters exist in document before assigning (for backward compatibility if missing)
    if (document.getElementById('edit-guest-extra-bedding')) document.getElementById('edit-guest-extra-bedding').checked = !!g.extra_bedding;
    if (document.getElementById('edit-guest-description')) document.getElementById('edit-guest-description').value = g.description || '';

    if (typeof renderFamilyMembers === 'function') renderFamilyMembers('edit-guest-pax', 'edit-family-members-container', g.members_names);
    document.getElementById('edit-guest-day0').checked = g.day0;
    document.getElementById('edit-guest-day1').checked = g.day1;
    document.getElementById('edit-guest-day2').checked = g.day2;
    document.getElementById('edit-guest-day3').checked = g.day3;

    document.getElementById('edit-guest-transport-needed').checked = !!g.transport_needed;
    document.getElementById('edit-transport-details').style.display = g.transport_needed ? 'block' : 'none';
    document.getElementById('edit-guest-transport-type').value = g.transport_type || '';
    document.getElementById('edit-guest-arrival-location').value = g.arrival_location || '';
    document.getElementById('edit-guest-arrival-date').value = g.arrival_date || '';
    document.getElementById('edit-guest-arrival-time').value = g.arrival_time || '';
    document.getElementById('edit-guest-flight-train').value = g.flight_train_number || '';
    document.getElementById('edit-guest-pickup-arranged').checked = !!g.pickup_arranged;
    document.getElementById('edit-guest-dropoff-arranged').checked = !!g.dropoff_arranged;
    document.getElementById('edit-dropoff-details').style.display = g.dropoff_arranged ? 'block' : 'none';
    document.getElementById('edit-guest-departure-transport-type').value = g.departure_transport_type || '';
    document.getElementById('edit-guest-departure-location').value = g.departure_location || '';
    document.getElementById('edit-guest-departure-flight-train').value = g.departure_flight_train_number || '';
    document.getElementById('edit-guest-departure-date').value = g.departure_date || '';
    document.getElementById('edit-guest-departure-time').value = g.departure_time || '';

    // Dynamic Display Logic for Modification Departments
    const deptSelect = document.getElementById('department-role');
    if (deptSelect) {
        const role = deptSelect.value;
        // Base elements we want to toggle
        const allFormGroups = document.querySelectorAll('#edit-guest-form .form-group, #edit-guest-form .form-row');

        if (role === 'hotel') {
            document.getElementById('edit-family-members-container').style.display = 'none';
            allFormGroups.forEach(el => el.style.display = 'none');
            if (document.getElementById('edit-hotel-row')) {
                const hRow = document.getElementById('edit-hotel-row');
                hRow.style.display = 'flex';
                hRow.querySelectorAll('.form-group').forEach(c => c.style.display = 'block');
            }
            if (document.getElementById('edit-bedding-row')) document.getElementById('edit-bedding-row').style.display = 'block';
        } else if (role === 'transport') {
            document.getElementById('edit-family-members-container').style.display = 'none';
            allFormGroups.forEach(el => el.style.display = 'none');
            if (document.getElementById('edit-driver-name-row')) document.getElementById('edit-driver-name-row').style.display = 'block';
            // Driver Mobile is usually its own group right after driver_name
            const driverMobileNode = document.getElementById('edit-guest-driver').closest('.form-group');
            if (driverMobileNode) driverMobileNode.style.display = 'block';
        } else {
            // RSVP or master view: Show everything
            allFormGroups.forEach(el => {
                if (el.id !== 'edit-transport-details' && el.id !== 'edit-dropoff-details' && el.id !== 'edit-family-members-container') {
                    el.style.display = el.classList.contains('form-row') ? 'flex' : 'block';
                }
            });
            document.getElementById('edit-transport-details').style.display = g.transport_needed ? 'block' : 'none';
            document.getElementById('edit-dropoff-details').style.display = g.dropoff_arranged ? 'block' : 'none';
        }
    }

    document.getElementById('edit-modal').classList.remove('hidden');
}

const editGuestForm = document.getElementById('edit-guest-form');
if (editGuestForm) editGuestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-guest-id').value;
    const payload = {
        name: document.getElementById('edit-guest-name')?.value || "",
        pax: parseInt(document.getElementById('edit-guest-pax')?.value || 1),
        hotel: document.getElementById('edit-guest-hotel')?.value || "",
        room: document.getElementById('edit-guest-room')?.value || "",
        floor: document.getElementById('edit-guest-floor')?.value || "",
        guest_mobile: document.getElementById('edit-guest-mobile')?.value || "",
        members_names: Array.from(document.querySelectorAll('.edit-guest-pax-member')).map(el => el.value).filter(v => v).join(', '),
        driver_name: document.getElementById('edit-guest-driver-name')?.value || "",
        driver_mobile: document.getElementById('edit-guest-driver')?.value || "",
        description: document.getElementById('edit-guest-description')?.value || "",
        extra_bedding: document.getElementById('edit-guest-extra-bedding')?.checked || false,
        day0: document.getElementById('edit-guest-day0')?.checked || false,
        day1: document.getElementById('edit-guest-day1')?.checked || false,
        day2: document.getElementById('edit-guest-day2')?.checked || false,
        day3: document.getElementById('edit-guest-day3')?.checked || false,
        transport_needed: document.getElementById('edit-guest-transport-needed')?.checked || false,
        transport_type: document.getElementById('edit-guest-transport-type')?.value || "",
        arrival_location: document.getElementById('edit-guest-arrival-location')?.value || "",
        arrival_date: document.getElementById('edit-guest-arrival-date')?.value || "",
        arrival_time: document.getElementById('edit-guest-arrival-time')?.value || "",
        flight_train_number: document.getElementById('edit-guest-flight-train')?.value || "",
        pickup_arranged: document.getElementById('edit-guest-pickup-arranged')?.checked || false,
        dropoff_arranged: document.getElementById('edit-guest-dropoff-arranged')?.checked || false,
        departure_transport_type: document.getElementById('edit-guest-departure-transport-type')?.value || "",
        departure_location: document.getElementById('edit-guest-departure-location')?.value || "",
        departure_flight_train_number: document.getElementById('edit-guest-departure-flight-train')?.value || "",
        departure_date: document.getElementById('edit-guest-departure-date')?.value || "",
        departure_time: document.getElementById('edit-guest-departure-time')?.value || "",
        side: document.querySelector('input[name="edit_guest_side"]:checked')?.value || "Bride"
    };

    try {
        await fetch(`${API_URL}/guests/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });
        document.getElementById('edit-modal').classList.add('hidden');
        fetchGuests();
    } catch (e) { console.error(e); }
});

// Init
if (addForm) addForm.addEventListener('submit', handleAddGuest);

function renderFamilyMembers(paxInputId, containerId, existingMembersStr = '') {
    const paxEl = document.getElementById(paxInputId);
    const container = document.getElementById(containerId);
    if (!paxEl || !container) return;

    const count = parseInt(paxEl.value) || 1;
    container.innerHTML = '';

    if (count > 1) {
        container.style.display = 'block';
        let existing = [];
        if (existingMembersStr) {
            existing = existingMembersStr.split(',').map(s => s.trim());
        }

        container.innerHTML = '<label style="display:block; margin-bottom: 5px;">Other Family Members</label>';
        for (let i = 2; i <= count; i++) {
            const val = existing[i - 2] || '';
            container.innerHTML += `<div class="form-group"><input type="text" class="${paxInputId}-member" placeholder="Family Member ${i - 1} Name" value="${val}" style="margin-bottom: 10px;"></div>`;
        }
    } else {
        container.style.display = 'none';
    }
}

const addPaxEl = document.getElementById('guest-pax');
if (addPaxEl) addPaxEl.addEventListener('input', () => renderFamilyMembers('guest-pax', 'family-members-container'));

const editPaxEl = document.getElementById('edit-guest-pax');
if (editPaxEl) editPaxEl.addEventListener('input', () => renderFamilyMembers('edit-guest-pax', 'edit-family-members-container'));

[filterNameEl, filterStatusEl, filterDayEl].forEach(el => {
    if (el) el.addEventListener('input', () => {
        if (document.getElementById('guest-tbody')) renderTable(guestsList);
        if (document.getElementById('transport-tbody')) renderTransportTable(guestsList);
    });
});

const filterArrivalDateEl = document.getElementById('filter-arrival-date');
if (filterArrivalDateEl) filterArrivalDateEl.addEventListener('change', () => {
    if (document.getElementById('transport-tbody')) renderTransportTable(guestsList);
});

const filterArrivalTimeEl = document.getElementById('filter-arrival-time');
if (filterArrivalTimeEl) filterArrivalTimeEl.addEventListener('change', () => {
    if (document.getElementById('transport-tbody')) renderTransportTable(guestsList);
});

const filterDepartureDateEl = document.getElementById('filter-departure-date');
if (filterDepartureDateEl) filterDepartureDateEl.addEventListener('change', () => {
    if (document.getElementById('transport-tbody')) renderTransportTable(guestsList);
});

const filterDepartureTimeEl = document.getElementById('filter-departure-time');
if (filterDepartureTimeEl) filterDepartureTimeEl.addEventListener('change', () => {
    if (document.getElementById('transport-tbody')) renderTransportTable(guestsList);
});

// Hierarchical Analytics Filters
function populateStatsDateDropdown(data, mode) {
    const dateEl = document.getElementById('stats-filter-date');
    if (!dateEl) return;

    const field = mode === 'departures' ? 'departure_date' : 'arrival_date';
    const uniqueDates = [...new Set(data.map(g => g[field]).filter(Boolean))].sort();

    dateEl.innerHTML = '<option value="">All Dates</option>';
    uniqueDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        dateEl.appendChild(option);
    });
}

const statsTransportModeEl = document.getElementById('stats-transport-mode');
const statsFilterDateEl = document.getElementById('stats-filter-date');

if (statsTransportModeEl) {
    statsTransportModeEl.addEventListener('change', () => {
        populateStatsDateDropdown(guestsList, statsTransportModeEl.value);
        if (document.getElementById('transportChart')) renderTransportStats(guestsList);
    });
}

if (statsFilterDateEl) {
    statsFilterDateEl.addEventListener('change', () => {
        if (document.getElementById('transportChart')) renderTransportStats(guestsList);
    });
}

const statsFilterDayEl = document.getElementById('stats-filter-day');
if (statsFilterDayEl) statsFilterDayEl.addEventListener('change', () => {
    updateStats(guestsList);
    if (document.getElementById('transportChart')) {
        const mode = document.getElementById('stats-type-selector') ? document.getElementById('stats-type-selector').value : 'hotels';
        if (mode === 'hotels') {
            renderHotelStats(guestsList);
            renderRoomStats(guestsList);
        }
    }
});

const statsTypeSelector = document.getElementById('stats-type-selector');
if (statsTypeSelector) {
    statsTypeSelector.addEventListener('change', () => {
        if (statsTypeSelector.value === 'transportation') {
            document.getElementById('transportation-filters').style.display = 'flex';
            const hf = document.getElementById('hotel-filters'); if (hf) hf.style.display = 'none';
            const rc = document.getElementById('room-chart-container'); if (rc) rc.style.display = 'none';
            document.getElementById('stats-description').textContent = "Visualizing guest influx volumes across the day footprint. Hover over a bar to see specifics.";
            populateStatsDropdowns(guestsList);
            renderTransportStats(guestsList);
        } else if (statsTypeSelector.value === 'hotels') {
            document.getElementById('transportation-filters').style.display = 'none';
            const hf = document.getElementById('hotel-filters'); if (hf) hf.style.display = 'flex';
            const rc = document.getElementById('room-chart-container'); if (rc) rc.style.display = 'block';
            document.getElementById('stats-description').textContent = "Visualizing guest distribution across registered hotels alongside Floor allocations.";
            renderHotelStats(guestsList);
            renderRoomStats(guestsList);
        }
    });
}

window.viewNote = function (id) {
    const guest = guestsList.find(g => g.id === id);
    if (!guest) return;
    const modal = document.getElementById('note-modal');
    if (modal) {
        document.getElementById('note-text').textContent = guest.description || 'No notes available.';
        modal.classList.remove('hidden');
    } else {
        alert(guest.description);
    }
};


// Global Initializations
initSideSelector();
initFormSideSelectors();
fetchGuests();

// Dynamic Table Column Enforcements
const deptSelectInstance = document.getElementById('department-role');
if (deptSelectInstance) {
    deptSelectInstance.addEventListener('change', (e) => {
        const table = document.getElementById('guest-table');
        if (table) {
            table.classList.remove('dept-hotel', 'dept-transport');
            if (e.target.value === 'hotel') table.classList.add('dept-hotel');
            if (e.target.value === 'transport') table.classList.add('dept-transport');
        }
    });
    // Trigger on load
    deptSelectInstance.dispatchEvent(new Event('change'));
}

// --- Message Scheduling Logic ---
let msgPageInitialized = false;

window.initMessagePage = async function () {
    if (msgPageInitialized) {
        // Already initialized: just re-render for side changes
        if (typeof _msgUpdateCount === 'function') _msgUpdateCount();
        if (typeof _msgRenderTable === 'function') _msgRenderTable();
        return;
    }
    msgPageInitialized = true;

    const bulkForm = document.getElementById('bulk-schedule-form');
    const messagesTbody = document.getElementById('messages-tbody');

    // Edit Modals
    const editModal = document.getElementById('msg-edit-modal');
    const editForm = document.getElementById('msg-edit-form');
    const bulkEditModal = document.getElementById('bulk-edit-modal');
    const bulkEditForm = document.getElementById('bulk-edit-form');
    const btnBulkEditSelected = document.getElementById('btn-bulk-edit-selected');
    const bulkEditCountSpan = document.getElementById('bulk-edit-count');
    const bulkEditGuestList = document.getElementById('bulk-edit-guest-list');
    const bulkEditActions = document.getElementById('bulk-edit-actions');

    // Filters
    const filterName = document.getElementById('msg-filter-name');
    const filterDay = document.getElementById('msg-filter-day');
    const filterStatus = document.getElementById('msg-filter-status');
    const filterPurpose = document.getElementById('msg-filter-purpose');
    const matchingCountVal = document.getElementById('matching-guests-val');

    if (!messagesTbody || !bulkForm) return;

    let localGuests = [];
    let localMessages = [];


    function getFilteredGuests() {
        const fName = filterName?.value.toLowerCase() || '';
        const fDay = filterDay?.value || 'all';
        const fStatus = filterStatus?.value || 'all';

        return localGuests.filter(g => {
            if (g.side && g.side !== currentSide) return false;
            if (fName && !g.name.toLowerCase().includes(fName)) return false;
            if (fDay !== 'all') {
                if (fDay === '0' && !g.day0) return false;
                if (fDay === '1' && !g.day1) return false;
                if (fDay === '2' && !g.day2) return false;
                if (fDay === '3' && !g.day3) return false;
            }
            if (fStatus === 'arrived' && !g.checked_in) return false;
            if (fStatus === 'pending' && g.checked_in) return false;
            return true;
        });
    }

    function updateMatchingCount() {
        if (matchingCountVal) matchingCountVal.textContent = getFilteredGuests().length;
    }
    // Expose for singleton re-render
    window._msgUpdateCount = updateMatchingCount;

    // Wire up all filter controls
    if (filterName) filterName.addEventListener('input', updateMatchingCount);
    if (filterDay) filterDay.addEventListener('change', updateMatchingCount);
    if (filterStatus) filterStatus.addEventListener('change', updateMatchingCount);
    if (filterPurpose) filterPurpose.addEventListener('input', () => renderMessageTable());
    document.querySelectorAll('.global-side-selector').forEach(sel => {
        sel.addEventListener('change', () => { updateMatchingCount(); renderMessageTable(); });
    });

    function getFilteredMessages() {
        const fPurpose = filterPurpose?.value.toLowerCase() || '';
        const currentSide = document.querySelector('.global-side-selector')?.value || 'Bride';

        return localMessages.filter(m => {
            // Filter by side (via guest lookup)
            const guest = localGuests.find(g => g.id === m.guest_id);
            if (guest && guest.side !== currentSide) return false;

            // Filter by purpose
            if (fPurpose && (!m.purpose || !m.purpose.toLowerCase().includes(fPurpose))) {
                return false;
            }
            return true;
        });
    }

    // Populate Guests
    async function populateGuests() {
        try {
            const res = await fetch(`${API_URL}/guests`);
            localGuests = await res.json();
            updateMatchingCount();
        } catch (e) { console.error(e); }
    }

    function renderMessageTable() {
        if (!messagesTbody) return;
        window._msgRenderTable = renderMessageTable;
        messagesTbody.innerHTML = '';

        const filtered = getFilteredMessages();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        if (filtered.length === 0) {
            messagesTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">No messages match current filters.</td></tr>';
            bulkEditActions?.classList.add('hidden');
            return;
        }

        bulkEditActions?.classList.remove('hidden');

        filtered.forEach(m => {
            const tr = document.createElement('tr');
            let statusClass = 'status-pending';
            let statusText = m.status;

            if (m.status === 'Pending') {
                if (m.schedule_date < dateStr || (m.schedule_date === dateStr && m.schedule_time <= timeStr)) {
                    statusClass = 'status-due';
                    statusText = 'Due';
                }
            } else if (m.status === 'Sent') {
                statusClass = 'status-sent';
            }

            tr.innerHTML = `
                <td>${m.guest_name}</td>
                <td>${m.purpose || '-'}</td>
                <td>${m.guest_phone}</td>
                <td style="white-space: pre-wrap; font-size: 0.9em; min-width: 200px; max-width: 400px; line-height: 1.4;">${m.message}</td>
                <td>${m.schedule_date}</td>
                <td>${m.schedule_time}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsAppMessage('${m.guest_phone}', '${encodeURIComponent(m.message)}', ${m.id})" title="Send Now">
                            <i data-lucide="send"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="openMessageEdit(${m.id})" title="Edit">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="deleteScheduledMessage(${m.id})" title="Delete">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            `;
            messagesTbody.appendChild(tr);
        });
        if (window.lucide) window.lucide.createIcons();
    }

    async function fetchAndRenderMessages() {
        try {
            const res = await fetch(`${API_URL}/messages`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            localMessages = await res.json();
            renderMessageTable();
        } catch (e) { console.error(e); }
    }

    // Modal Close logic
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            editModal.classList.add('hidden');
        });
    });

    window.openMessageEdit = function (id) {
        const msg = localMessages.find(m => m.id === id);
        if (!msg) return;

        document.getElementById('edit-msg-id').value = msg.id;
        document.getElementById('edit-msg-guest').value = msg.guest_name;
        document.getElementById('edit-msg-content').value = msg.message;
        document.getElementById('edit-msg-purpose').value = msg.purpose || '';
        document.getElementById('edit-msg-date').value = msg.schedule_date;
        document.getElementById('edit-msg-time').value = msg.schedule_time;

        editModal.classList.remove('hidden');
        lucide.createIcons();
    };

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-msg-id').value;
        const baseContent = document.getElementById('edit-msg-content').value;
        const timeVal = document.getElementById('edit-msg-time').value;

        // Find existing message to get guest name
        const existingMsg = localMessages.find(m => m.id == id);
        if (!existingMsg) return;

        const payload = {
            message: baseContent,
            purpose: document.getElementById('edit-msg-purpose').value,
            schedule_date: document.getElementById('edit-msg-date').value,
            schedule_time: timeVal
        };

        try {
            const res = await fetch(`${API_URL}/messages/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                editModal.classList.add('hidden');
                fetchAndRenderMessages();
            }
        } catch (e) { console.error(e); }
    });

    // Bulk Edit Logic
    btnBulkEditSelected.addEventListener('click', () => {
        const filtered = getFilteredMessages();
        if (filtered.length === 0) return alert('No messages match the current filters!');

        bulkEditCountSpan.textContent = filtered.length;

        // Pre-fill with first message's content/purpose for convenience
        const firstMsg = filtered[0];
        if (firstMsg) {
            document.getElementById('bulk-edit-content').value = firstMsg.message || '';
            document.getElementById('bulk-edit-purpose').value = firstMsg.purpose || '';
            document.getElementById('bulk-edit-date').value = firstMsg.schedule_date || '';
            document.getElementById('bulk-edit-time').value = firstMsg.schedule_time || '';
        }

        // Populate guest names list in modal
        if (bulkEditGuestList) {
            const guestNames = [...new Set(filtered.map(m => m.guest_name))];
            bulkEditGuestList.innerHTML = guestNames.map(name =>
                `<span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${name}</span>`
            ).join('');
        }

        bulkEditModal.classList.remove('hidden');
    });

    bulkEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDate = document.getElementById('bulk-edit-date').value;
        const newTime = document.getElementById('bulk-edit-time').value;
        const newContent = document.getElementById('bulk-edit-content').value;
        const newPurpose = document.getElementById('bulk-edit-purpose').value;

        if (!newDate && !newTime && !newContent && !newPurpose) return alert('Please provide at least one field to update');

        const filtered = getFilteredMessages();
        if (filtered.length === 0) return;

        // If message is being updated, we loop to individualize greetings
        if (newContent) {
            let successCount = 0;
            let failCount = 0;
            const timeToUse = newTime || filtered[0].schedule_time;
            for (const m of filtered) {
                const payload = {
                    message: newContent,
                    purpose: newPurpose || m.purpose,
                    schedule_date: newDate || m.schedule_date,
                    schedule_time: timeToUse
                };

                try {
                    const res = await fetch(`${API_URL}/messages/${m.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getToken()}`
                        },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch (err) { failCount++; }
            }
            bulkEditModal.classList.add('hidden');
            fetchAndRenderMessages();
            alert(`Updated ${successCount} messages with personalized greetings.`);
        } else {
            // Only date/time/purpose changed, use bulk endpoint
            const payload = {};
            if (newDate) payload.schedule_date = newDate;
            if (newTime) payload.schedule_time = newTime;
            if (newPurpose) payload.purpose = newPurpose;

            try {
                const res = await fetch(`${API_URL}/messages/bulk-edit`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        msg_ids: filtered.map(m => m.id),
                        msg_update: payload
                    })
                });
                if (res.ok) {
                    bulkEditModal.classList.add('hidden');
                    fetchAndRenderMessages();
                    alert(`Successfully updated ${filtered.length} messages.`);
                } else {
                    const errData = await res.json();
                    const detail = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail, null, 2);
                    alert(`Failed to update: ${detail || res.statusText}`);
                }
            } catch (e) {
                console.error(e);
                alert('An unexpected error occurred during bulk update.');
            }
        }
    });


    // Bulk Logic
    bulkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const filtered = getFilteredGuests();
        if (filtered.length === 0) return alert('No guests match the filters!');
        if (!confirm(`Schedule this message for all ${filtered.length} matching guests?`)) return;

        const baseMsg = document.getElementById('bulk-msg-content').value;
        const dateVal = document.getElementById('bulk-msg-date').value;
        const timeVal = document.getElementById('bulk-msg-time').value;
        const purposeVal = document.getElementById('bulk-msg-purpose').value;
        let successCount = 0;
        let failCount = 0;

        for (const g of filtered) {
            const payload = {
                guest_id: g.id,
                guest_name: g.name,
                guest_phone: g.guest_mobile || "",
                message: baseMsg,
                purpose: purposeVal,
                schedule_date: dateVal,
                schedule_time: timeVal
            };

            try {
                const res = await fetch(`${API_URL}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch (err) {
                console.error('Error scheduling for guest', g.name, err);
                failCount++;
            }
        }

        if (failCount > 0) {
            alert(`Execution finished: ${successCount} successful, ${failCount} failed.`);
        } else {
            alert(`Successfully scheduled ${successCount} messages.`);
        }
        bulkForm.reset();
        fetchAndRenderMessages();
    });

    window.deleteScheduledMessage = async function (id) {
        if (!confirm('Are you sure you want to delete this scheduled message?')) return;
        try {
            await fetch(`${API_URL}/messages/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            fetchAndRenderMessages();
        } catch (e) { console.error(e); }
    };

    window.sendWhatsAppMessage = async function (phone, message, id) {
        if (!phone) return alert('No phone number available for this guest.');
        const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`;
        window.open(url, '_blank');

        try {
            await fetch(`${API_URL}/messages/${id}/status?status_update=Sent`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            fetchAndRenderMessages();
        } catch (e) { console.error(e); }
    };

    await populateGuests();
    await fetchAndRenderMessages();
    lucide.createIcons();
};
