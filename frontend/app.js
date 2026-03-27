const API_URL = '/api';
let guestsList = [];

// DOM Elements
const tbody = document.getElementById('guest-tbody');
const totalPaxEl = document.getElementById('total-pax');
const arrivedPaxEl = document.getElementById('arrived-pax');
const addForm = document.getElementById('add-guest-form');

// Auth Flow
function getToken() { return localStorage.getItem('niyarra_token'); }
function setToken(token) { localStorage.setItem('niyarra_token', token); }
function removeToken() { localStorage.removeItem('niyarra_token'); }

// Filters
const filterNameEl = document.getElementById('filter-name');
const filterStatusEl = document.getElementById('filter-status');
const filterDayEl = document.getElementById('filter-day');

function updateAuthUI() {
    const token = getToken();
    if (token) {
        document.getElementById('btn-login-modal').classList.add('hidden');
        document.getElementById('btn-logout').classList.remove('hidden');
        document.querySelectorAll('.admin-col').forEach(el => el.classList.remove('hidden'));
    } else {
        document.getElementById('btn-login-modal').classList.remove('hidden');
        document.getElementById('btn-logout').classList.add('hidden');
        document.querySelectorAll('.admin-col').forEach(el => el.classList.add('hidden'));
    }
}

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
        day1: document.getElementById('guest-day1').checked,
        day2: document.getElementById('guest-day2').checked,
        day3: document.getElementById('guest-day3').checked,
        checked_in: document.getElementById('guest-arrived').checked,
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
    const isAdmin = !!getToken();

    const fName = filterNameEl ? filterNameEl.value.toLowerCase() : '';
    const fStatus = filterStatusEl ? filterStatusEl.value : 'all';
    const fDay = filterDayEl ? filterDayEl.value : 'all';

    const filtered = data.filter(g => {
        if (fName && !g.name.toLowerCase().includes(fName)) return false;
        if (fStatus === 'arrived' && !g.checked_in) return false;
        if (fStatus === 'pending' && g.checked_in) return false;
        if (fDay !== 'all') {
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

        tr.innerHTML = `
            <td>${nameHtml}</td>
            <td>${g.pax}</td>
            <td>${g.guest_mobile || '-'}</td>
            <td>${g.hotel || '-'}</td>
            <td>${g.room || '-'}</td>
            <td>${g.floor || '-'}</td>
            <td>${driverDetails}</td>
            <td>${daysStr}</td>
            <td>${transportStr}</td>
            <td>${statusHtml}</td>
            <td>
                <div class="nav-actions">
                    <button class="btn btn-icon-only btn-checkin ${g.checked_in ? 'active' : ''}" onclick="toggleCheckin(${g.id})" title="Mark Arrived">
                        <i data-lucide="map-pin"></i>
                    </button>
                    <button class="btn btn-whatsapp" onclick='openWhatsApp(${JSON.stringify(g)})' title="Send Details via WhatsApp">
                        <i data-lucide="message-circle"></i>
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
    const arrSelect = document.getElementById('stats-filter-arrival-date');
    const depSelect = document.getElementById('stats-filter-departure-date');
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
    // Check if previous value still valid
    if (uniqueArrDates.includes(currArr)) arrSelect.value = currArr;

    depSelect.innerHTML = '<option value="">All Departure Dates</option>';
    uniqueDepDates.forEach(d => {
        depSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
    if (uniqueDepDates.includes(currDep)) depSelect.value = currDep;
}

function renderTransportStats(data) {
    const ctx = document.getElementById('transportChart');
    if (!ctx) return;

    const thead = document.getElementById('stats-details-thead');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Pax</th>
                <th>Hotel</th>
                <th>Days Coming</th>
                <th>Transport/Flight Details</th>
                <th>Driver Name</th>
                <th>Driver Mobile</th>
                <th>Status</th>
            </tr>
        `;
    }

    // Optional analytics filters
    const fArrDateEl = document.getElementById('stats-filter-arrival-date');
    const fArrDate = fArrDateEl ? fArrDateEl.value : '';
    const fDepDateEl = document.getElementById('stats-filter-departure-date');
    const fDepDate = fDepDateEl ? fDepDateEl.value : '';

    let arrivingGuests = data.filter(g => g.arrival_time);

    // Apply date filters if populated
    if (fArrDate || fDepDate) {
        arrivingGuests = arrivingGuests.filter(g => {
            if (fArrDate && g.arrival_date !== fArrDate) return false;
            if (fDepDate && g.departure_date !== fDepDate) return false;
            return true;
        });
    }

    const categories = {
        'Morning (06:00-11:59)': [],
        'Afternoon (12:00-16:59)': [],
        'Evening (17:00-20:59)': [],
        'Night (21:00-05:59)': []
    };

    arrivingGuests.forEach(g => {
        let h = parseInt(g.arrival_time.split(':')[0]);
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
                label: 'Number of Guests Arriving',
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
                const detailsContainer = document.getElementById('stats-details-container');
                const tbody = document.getElementById('stats-details-tbody');
                const titleLabel = document.getElementById('stats-hover-label');

                if (elements.length > 0 && detailsContainer && tbody) {
                    const idx = elements[0].index;
                    const hoveredLabel = labels[idx];
                    const guests = categories[hoveredLabel];

                    titleLabel.textContent = hoveredLabel;
                    tbody.innerHTML = '';

                    if (guests.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">No guests arriving during this block.</td></tr>';
                    } else {
                        guests.forEach(g => {
                            let transportTop = [g.transport_type, g.flight_train_number].filter(Boolean).join(' - ');
                            let statusBadge = g.checked_in ? '<span class="arrived-badge">Arrived</span>' : '<span class="pending-badge">Pending</span>';

                            let daysArr = [];
                            if (g.day1) daysArr.push('D1');
                            if (g.day2) daysArr.push('D2');
                            if (g.day3) daysArr.push('D3');
                            let daysStr = daysArr.length ? daysArr.join(', ') : '<span class="empty-cell">-</span>';

                            tbody.innerHTML += `
                                <tr class="hover-row">
                                    <td style="font-weight: 600; color: #0f172a;">${g.name}</td>
                                    <td><span class="pax-badge">${g.pax}</span></td>
                                    <td>${g.hotel || '<span class="empty-cell">-</span>'}</td>
                                    <td><span class="time-badge">${daysStr}</span></td>
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
                        }, 50);
                    }

                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label;
                            const guests = categories[label];
                            let tooltipLines = [`Count: ${context.parsed.y}`];
                            if (guests.length > 0) {
                                tooltipLines.push('Guests:');
                                guests.forEach(g => tooltipLines.push('- ' + g.name + ' (' + g.arrival_time + ')'));
                            }
                            return tooltipLines;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderHotelStats(data) {
    const ctx = document.getElementById('transportChart');
    if (!ctx) return;

    // Apply Day filters for Hotels
    const fDayEl = document.getElementById('stats-filter-day');
    const fDay = fDayEl ? fDayEl.value : '';

    let filteredGuests = data;
    if (fDay === 'day1') filteredGuests = filteredGuests.filter(g => g.day1);
    else if (fDay === 'day2') filteredGuests = filteredGuests.filter(g => g.day2);
    else if (fDay === 'day3') filteredGuests = filteredGuests.filter(g => g.day3);

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

    const detailsContainer = document.getElementById('stats-details-container');
    if (detailsContainer) detailsContainer.style.display = 'none';

    const categories = {};
    filteredGuests.forEach(g => {
        const hotel = g.hotel ? g.hotel.trim() : 'No Hotel Assigned';
        if (!categories[hotel]) categories[hotel] = [];
        categories[hotel].push(g);
    });

    // Sort hotels by total absolute volume
    const labels = Object.keys(categories).sort((a, b) => categories[b].reduce((sum, g) => sum + g.pax, 0) - categories[a].reduce((sum, g) => sum + g.pax, 0));

    // Split volumes by Arrival checks
    const arrivedData = labels.map(l => categories[l].filter(g => g.checked_in).reduce((sum, g) => sum + g.pax, 0));
    const notArrivedData = labels.map(l => categories[l].filter(g => !g.checked_in).reduce((sum, g) => sum + g.pax, 0));

    if (window.transportChartInstance) {
        window.transportChartInstance.destroy();
    }

    window.transportChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Arrived (Checked In)',
                    data: arrivedData,
                    backgroundColor: 'rgba(34, 197, 94, 0.75)', // Elegant green
                    borderColor: 'rgba(21, 128, 61, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Pending Arrival',
                    data: notArrivedData,
                    backgroundColor: 'rgba(239, 68, 68, 0.75)', // Elegant red
                    borderColor: 'rgba(185, 28, 28, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
            },
            onHover: (event, elements) => {
                const tbody = document.getElementById('stats-details-tbody');
                const titleLabel = document.getElementById('stats-hover-label');

                if (elements.length > 0 && detailsContainer && tbody) {
                    const idx = elements[0].index;
                    const datasetIdx = elements[0].datasetIndex;
                    const hoveredLabel = labels[idx];
                    let guests = categories[hoveredLabel];

                    let phaseString = datasetIdx === 0 ? " [Arrived Profile]" : " [Pending Profile]";
                    titleLabel.textContent = hoveredLabel + phaseString;
                    tbody.innerHTML = '';

                    // Filter the guests array based on the exact stacked block hovered (0 = Arrived, 1 = Pending)
                    if (datasetIdx === 0) {
                        guests = guests.filter(g => g.checked_in);
                    } else if (datasetIdx === 1) {
                        guests = guests.filter(g => !g.checked_in);
                    }

                    if (guests.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8;">No matching guests assigned to this status.</td></tr>';
                    } else {
                        guests.forEach(g => {
                            let statusBadge = g.checked_in ? '<span class="arrived-badge">Arrived</span>' : '<span class="pending-badge">Pending</span>';

                            let daysArr = [];
                            if (g.day1) daysArr.push('D1');
                            if (g.day2) daysArr.push('D2');
                            if (g.day3) daysArr.push('D3');
                            let daysStr = daysArr.length ? daysArr.join(', ') : '<span class="empty-cell">-</span>';

                            tbody.innerHTML += `
                                <tr class="hover-row">
                                    <td style="font-weight: 600; color: #0f172a;">${g.name}</td>
                                    <td style="font-size: 0.85em; color: #475569;">${g.members_names || '<span class="empty-cell">-</span>'}</td>
                                    <td>${g.guest_mobile || '<span class="empty-cell">-</span>'}</td>
                                    <td><span class="pax-badge">${g.pax}</span></td>
                                    <td>${g.hotel || '<span class="empty-cell">-</span>'}</td>
                                    <td>${g.room || '<span class="empty-cell">-</span>'}</td>
                                    <td>${g.floor || '<span class="empty-cell">-</span>'}</td>
                                    <td><span class="time-badge">${daysStr}</span></td>
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
                        }, 50);
                    }
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Total Pax: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function renderRoomStats(data) {
    const kpiGrid = document.getElementById('room-kpi-grid');
    if (!kpiGrid) return;

    // Apply Day filters
    const fDayEl = document.getElementById('stats-filter-day');
    const fDay = fDayEl ? fDayEl.value : '';

    let filteredGuests = data;
    if (fDay === 'day1') filteredGuests = filteredGuests.filter(g => g.day1);
    else if (fDay === 'day2') filteredGuests = filteredGuests.filter(g => g.day2);
    else if (fDay === 'day3') filteredGuests = filteredGuests.filter(g => g.day3);

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

    const detailsContainer = document.getElementById('stats-details-container');
    if (detailsContainer) detailsContainer.style.display = 'none';

    // Group by Floor -> Unique Rooms mapping
    const categories = {}; // floor -> array of guests
    const roomCounts = {}; // floor -> set of unique room strings
    let totalUniqueRooms = new Set();

    filteredGuests.forEach(g => {
        const floor = g.floor ? g.floor.trim() : 'No Floor Assigned';
        const room = g.room ? g.room.trim() : null;

        if (!categories[floor]) {
            categories[floor] = [];
            roomCounts[floor] = new Set();
        }
        categories[floor].push(g);
        if (room) {
            let uniqueRoomKey = room + '-' + (g.hotel || '');
            roomCounts[floor].add(uniqueRoomKey);
            totalUniqueRooms.add(uniqueRoomKey);
        }
    });

    // Sort floors by unique room count
    const labels = Object.keys(categories).sort((a, b) => roomCounts[b].size - roomCounts[a].size);

    // Build KPI HTML
    let kpiHtml = `
        <div class="kpi-card kpi-card-total" data-floor="ALL">
            <div class="kpi-card-title">Total Rooms</div>
            <div class="kpi-card-value">${totalUniqueRooms.size}</div>
        </div>
    `;

    labels.forEach(l => {
        if (roomCounts[l].size > 0) {
            let cleanLabel = l === 'No Floor Assigned' ? 'Unassigned' : 'Floor: ' + l;
            kpiHtml += `
                <div class="kpi-card" data-floor="${l}">
                    <div class="kpi-card-title">${cleanLabel}</div>
                    <div class="kpi-card-value">${roomCounts[l].size}</div>
                </div>
            `;
        }
    });

    kpiGrid.innerHTML = kpiHtml;

    // Attach hover events to KPI cards to update the main Table below natively
    const cards = kpiGrid.querySelectorAll('.kpi-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const floorLabel = card.getAttribute('data-floor');
            const tbody = document.getElementById('stats-details-tbody');
            const titleLabel = document.getElementById('stats-hover-label');

            if (detailsContainer && tbody) {
                let guests = [];
                if (floorLabel === 'ALL') {
                    guests = filteredGuests;
                    titleLabel.getContext || (titleLabel.textContent = "Global Room Assignments");
                } else {
                    guests = categories[floorLabel] || [];
                    titleLabel.textContent = (floorLabel === 'No Floor Assigned' ? 'Unassigned' : floorLabel) + " Roster";
                }

                tbody.innerHTML = '';

                if (guests.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8;">No room assignments detected.</td></tr>';
                } else {
                    guests.forEach(g => {
                        let statusBadge = g.checked_in ? '<span class="arrived-badge">Arrived</span>' : '<span class="pending-badge">Pending</span>';
                        let daysArr = [];
                        if (g.day1) daysArr.push('D1');
                        if (g.day2) daysArr.push('D2');
                        if (g.day3) daysArr.push('D3');
                        let daysStr = daysArr.length ? daysArr.join(', ') : '<span class="empty-cell">-</span>';

                        tbody.innerHTML += `
                            <tr class="hover-row">
                                <td style="font-weight: 600; color: #0f172a;">${g.name}</td>
                                <td style="font-size: 0.85em; color: #475569;">${g.members_names || '<span class="empty-cell">-</span>'}</td>
                                <td>${g.guest_mobile || '<span class="empty-cell">-</span>'}</td>
                                <td><span class="pax-badge">${g.pax}</span></td>
                                <td>${g.hotel || '<span class="empty-cell">-</span>'}</td>
                                <td><span style="font-weight:700; color: #2563eb;">${g.room || '<span class="empty-cell">-</span>'}</span></td>
                                <td>${g.floor || '<span class="empty-cell">-</span>'}</td>
                                <td><span class="time-badge">${daysStr}</span></td>
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
                    }, 50);
                }
            }
        });
    });
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

// Excel Export
function handleExport() {
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
    XLSX.writeFile(workbook, "Niyarra_Guests.xlsx");
}

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
if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('username', document.getElementById('login-username').value);
    fd.append('password', document.getElementById('login-password').value);

    try {
        const res = await fetch(`${API_URL}/token`, { method: 'POST', body: fd });
        if (res.ok) {
            const data = await res.json();
            setToken(data.access_token);
            document.getElementById('login-modal').classList.add('hidden');
            renderTable(); // Re-render to show admin controls
        } else {
            document.getElementById('login-error').innerText = "Invalid credentials";
        }
    } catch (e) { console.error(e); }
});

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', () => {
    removeToken();
    renderTable();
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
    if (typeof renderFamilyMembers === 'function') renderFamilyMembers('edit-guest-pax', 'edit-family-members-container', g.members_names);
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
        driver_mobile: document.getElementById('edit-guest-driver').value,
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

// Analytics specific bounds
const statsFilterArrivalDateEl = document.getElementById('stats-filter-arrival-date');
if (statsFilterArrivalDateEl) statsFilterArrivalDateEl.addEventListener('change', () => {
    if (document.getElementById('transportChart')) renderTransportStats(guestsList);
});

const statsFilterDepartureDateEl = document.getElementById('stats-filter-departure-date');
if (statsFilterDepartureDateEl) statsFilterDepartureDateEl.addEventListener('change', () => {
    if (document.getElementById('transportChart')) renderTransportStats(guestsList);
});

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

fetchGuests();
