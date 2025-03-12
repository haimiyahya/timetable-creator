const { jsPDF } = window.jspdf;
const DAYS = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Default time slots (users can edit these)
let TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`); // 8 AM to 8 PM

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
                // Make time slot editable
                cell.setAttribute('contenteditable', 'true');
                cell.textContent = time;
                cell.dataset.timeIndex = timeIndex; // Store the index for saving
                cell.addEventListener('input', saveTimetable); // Save on edit
            } else {
                // Timetable entry cells
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

// Save timetable and time slots to LocalStorage
function saveTimetable() {
    // Save timetable entries
    const cells = document.querySelectorAll('.cell[contenteditable][data-day]');
    const data = {};
    cells.forEach(cell => {
        const key = `${cell.dataset.day}-${cell.dataset.time}`;
        data[key] = cell.textContent.trim();
    });

    // Save time slots
    const timeSlotCells = document.querySelectorAll('.cell.time-slot[contenteditable]');
    const timeSlotsData = Array.from(timeSlotCells).map(cell => cell.textContent.trim());
    TIME_SLOTS = timeSlotsData; // Update the global TIME_SLOTS array

    // Store both in LocalStorage
    localStorage.setItem('timetable', JSON.stringify(data));
    localStorage.setItem('timeSlots', JSON.stringify(timeSlotsData));
}

// Load timetable and time slots from LocalStorage
function loadTimetable() {
    // Load timetable entries
    const data = JSON.parse(localStorage.getItem('timetable') || '{}');
    const cells = document.querySelectorAll('.cell[contenteditable][data-day]');
    cells.forEach(cell => {
        const key = `${cell.dataset.day}-${cell.dataset.time}`;
        cell.textContent = data[key] || '';
    });

    // Load time slots
    const savedTimeSlots = JSON.parse(localStorage.getItem('timeSlots'));
    if (savedTimeSlots && savedTimeSlots.length === TIME_SLOTS.length) {
        TIME_SLOTS = savedTimeSlots;
        const timeSlotCells = document.querySelectorAll('.cell.time-slot[contenteditable]');
        timeSlotCells.forEach((cell, index) => {
            cell.textContent = TIME_SLOTS[index];
        });
    }
}

// Clear timetable and time slots
function clearTimetable() {
    if (confirm('Are you sure you want to clear the timetable and reset time slots?')) {
        localStorage.removeItem('timetable');
        localStorage.removeItem('timeSlots');
        TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`); // Reset to default
        createTimetable();
    }
}

// Print timetable
function printTimetable() {
    window.print();
}

// Generate PDF with updated time slots
function generatePDF() {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text('Weekly Timetable', 10, 15);

    // Prepare table data
    const tableData = [];
    tableData.push(DAYS); // Header row

    // Update TIME_SLOTS from the current state of time slot cells
    const timeSlotCells = document.querySelectorAll('.cell.time-slot[contenteditable]');
    TIME_SLOTS = Array.from(timeSlotCells).map(cell => cell.textContent.trim());

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
    const cellWidth = 25;
    const cellHeight = 7;
    const startX = 10;
    const startY = 25;

    // Draw the table
    doc.setLineWidth(0.3);
    doc.setDrawColor(0);

    tableData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const x = startX + colIndex * cellWidth;
            const y = startY + rowIndex * cellHeight;

            // Draw cell border
            doc.rect(x, y, cellWidth, cellHeight);

            // Add text inside the cell with word wrapping
            doc.setFontSize(8);
            const lines = doc.splitTextToSize(cell, cellWidth - 2);
            doc.text(lines, x + 1, y + 4, { maxWidth: cellWidth - 2 });
        });
    });

    doc.save('timetable.pdf');
}

// Event listeners
document.getElementById('print-btn').addEventListener('click', printTimetable);
document.getElementById('pdf-btn').addEventListener('click', generatePDF);
document.getElementById('clear-btn').addEventListener('click', clearTimetable);

// Initialize on load
document.addEventListener('DOMContentLoaded', createTimetable);