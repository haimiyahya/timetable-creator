const { jsPDF } = window.jspdf;

// Language-specific day arrays
const DAYS_EN = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_MS = ['Masa', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];

// Default time slots and app state
let TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`);
let currentDays = DAYS_MS;
let timetableName = 'Jadual Waktu';
let showWeekends = true;
let pdfCellScale = 1;
let isTimeOnLeft = true;
let lastFocusedCell = null;

// Undo/Redo stacks
let undoStack = [];
let redoStack = [];

// Save current state to undo stack
function saveState() {
    const state = {
        timetable: JSON.parse(localStorage.getItem('timetable') || '{}'),
        timeSlots: [...TIME_SLOTS],
        language: currentDays === DAYS_MS ? 'malay' : 'english',
        timetableName: timetableName,
        showWeekends: showWeekends,
        pdfCellScale: pdfCellScale,
        isTimeOnLeft: isTimeOnLeft
    };
    undoStack.push(state);
    redoStack = []; // Clear redo stack on new action
    console.log('Saved state to undo stack:', state);
    updateUndoRedoButtons();
}

// Restore state from stack
function restoreState(state) {
    if (!state) return;
    localStorage.setItem('timetable', JSON.stringify(state.timetable));
    TIME_SLOTS = [...state.timeSlots];
    currentDays = state.language === 'malay' ? DAYS_MS : DAYS_EN;
    timetableName = state.timetableName;
    showWeekends = state.showWeekends;
    pdfCellScale = state.pdfCellScale;
    isTimeOnLeft = state.isTimeOnLeft;

    document.getElementById('show-weekends').checked = showWeekends;
    document.getElementById('pdf-cell-scale').value = (pdfCellScale * 100).toFixed(0);
    document.getElementById('pdf-cell-scale-custom').style.display = 'none';
    document.getElementById('orientation-toggle').checked = isTimeOnLeft;
    updateRadioButtons();
    updateTimetableName();
    createTimetable();
    console.log('Restored state:', state);
}

// Update Undo/Redo button states
function updateUndoRedoButtons() {
    document.getElementById('undo-btn').disabled = undoStack.length === 0;
    document.getElementById('redo-btn').disabled = redoStack.length === 0;
}

// Initialize timetable
function createTimetable() {
    const timetable = document.getElementById('timetable');
    if (!timetable) {
        console.error('Timetable element not found!');
        return;
    }
    timetable.innerHTML = '';

    console.log('Creating timetable with orientation:', isTimeOnLeft ? 'Time on Left' : 'Days on Left');

    const displayDays = showWeekends ? currentDays : currentDays.slice(0, 6);

    if (isTimeOnLeft) {
        displayDays.forEach((day, index) => {
            const cell = document.createElement('div');
            cell.className = 'cell header';
            cell.textContent = index === 0 ? '' : day;
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
                    cell.addEventListener('focus', () => {
                        lastFocusedCell = cell;
                        console.log('Focused cell:', cell.textContent, 'with time:', time);
                    });
                } else {
                    cell.setAttribute('contenteditable', 'true');
                    cell.dataset.day = day;
                    cell.dataset.time = time;
                    cell.addEventListener('input', saveTimetable);
                    cell.addEventListener('focus', () => {
                        lastFocusedCell = cell;
                        console.log('Focused cell for day:', day, 'time:', time);
                    });
                }
                timetable.appendChild(cell);
            });
        });

        timetable.style.gridTemplateColumns = `repeat(${displayDays.length}, 1fr)`;
    } else {
        const headerCells = [document.createElement('div')];
        headerCells[0].className = 'cell header';
        headerCells[0].textContent = '';
        TIME_SLOTS.forEach((time, timeIndex) => {
            const cell = document.createElement('div');
            cell.className = 'cell header time-slot';
            cell.setAttribute('contenteditable', 'true');
            cell.textContent = time;
            cell.dataset.timeIndex = timeIndex;
            cell.addEventListener('input', saveTimetable);
            cell.addEventListener('focus', () => {
                lastFocusedCell = cell;
                console.log('Focused time slot:', time);
            });
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
                cell.addEventListener('focus', () => {
                    lastFocusedCell = cell;
                    console.log('Focused cell for day:', day, 'time:', time);
                });
                timetable.appendChild(cell);
            });
        });

        timetable.style.gridTemplateColumns = `repeat(${1 + TIME_SLOTS.length}, 1fr)`;
    }

    loadTimetableData();
    updateTimetableName();
}

// Update radio button checked state
function updateRadioButtons() {
    const radioButtons = document.querySelectorAll('input[name="language"]');
    const currentLanguage = currentDays === DAYS_MS ? 'malay' : 'english';
    radioButtons.forEach(radio => {
        radio.checked = radio.value === currentLanguage;
    });
}

// Update timetable name
function updateTimetableName() {
    const nameElement = document.getElementById('timetable-name');
    if (nameElement) {
        nameElement.textContent = timetableName || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable');
        nameElement.addEventListener('input', () => {
            saveState();
            timetableName = nameElement.textContent.trim() || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable');
            saveTimetable();
        });
    }
}

// Save timetable data
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

// Load timetable data
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
    console.log('Loading initial state...');
    const savedLanguage = localStorage.getItem('language') || 'malay';
    currentDays = savedLanguage === 'malay' ? DAYS_MS : DAYS_EN;

    timetableName = localStorage.getItem('timetableName') || (currentDays === DAYS_MS ? 'Jadual Waktu' : 'Timetable');
    showWeekends = localStorage.getItem('showWeekends') === 'true';
    document.getElementById('show-weekends').checked = showWeekends;

    pdfCellScale = parseFloat(localStorage.getItem('pdfCellScale')) || 1;
    const pdfScaleSelect = document.getElementById('pdf-cell-scale');
    const savedPercentage = (pdfCellScale * 100).toFixed(0);
    const predefinedOption = pdfScaleSelect.querySelector(`option[value="${savedPercentage}"]`);
    if (predefinedOption) {
        pdfScaleSelect.value = savedPercentage;
    } else {
        pdfScaleSelect.value = 'custom';
        const customInput = document.getElementById('pdf-cell-scale-custom');
        customInput.value = savedPercentage;
        customInput.style.display = 'inline-block';
    }

    isTimeOnLeft = localStorage.getItem('isTimeOnLeft') !== 'false';
    document.getElementById('orientation-toggle').checked = isTimeOnLeft;

    updateRadioButtons();
    updateTimetableName();
    createTimetable();
    saveState();
    console.log('Initial state loaded, timetable created.');
}

// Clear timetable
function clearTimetable() {
    if (confirm('Are you sure you want to clear the timetable and reset time slots?')) {
        saveState();
        localStorage.clear();
        TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`);
        currentDays = DAYS_MS;
        timetableName = 'Jadual Waktu';
        showWeekends = true;
        pdfCellScale = 1;
        isTimeOnLeft = true;
        updateRadioButtons();
        updateTimetableName();
        document.getElementById('show-weekends').checked = showWeekends;
        document.getElementById('pdf-cell-scale').value = (pdfCellScale * 100).toFixed(0);
        document.getElementById('pdf-cell-scale-custom').style.display = 'none';
        document.getElementById('orientation-toggle').checked = isTimeOnLeft;
        createTimetable();
        saveTimetable();
    }
}

