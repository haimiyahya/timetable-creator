const { jsPDF } = window.jspdf;

// Language-specific day arrays
const DAYS_EN = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_MS = ['Masa', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];

// Default time slots (users can edit these)
let TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`); // 8 AM to 8 PM
let currentDays = DAYS_MS; // Default to Malay
let timetableName = 'Jadual Waktu'; // Default to Malay name
let showWeekends = true; // Default to showing weekends
let pdfCellScale = 1; // Default scaling factor for PDF cell size
let isTimeOnLeft = true; // Default orientation: time on left, days on top

// Initialize timetable
function createTimetable() {
    const timetable = document.getElementById('timetable');
    if (!timetable) {
        console.error('Timetable element not found!');
        return;
    }
    timetable.innerHTML = '';

    // Determine days to display based on showWeekends
    const displayDays = showWeekends ? currentDays : currentDays.slice(0, 6); // Exclude Saturday and Sunday

    if (isTimeOnLeft) {
        // Orientation: Days on top, Time on left
        displayDays.forEach((day, index) => {
            const cell = document.createElement('div');
            cell.className = 'cell header';
            cell.textContent = index === 0 ? '' : day; // Empty first cell as per your request
            timetable.appendChild(cell);
        });

        TIME_SLOTS.forEach((time, timeIndex) => {
            displayDays.forEach((day, dayIndex) => {
                const cell = document.createElement('div');
                cell.className = 'cell' + (dayIndex === 0 ? ' time-slot' : '');
                
                if (dayIndex === 0) {
                    cell.setAttribute('contenteditable', 'true');
                    cell.textContent = time;
                    cell.dataset.timeIndex = timeIndex;
                    cell.addEventListener('input', saveTimetable);
                } else {
                    cell.setAttribute('contenteditable', 'true');
                    cell.dataset.day = day;
                    cell.dataset.time = time;
                    cell.addEventListener('input', saveTimetable);
                }
                timetable.appendChild(cell);
            });
        });

        timetable.style.gridTemplateColumns = `repeat(${displayDays.length}, 1fr)`;
    } else {
        // Orientation: Time on top, Days on left
        const headerCells = [document.createElement('div')];
        headerCells[0].className = 'cell header';
        headerCells[0].textContent = ''; // Empty top-left cell
        TIME_SLOTS.forEach((time, timeIndex) => {
            const cell = document.createElement('div');
            cell.className = 'cell header time-slot';
            cell.setAttribute('contenteditable', 'true');
            cell.textContent = time;
            cell.dataset.timeIndex = timeIndex;
            cell.addEventListener('input', saveTimetable);
            headerCells.push(cell);
        });
        headerCells.forEach(cell => timetable.appendChild(cell));

        displayDays.slice(1).forEach((day) => {
            const rowHeaderCell = document.createElement('div');
            rowHeaderCell.className = 'cell header';
            rowHeaderCell.textContent = day;
            timetable.appendChild(rowHeaderCell);

            TIME_SLOTS.forEach((time) => {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.setAttribute('contenteditable', 'true');
                cell.dataset.day = day;
                cell.dataset.time = time;
                cell.addEventListener('input', saveTimetable);
                timetable.appendChild(cell);
            });
        });

        timetable.style.gridTemplateColumns = `repeat(${1 + TIME_SLOTS.length}, 1fr)`;
    }

    loadTimetableData(); // Load saved data
    updateTimetableName(); // Update displayed and printable timetable name
}

// Update radio button checked state based on current language
function updateRadioButtons() {
    const radioButtons = document.querySelectorAll('input[name="language"]');
    const currentLanguage = currentDays === DAYS_MS ? 'malay' : 'english';
    radioButtons.forEach(radio => {
        radio.checked = radio.value === currentLanguage;
    });
}

// Update the displayed and printable timetable name
function updateTimetableName() {
    const nameElement = document.getElementById('timetable-name');
    const printNameElement = document.getElementById('print-timetable-name');
    if (nameElement && printNameElement) {
        nameElement.textContent = timetableName;
        printNameElement.textContent = timetableName;
        nameElement.addEventListener('input', () => {
            timetableName = nameElement.textContent.trim() || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable');
            printNameElement.textContent = timetableName;
            saveTimetable();
        });
    }
}

// Save timetable data to LocalStorage
function saveTimetable() {
    const cells = document.querySelectorAll('.cell[contenteditable][data-day]');
    const data = {};
    cells.forEach(cell => {
        const key = `${cell.dataset.day}-${cell.dataset.time}`;
        data[key] = cell.textContent.trim();
    });

    const timeSlotCells = document.querySelectorAll('.cell.time-slot[contenteditable]');
    const timeSlotsData = Array.from(timeSlotCells).map(cell => cell.textContent.trim());
    TIME_SLOTS = timeSlotsData;

    localStorage.setItem('timetable', JSON.stringify(data));
    localStorage.setItem('timeSlots', JSON.stringify(timeSlotsData));
    localStorage.setItem('language', currentDays === DAYS_MS ? 'malay' : 'english');
    localStorage.setItem('timetableName', timetableName);
    localStorage.setItem('showWeekends', showWeekends);
    localStorage.setItem('pdfCellScale', pdfCellScale);
    localStorage.setItem('isTimeOnLeft', isTimeOnLeft);
}

// Load timetable data from LocalStorage
function loadTimetableData() {
    const data = JSON.parse(localStorage.getItem('timetable') || '{}');
    const cells = document.querySelectorAll('.cell[contenteditable][data-day]');
    cells.forEach(cell => {
        const key = `${cell.dataset.day}-${cell.dataset.time}`;
        cell.textContent = data[key] || '';
    });

    const savedTimeSlots = JSON.parse(localStorage.getItem('timeSlots'));
    if (savedTimeSlots && savedTimeSlots.length === TIME_SLOTS.length) {
        TIME_SLOTS = savedTimeSlots;
        const timeSlotCells = document.querySelectorAll('.cell.time-slot[contenteditable]');
        timeSlotCells.forEach((cell, index) => {
            cell.textContent = TIME_SLOTS[index];
        });
    }
}

// Load initial state
function loadInitialState() {
    const savedLanguage = localStorage.getItem('language') || 'malay';
    currentDays = savedLanguage === 'malay' ? DAYS_MS : DAYS_EN;

    timetableName = localStorage.getItem('timetableName') || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable');
    showWeekends = localStorage.getItem('showWeekends') === 'true';
    document.getElementById('show-weekends').checked = showWeekends;

    pdfCellScale = parseFloat(localStorage.getItem('pdfCellScale')) || 1;
    document.getElementById('pdf-cell-scale').value = pdfCellScale;

    isTimeOnLeft = localStorage.getItem('isTimeOnLeft') !== 'false'; // Default to true if not set
    document.getElementById('orientation-toggle').checked = isTimeOnLeft;

    updateRadioButtons();
    updateTimetableName();
    createTimetable();
}

// Clear timetable and reset to defaults
function clearTimetable() {
    if (confirm('Are you sure you want to clear the timetable and reset time slots?')) {
        localStorage.removeItem('timetable');
        localStorage.removeItem('timeSlots');
        TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`);
        localStorage.setItem('language', 'malay');
        localStorage.setItem('timetableName', 'Jadual Waktu');
        localStorage.setItem('showWeekends', 'true');
        localStorage.setItem('pdfCellScale', '1');
        localStorage.setItem('isTimeOnLeft', 'true');
        currentDays = DAYS_MS;
        timetableName = 'Jadual Waktu';
        showWeekends = true;
        pdfCellScale = 1;
        isTimeOnLeft = true;
        updateRadioButtons();
        updateTimetableName();
        document.getElementById('show-weekends').checked = showWeekends;
        document.getElementById('pdf-cell-scale').value = pdfCellScale;
        document.getElementById('orientation-toggle').checked = isTimeOnLeft;
        createTimetable();
    }
}

