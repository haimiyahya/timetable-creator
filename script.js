const { jsPDF } = window.jspdf;

// Language-specific day arrays
const DAYS_EN = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_MS = ['Masa', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];

// Default time slots (users can edit these)
let TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`); // 8 AM to 8 PM
let currentDays = DAYS_MS; // Default to Malay
let timetableName = 'Jadual Waktu'; // Default to Malay name

// Initialize timetable
function createTimetable() {
    const timetable = document.getElementById('timetable');
    if (!timetable) {
        console.error('Timetable element not found!');
        return;
    }
    timetable.innerHTML = '';

    // Create header row
    currentDays.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'cell header';
        cell.textContent = day;
        timetable.appendChild(cell);
    });

    // Create time slots and editable cells
    TIME_SLOTS.forEach((time, timeIndex) => {
        currentDays.forEach((day, dayIndex) => {
            const cell = document.createElement('div');
            cell.className = 'cell' + (dayIndex === 0 ? ' time-slot' : '');
            
            if (dayIndex === 0) {
                // Make time slot editable
                cell.setAttribute('contenteditable', 'true');
                cell.textContent = time;
                cell.dataset.timeIndex = timeIndex;
                cell.addEventListener('input', saveTimetable);
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

    loadTimetableData(); // Load data after creating the structure
    updateTimetableName(); // Update the displayed and printable timetable name
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
        printNameElement.textContent = timetableName; // Sync with printable version
        nameElement.addEventListener('input', () => {
            timetableName = nameElement.textContent.trim() || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable');
            printNameElement.textContent = timetableName; // Update printable version
            saveTimetable(); // Save the new name
        });
    }
}

// Save timetable, time slots, and name to LocalStorage
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
    TIME_SLOTS = timeSlotsData;

    // Store all in LocalStorage
    localStorage.setItem('timetable', JSON.stringify(data));
    localStorage.setItem('timeSlots', JSON.stringify(timeSlotsData));
    localStorage.setItem('language', currentDays === DAYS_MS ? 'malay' : 'english');
    localStorage.setItem('timetableName', timetableName);
}

// Load timetable data (entries and time slots) from LocalStorage
function loadTimetableData() {
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

// Load initial state (language, timetable, and name)
function loadInitialState() {
    // Load language preference
    const savedLanguage = localStorage.getItem('language') || 'malay';
    currentDays = savedLanguage === 'malay' ? DAYS_MS : DAYS_EN;

    // Load timetable name or set default based on language
    timetableName = localStorage.getItem('timetableName') || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable');

    // Update radio buttons and timetable name
    updateRadioButtons();
    updateTimetableName();

    // Create timetable with the loaded language
    createTimetable();
}

// Clear timetable and time slots
function clearTimetable() {
    if (confirm('Are you sure you want to clear the timetable and reset time slots?')) {
        localStorage.removeItem('timetable');
        localStorage.removeItem('timeSlots');
        TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`); // Reset to default
        localStorage.setItem('language', 'malay'); // Reset to Malay
        localStorage.setItem('timetableName', 'Jadual Waktu'); // Reset to Malay default
        currentDays = DAYS_MS;
        timetableName = 'Jadual Waktu';
        updateRadioButtons();
        updateTimetableName();
        createTimetable();
    }
}

// Print timetable with the current name
function printTimetable() {
    const originalTitle = document.querySelector('title').textContent;
    document.querySelector('title').textContent = timetableName; // Update title for print
    window.print();
    document.querySelector('title').textContent = originalTitle; // Restore original title
}

// Generate PDF with current name
function generatePDF() {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Title using the current timetable name
    doc.setFontSize(16);
    doc.text(timetableName, 10, 15);

    // Prepare table data with current days
    const tableData = [];
    tableData.push(currentDays); // Header row

    // Update TIME_SLOTS from the current state of time slot cells
    const timeSlotCells = document.querySelectorAll('.cell.time-slot[contenteditable]');
    TIME_SLOTS = Array.from(timeSlotCells).map(cell => cell.textContent.trim());

    // Add time slots and corresponding entries
    TIME_SLOTS.forEach((time, timeIndex) => {
        const row = [time];
        for (let dayIndex = 1; dayIndex < currentDays.length; dayIndex++) {
            const cell = document.querySelector(`.cell[contenteditable][data-day="${currentDays[dayIndex]}"][data-time="${time}"]`);
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

// Handle language change
document.querySelectorAll('input[name="language"]').forEach(radio => {
    radio.addEventListener('change', () => {
        currentDays = radio.value === 'malay' ? DAYS_MS : DAYS_EN;
        timetableName = localStorage.getItem('timetableName') || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable'); // Reset to default if not set
        updateRadioButtons();
        updateTimetableName();
        createTimetable();
        saveTimetable();
    });
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadInitialState();
});