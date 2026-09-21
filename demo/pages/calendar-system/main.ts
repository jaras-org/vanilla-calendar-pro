import * as calendarSystemCore from '@scripts/calendarSystem/core';

Object.assign(window, { calendarSystemCore });

const readyEl = document.getElementById('ready');
if (readyEl) readyEl.textContent = 'ready';