// Print timetable
function printTimetable() {
    const originalTitle = document.querySelector('title').textContent;
    document.querySelector('title').textContent = timetableName;
    window.print();
    document.querySelector('title').textContent = originalTitle;
}

// Generate PDF
function generatePDF() {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const maxContentHeight = pageHeight - margin * 2;

    doc.setFontSize(16);
    doc.setTextColor(51, 51, 51);
    doc.text(timetableName, margin, margin + 5);

    const displayDays = showWeekends ? currentDays : currentDays.slice(0, 6);
    const tableData = [];
    const timeSlotCells = document.querySelectorAll('.cell.time-slot[contenteditable]');
    TIME_SLOTS = Array.from(timeSlotCells).map(cell => cell.textContent.trim());

    if (isTimeOnLeft) {
        tableData.push(displayDays);
        TIME_SLOTS.forEach((time) => {
            const row = [time];
            for (let dayIndex = 1; dayIndex < displayDays.length; dayIndex++) {
                const cell = document.querySelector(
                    `.cell[contenteditable][data-day="${displayDays[dayIndex]}"][data-time="${time}"]`
                );
                row.push(cell ? cell.textContent.trim() : '');
            }
            tableData.push(row);
        });
    } else {
        tableData.push(['', ...TIME_SLOTS]);
        displayDays.slice(1).forEach((day) => {
            const row = [day];
            TIME_SLOTS.forEach((time) => {
                const cell = document.querySelector(
                    `.cell[contenteditable][data-day="${day}"][data-time="${time}"]`
                );
                row.push(cell ? cell.textContent.trim() : '');
            });
            tableData.push(row);
        });
    }

    const baseCellWidth = 25 * pdfCellScale;
    const baseCellHeight = 7;
    const fontSize = 8;
    const lineHeight = fontSize * 0.4;
    const startX = margin;
    let startY = margin + 15;

    doc.setLineWidth(0.2);
    doc.setDrawColor(224, 224, 224);
    doc.setFontSize(fontSize);

    let currentY = startY;
    tableData.forEach((row, rowIndex) => {
        let maxLines = 1;
        row.forEach(cell => {
            const lines = doc.splitTextToSize(cell, baseCellWidth - 2);
            maxLines = Math.max(maxLines, lines.length);
        });
        const cellHeight = (baseCellHeight + (maxLines - 1) * lineHeight) * pdfCellScale;

        if (currentY + cellHeight > maxContentHeight) {
            doc.addPage();
            currentY = margin;
        }

        row.forEach((cell, colIndex) => {
            const x = startX + colIndex * baseCellWidth;
            const y = currentY;

            if (rowIndex === 0 || (!isTimeOnLeft && colIndex === 0)) {
                doc.setFillColor(0, 123, 255);
                doc.setTextColor(255, 255, 255);
            } else if (isTimeOnLeft && colIndex === 0) {
                doc.setFillColor(233, 236, 239);
                doc.setTextColor(51, 51, 51);
            } else {
                doc.setFillColor(255, 255, 255);
                doc.setTextColor(51, 51, 51);
            }
            doc.rect(x, y, baseCellWidth, cellHeight, 'F');
            doc.rect(x, y, baseCellWidth, cellHeight);

            const lines = doc.splitTextToSize(cell, baseCellWidth - 2);
            doc.text(lines, x + 1, y + 3, { maxWidth: baseCellWidth - 2 });
        });

        currentY += cellHeight;
    });

    doc.save('timetable.pdf');
}