// Print timetable
function printTimetable() {
    const originalTitle = document.querySelector('title').textContent;
    document.querySelector('title').textContent = document.getElementById('timetable-name').textContent;
    window.print();
    document.querySelector('title').textContent = originalTitle;
}

// Generate PDF
function generatePDF() {
    console.log('Generating PDF with pdfCellScale:', pdfCellScale); // Debug log
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
    doc.text(document.getElementById('timetable-name').textContent, margin, margin + 5);

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

    const baseCellWidth = 15 * pdfCellScale; // Reduced base width for noticeable scaling
    const baseCellHeight = 7 * pdfCellScale;
    console.log('Base Cell Width:', baseCellWidth, 'Base Cell Height:', baseCellHeight); // Debug log
    const fontSize = 8 * pdfCellScale; // Scale font size with cells
    const lineHeight = fontSize * 0.4;
    const startX = margin;
    let startY = margin + 15;

    doc.setLineWidth(0.2 * pdfCellScale);
    doc.setDrawColor(224, 224, 224);
    doc.setFontSize(fontSize);

    let currentY = startY;
    tableData.forEach((row, rowIndex) => {
        let maxLines = 1;
        row.forEach(cell => {
            const lines = doc.splitTextToSize(cell, baseCellWidth - 2);
            maxLines = Math.max(maxLines, lines.length);
        });
        const cellHeight = (baseCellHeight + (maxLines - 1) * lineHeight);

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
        saveState();
        const previousLanguage = currentDays === DAYS_MS ? 'malay' : 'english';
        const oldDays = currentDays;
        currentDays = radio.value === 'malay' ? DAYS_MS : DAYS_EN;

        const oldData = JSON.parse(localStorage.getItem('timetable') || '{}');
        const newData = {};
        const oldDisplayDays = showWeekends ? oldDays : oldDays.slice(0, 6);
        const newDisplayDays = showWeekends ? currentDays : currentDays.slice(0, 6);

        TIME_SLOTS.forEach(time => {
            oldDisplayDays.slice(1).forEach((oldDay, index) => {
                const oldKey = `${oldDay}-${time}`;
                const newDay = newDisplayDays[index + 1];
                const newKey = `${newDay}-${time}`;
                if (oldData[oldKey]) {
                    newData[newKey] = oldData[oldKey];
                    console.log(`Mapping ${oldKey} to ${newKey}: ${oldData[oldKey]}`);
                }
            });
        });

        localStorage.setItem('timetable', JSON.stringify(newData));

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
    saveState();
    showWeekends = event.target.checked;
    createTimetable();
    saveTimetable();
});

document.getElementById('orientation-toggle').addEventListener('change', (event) => {
    saveState();
    isTimeOnLeft = event.target.checked;
    createTimetable();
    saveTimetable();
});

document.getElementById('add-slot-btn').addEventListener('click', () => {
    saveState();
    let insertIndex = TIME_SLOTS.length; // Default to end if no focus

    if (lastFocusedCell && lastFocusedCell.hasAttribute('contenteditable')) {
        if (lastFocusedCell.classList.contains('time-slot') && lastFocusedCell.dataset.timeIndex !== undefined) {
            // Time slot cell: insert before this index
            insertIndex = parseInt(lastFocusedCell.dataset.timeIndex) + 1;
            console.log('Adding slot before time slot index:', insertIndex);
        } else if (lastFocusedCell.dataset.time) {
            // Content cell: find index of current time
            const currentTime = lastFocusedCell.dataset.time;
            insertIndex = TIME_SLOTS.indexOf(currentTime) + 1;
            console.log('Adding slot before content cell time:', currentTime, 'at index:', insertIndex);
        }
    }

    const lastSlot = insertIndex > 0 ? TIME_SLOTS[insertIndex - 1] : TIME_SLOTS[TIME_SLOTS.length - 1];
    const [start] = lastSlot.split(' - ');
    const [hour, minute] = start.split(':');
    const newHour = (parseInt(hour) + 1) % 24;
    const newTimeSlot = `${newHour}:00 - ${newHour + 1}:00`;
    TIME_SLOTS.splice(insertIndex, 0, newTimeSlot);

    createTimetable();
    saveTimetable();
});

document.getElementById('remove-slot-btn').addEventListener('click', () => {
    if (TIME_SLOTS.length <= 1) {
        console.log('Cannot remove: only one time slot remains');
        return;
    }

    saveState();
    console.log('Remove button clicked, last focused cell:', lastFocusedCell);

    if (lastFocusedCell && lastFocusedCell.hasAttribute('contenteditable')) {
        let indexToRemove;
        let timeToRemove;

        if (lastFocusedCell.classList.contains('time-slot') && lastFocusedCell.dataset.timeIndex !== undefined) {
            // Time slot cell: use dataset.timeIndex
            indexToRemove = parseInt(lastFocusedCell.dataset.timeIndex);
            timeToRemove = TIME_SLOTS[indexToRemove];
            console.log('Focused time slot cell, index:', indexToRemove, 'time:', timeToRemove);
        } else if (lastFocusedCell.dataset.time) {
            // Other cell: use dataset.time
            timeToRemove = lastFocusedCell.dataset.time;
            indexToRemove = TIME_SLOTS.indexOf(timeToRemove);
            console.log('Focused content cell, time:', timeToRemove, 'index:', indexToRemove);
        }

        if (indexToRemove >= 0 && indexToRemove < TIME_SLOTS.length) {
            console.log('Removing time slot:', timeToRemove, 'at index:', indexToRemove);
            TIME_SLOTS.splice(indexToRemove, 1);

            const data = JSON.parse(localStorage.getItem('timetable') || '{}');
            const displayDays = showWeekends ? currentDays : currentDays.slice(0, 6);
            displayDays.slice(1).forEach(day => {
                const key = `${day}-${timeToRemove}`;
                delete data[key];
                console.log('Removed data for:', key);
            });
            localStorage.setItem('timetable', JSON.stringify(data));
        } else {
            console.log('Invalid index, falling back to removing last slot');
            TIME_SLOTS.pop();
        }
    } else {
        console.log('No valid cell focused, removing last slot as fallback');
        TIME_SLOTS.pop();
    }

    createTimetable();
    saveTimetable();
});

// Undo action
document.getElementById('undo-btn').addEventListener('click', () => {
    if (undoStack.length > 0) {
        const currentState = {
            timetable: JSON.parse(localStorage.getItem('timetable') || '{}'),
            timeSlots: [...TIME_SLOTS],
            language: currentDays === DAYS_MS ? 'malay' : 'english',
            timetableName: timetableName,
            showWeekends: showWeekends,
            pdfCellScale: pdfCellScale,
            isTimeOnLeft: isTimeOnLeft
        };
        redoStack.push(currentState);
        const previousState = undoStack.pop();
        restoreState(previousState);
        updateUndoRedoButtons();
        console.log('Undo performed, restored state:', previousState);
    }
});

// Redo action
document.getElementById('redo-btn').addEventListener('click', () => {
    if (redoStack.length > 0) {
        const currentState = {
            timetable: JSON.parse(localStorage.getItem('timetable') || '{}'),
            timeSlots: [...TIME_SLOTS],
            language: currentDays === DAYS_MS ? 'malay' : 'english',
            timetableName: timetableName,
            showWeekends: showWeekends,
            pdfCellScale: pdfCellScale,
            isTimeOnLeft: isTimeOnLeft
        };
        undoStack.push(currentState);
        const nextState = redoStack.pop();
        restoreState(nextState);
        updateUndoRedoButtons();
        console.log('Redo performed, restored state:', nextState);
    }
});

// Handle dropdown changes
document.getElementById('pdf-cell-scale').addEventListener('change', (event) => {
    saveState();
    const selectedValue = event.target.value;

    if (selectedValue === 'custom') {
        const customInput = document.getElementById('pdf-cell-scale-custom');
        customInput.style.display = 'inline-block';
        customInput.value = (pdfCellScale * 100).toFixed(0); // Show current scale as percentage
        customInput.focus();
        return; // Wait for custom input to set the value
    }

    // Convert percentage to decimal
    let scale = parseFloat(selectedValue) / 100;
    pdfCellScale = Math.max(0.25, Math.min(2, scale)); // Clamp between 25% (0.25) and 200% (2)
    console.log('PDF Cell Size Scale updated to:', pdfCellScale, `(Selected: ${selectedValue}%)`);

    // Hide custom input if not in use
    document.getElementById('pdf-cell-scale-custom').style.display = 'none';
    saveTimetable();
});

// Handle custom input changes
document.getElementById('pdf-cell-scale-custom').addEventListener('change', (event) => {
    saveState();
    let customValue = parseInt(event.target.value) || 100; // Default to 100% if invalid
    customValue = Math.max(25, Math.min(200, customValue)); // Clamp between 25% and 200%
    pdfCellScale = customValue / 100;

    const dropdown = document.getElementById('pdf-cell-scale');
    // Check if the custom value matches a predefined option
    const predefinedOption = dropdown.querySelector(`option[value="${customValue}"]`);
    if (predefinedOption) {
        dropdown.value = customValue; // Set to predefined value if it exists
    } else {
        dropdown.value = 'custom'; // Keep as "Custom..." if not a predefined value
    }

    event.target.style.display = 'none'; // Hide custom input after setting
    saveTimetable();
    console.log('Custom PDF Cell Size Scale updated to:', pdfCellScale, `(Custom: ${customValue}%)`);
});

// Initialize on load with fallback
function initializeApp() {
    console.log('Initializing app...');
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        loadInitialState();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded fired');
            loadInitialState();
        });
    }
}

initializeApp();