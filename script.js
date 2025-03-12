const { jsPDF } = window.jspdf;
let timetableData = JSON.parse(localStorage.getItem('timetableData')) || {};

document.addEventListener('DOMContentLoaded', () => {
    renderTimetable();
    setupEventListeners();
});

function setupEventListeners() {
    const modal = document.getElementById('classModal');
    const addClassBtn = document.getElementById('addClass');
    const closeBtn = document.querySelector('.close');
    const classForm = document.getElementById('classForm');
    const printBtn = document.getElementById('printBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const clearBtn = document.getElementById('clearBtn');
    const bgColor = document.getElementById('bgColor');
    const fontFamily = document.getElementById('fontFamily');

    addClassBtn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    classForm.onsubmit = (e) => {
        e.preventDefault();
        addClass();
        modal.style.display = 'none';
    };

    printBtn.onclick = () => window.print();
    savePdfBtn.onclick = generatePDF;
    clearBtn.onclick = () => {
        timetableData = {};
        localStorage.setItem('timetableData', JSON.stringify(timetableData));
        renderTimetable();
    };

    bgColor.onchange = () => {
        document.getElementById('timetable').style.backgroundColor = bgColor.value;
        saveCustomization();
    };
    fontFamily.onchange = () => {
        document.getElementById('timetable').style.fontFamily = fontFamily.value;
        saveCustomization();
    };

    // Load saved customization
    const savedCustomization = JSON.parse(localStorage.getItem('customization')) || {};
    if (savedCustomization.bgColor) {
        bgColor.value = savedCustomization.bgColor;
        document.getElementById('timetable').style.backgroundColor = savedCustomization.bgColor;
    }
    if (savedCustomization.fontFamily) {
        fontFamily.value = savedCustomization.fontFamily;
        document.getElementById('timetable').style.fontFamily = savedCustomization.fontFamily;
    }
}

function addClass() {
    const subject = document.getElementById('subject').value;
    const day = document.getElementById('day').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const location = document.getElementById('location').value;
    const color = document.getElementById('classColor').value;

    if (!timetableData[day]) timetableData[day] = [];
    timetableData[day].push({ subject, startTime, endTime, location, color });

    localStorage.setItem('timetableData', JSON.stringify(timetableData));
    renderTimetable();
    document.getElementById('classForm').reset();
}

function renderTimetable() {
    const timetable = document.getElementById('timetable');
    timetable.innerHTML = '';

    const days = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'header';
        div.textContent = day;
        timetable.appendChild(div);
    });

    for (let hour = 8; hour < 20; hour++) {
        for (let col = 0; col < 8; col++) {
            const div = document.createElement('div');
            if (col === 0) {
                div.textContent = `${hour}:00 - ${hour + 1}:00`;
                div.className = 'header';
            } else {
                const day = days[col];
                if (timetableData[day]) {
                    timetableData[day].forEach(item => {
                        const startHour = parseInt(item.startTime.split(':')[0]);
                        if (startHour === hour) {
                            const classDiv = document.createElement('div');
                            classDiv.className = 'class-item';
                            classDiv.style.backgroundColor = item.color;
                            classDiv.innerHTML = `${item.subject}<br>${item.startTime} - ${item.endTime}<br>${item.location || ''}`;
                            div.appendChild(classDiv);
                        }
                    });
                }
            }
            timetable.appendChild(div);
        }
    }
}

function generatePDF() {
    const doc = new jsPDF();
    const timetable = document.getElementById('timetable');
    doc.html(timetable, {
        callback: function (doc) {
            doc.save('timetable.pdf');
        },
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 1000
    });
}

function saveCustomization() {
    const customization = {
        bgColor: document.getElementById('bgColor').value,
        fontFamily: document.getElementById('fontFamily').value
    };
    localStorage.setItem('customization', JSON.stringify(customization));
}