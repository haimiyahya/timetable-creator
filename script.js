const { jsPDF } = window.jspdf;
const DAYS = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`); // 8 AM to 8 PM

// Initialize timetable
function createTimetable() {
    const timetable = document.getElementById('timetable');
    timetable.innerHTML = '';

    // Create header row
    DAYS.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'cell header';
        cell.textContent = day;
        timetable.appendChild(cell);
    });

    // Create time slots and editable cells
    TIME_SLOTS.forEach((time, timeIndex) => {
        DAYS.forEach((day, dayIndex) => {
            const cell = document.createElement('div');
            cell.className = 'cell' + (dayIndex === 0 ? ' time-slot' : '');
            if (dayIndex === 0) {
                cell.textContent = time;
            } else {
                cell.setAttribute('contenteditable', 'true');
                cell.dataset.day = day;
                cell.dataset.time = time;
                cell.addEventListener('input', saveTimetable);
            }
            timetable.appendChild(cell);
        });
    });

    loadTimetable();
}

// Save timetable to LocalStorage
function saveTimetable() {
    const cells = document.querySelectorAll('.cell[contenteditable]');
    const data = {};
    cells.forEach(cell => {
        const key = `${cell.dataset.day}-${cell.dataset.time}`;
        data[key] = cell.textContent.trim();
    });
    localStorage.setItem('timetable', JSON.stringify(data));
}

// Load timetable from LocalStorage
function loadTimetable() {
    const data = JSON.parse(localStorage.getItem('timetable') || '{}');
    const cells = document.querySelectorAll('.cell[contenteditable]');
    cells.forEach(cell => {
        const key = `${cell.dataset.day}-${cell.dataset.time}`;
        cell.textContent = data[key] || '';
    });
}

// Clear timetable
function clearTimetable() {
    if (confirm('Are you sure you want to clear the timetable?')) {
        localStorage.removeItem('timetable');
        createTimetable();
    }
}

// Print timetable
function printTimetable() {
    window.print();
}

// Generate PDF with improved grid structure
function generatePDF() {
    const doc = new jsPDF({
        orientation: 'landscape', // Better for wide timetables
        unit: 'mm',
        format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text('Weekly Timetable', 10, 15);

    // Prepare table data
    const tableData = [];
    tableData.push(DAYS); // Header row

    // Add time slots and corresponding entries
    TIME_SLOTS.forEach((time, timeIndex) => {
        const row = [time];
        for (let dayIndex = 1; dayIndex < DAYS.length; dayIndex++) {
            const cell = document.querySelector(`.cell[contenteditable][data-day="${DAYS[dayIndex]}"][data-time="${time}"]`);
            row.push(cell ? cell.textContent.trim() : '');
        }
        tableData.push(row);
    });

    // Table dimensions
    const cellWidth = 25; // Reduced width to fi