// Event listeners
document.getElementById('print-btn').addEventListener('click', printTimetable);
document.getElementById('pdf-btn').addEventListener('click', generatePDF);
document.getElementById('clear-btn').addEventListener('click', clearTimetable);

document.querySelectorAll('input[name="language"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const previousLanguage = currentDays === DAYS_MS ? 'malay' : 'english';
        currentDays = radio.value === 'malay' ? DAYS_MS : DAYS_EN;
        
        const savedName = localStorage.getItem('timetableName');
        if (!savedName || savedName === (previousLanguage === 'malay' ? 'Jadual Waktu' : 'Timetable')) {
            timetableName = currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable';
        }

        updateRadioButtons();
        updateTimetableName();
        createTimetable();
        saveTimetable();
    });
});

document.getElementById('show-weekends').addEventListener('change', (event) => {
    showWeekends = event.target.checked;
    createTimetable();
    saveTimetable();
});

document.getElementById('pdf-cell-scale').addEventListener('input', (event) => {
    pdfCellScale = parseFloat(event.target.value) || 1;
    if (pdfCellScale < 1) pdfCellScale = 1;
    if (pdfCellScale > 3) pdfCellScale = 3;
    event.target.value = pdfCellScale;
    saveTimetable();
});

document.getElementById('orientation-toggle').addEventListener('change', (event) => {
    isTimeOnLeft = event.target.checked;
    createTimetable();
    saveTimetable();
});

document.getElementById('add-slot-btn').addEventListener('click', () => {
    const lastSlot = TIME_SLOTS[TIME_SLOTS.length - 1];
    const [start] = lastSlot.split(' - ');
    const [hour, minute] = start.split(':');
    const newHour = (parseInt(hour) + 1) % 24;
    TIME_SLOTS.push(`${newHour}:00 - ${newHour + 1}:00`);
    createTimetable();
    saveTimetable();
});

document.getElementById('remove-slot-btn').addEventListener('click', () => {
    if (TIME_SLOTS.length > 1) {
        TIME_SLOTS.pop();
        createTimetable();
        saveTimetable();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadInitialState();
});