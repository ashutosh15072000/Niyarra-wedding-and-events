const API_URL = '/api';
let guestsList = [];

// DOM Elements
const tbody = document.getElementById('guest-tbody');
const totalPaxEl = document.getElementById('total-pax');
const arrivedPaxEl = document.getElementById('arrived-pax');
const addForm = document.getElementById('add-guest-form');

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
        if(blm) blm.classList.add('hidden');
        const blo = document.getElementById('btn-logout');
        if(blo) blo.classList.remove('hidden');
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
        name: document.getElementById('guest-name').value,
        pax: parseInt(document.getElementById('guest-pax').value),
        hotel: document.getElementById('guest-hotel').value,
        room: document.getElementById('guest-room').value,
        floor: document.getElementById('guest-floor').value,
        guest_mobile: document.getElementById('guest-mobile').value,
        members_names: Array.from(document.querySelectorAll('.guest-pax-member')).map(el => el.value).filter(v => v).join(', '),
        driver_name: document.getElementById('guest-driver-name').value,
        driver_mobile: document.getElementById('guest-driver').value,
        day0: document.getElementById('guest-day0').checked,
        day1: document.getElementById('guest-day1').checked,
        day2: document.getElementById('guest-day2').checked,
        day3: document.getElementById('guest-day3').checked,
        description: document.getElementById('guest-description').value,
        extra_bedding: document.getElementById('guest-extra-bedding').checked,
        transport_needed: document.getElementById('guest-transport-needed').checked,
        transport_type: document.getElementById('guest-transport-type').value,
        arrival_location: document.getElementById('guest-arrival-location').value,
        arrival_date: document.getElementById('guest-arrival-date').value,
        arrival_time: document.getElementById('guest-arrival-time').value,
        flight_train_number: document.getElementById('guest-flight-train').value,
        pickup_arranged: document.getElementById('guest-pickup-arranged').checked,
        dropoff_arranged: document.getElementById('guest-dropoff-arranged').checked,
        departure_transport_type: document.getElementById('guest-departure-transport-type').value,
        departure_location: document.getElementById('guest-departure-location').value,
        departure_flight_train_number: document.getElementById('guest-departure-flight-train').value,
        departure_date: document.getElementById('guest-departure-date').value,
        departure_time: document.getElementById('guest-departure-time').value
    };
    try {
        await fetch(`${API_URL}/guests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        addForm.reset();
        fetchGuests();
    } catch (e) { console.error(e); }
}

async function toggleCheckin(id) {
    try {
        await fetch(`${API_URL}/guests/${id}/checkin`, { method: 'PUT' });
        fetchGuests();
    } catch (e) { console.error(e); }
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

        let adminHtml = '';
        if (isAdmin) {
            adminHtml = `<td class="admin-col"><button class="btn btn-outline" onclick="openEdit(${g.id})"><i data-lucide="edit"></i> Edit</button></td>`;
        } else {
            adminHtml = `<td class="admin-col hidden"></td>`; // Keep structure but hide
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

    // Filter to guests who have a time for the current mode
    let filteredGuests = data.filter(g => g[timeField]);

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
    
    let filteredGuests = data;
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
            <div style="padding: 4px 0;" class="floor-list-${blockName.replace(/[^a-zA-Z0-9]/g,'-')}"></div>
        `;

        const floorList = blockCard.querySelector(`.floor-list-${blockName.replace(/[^a-zA-Z0-9]/g,'-')}`);

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
    let tPax = 0; let aPax = 0;
    data.forEach(g => {
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
        name: document.getElementById('edit-guest-name').value,
        pax: parseInt(document.getElementById('edit-guest-pax').value),
        hotel: document.getElementById('edit-guest-hotel').value,
        room: document.getElementById('edit-guest-room').value,
        floor: document.getElementById('edit-guest-floor').value,
        guest_mobile: document.getElementById('edit-guest-mobile').value,
        members_names: Array.from(document.querySelectorAll('.edit-guest-pax-member')).map(el => el.value).filter(v => v).join(', '),
        driver_name: document.getElementById('edit-guest-driver-name').value,
        driver_mobile: document.getElementById('edit-guest-driver') ? document.getElementById('edit-guest-driver').value : '',
        description: document.getElementById('edit-guest-description') ? document.getElementById('edit-guest-description').value : '',
        extra_bedding: document.getElementById('edit-guest-extra-bedding') ? document.getElementById('edit-guest-extra-bedding').checked : false,
        day0: document.getElementById('edit-guest-day0').checked,
        day1: document.getElementById('edit-guest-day1').checked,
        day2: document.getElementById('edit-guest-day2').checked,
        day3: document.getElementById('edit-guest-day3').checked,
        transport_needed: document.getElementById('edit-guest-transport-needed').checked,
        transport_type: document.getElementById('edit-guest-transport-type').value,
        arrival_location: document.getElementById('edit-guest-arrival-location').value,
        arrival_date: document.getElementById('edit-guest-arrival-date').value,
        arrival_time: document.getElementById('edit-guest-arrival-time').value,
        flight_train_number: document.getElementById('edit-guest-flight-train').value,
        pickup_arranged: document.getElementById('edit-guest-pickup-arranged').checked,
        dropoff_arranged: document.getElementById('edit-guest-dropoff-arranged').checked,
        departure_transport_type: document.getElementById('edit-guest-departure-transport-type').value,
        departure_location: document.getElementById('edit-guest-departure-location').value,
        departure_flight_train_number: document.getElementById('edit-guest-departure-flight-train').value,
        departure_date: document.getElementById('edit-guest-departure-date').value,
        departure_time: document.getElementById('edit-guest-departure-time').value
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
