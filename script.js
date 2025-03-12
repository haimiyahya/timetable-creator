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

// Generate PDF with a proper grid structure
function generatePDF() {
    const doc = new jsPDF({
        orientation: 'landscape', // Better for wide timetables
        unit: 'mm',
        format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text('Weekly Timetable', 10, 10);

    // Prepare table data
    const tableData = [];
    
    // Add header row
    tableData.push(DAYS);

    // Add time slots and corresponding entries
    TIME_SLOTS.forEach((time, timeIndex) => {
        const row = [time];
        for (let dayIndex = 1; dayIndex < DAYS.length; dayIndex++) {
            const cell = document.querySelector(`.cell[contenteditable][data-day="${DAYS[dayIndex]}"][data-time="${time}"]`);
            row.push(cell ? cell.textContent.trim() : '');
        }
        tableData.push(row);
    });

    // Draw the table
    const cellWidth = 35; // Width of each cell in mm
    const cellHeight = 10; // Height of each cell in mm
    const startX = 10; // Starting X position
    const startY = 20; // Starting Y position after title
    const pageWidth = doc.internal.pageSize.width;

    // Set font size for the table
    doc.setFontSize(10);

    // Draw the table grid and content
    tableData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const x = startX + colIndex * cellWidth;
            const y = startY + rowIndex * cellHeight;

            // Draw cell border
            doc.setLineWidth(0.2);
            doc.rect(x, y, cellWidth, cellHeight);

            // Add text inside the cell
            doc.text(cell, x + 2, y + 7); // Adjust text position inside the cell
        });
    });

    // Save the PDF
    doc.save('timetable.pdf');
}

// Event listeners
document.getElementById('print-btn').addEventListener('click', printTimetable);
document.getElementById('pdf-btn').addEventListener('click', generatePDF);
document.getElementById('clear-btn').addEventListener('click', clearTimetable);

// Initialize on load
document.addEventListener('DOMContentLoaded', createTimetable);