"use strict";
const XLSX = require('xlsx');
const path = require('path');
const headers = [
    'Name',
    'Designation',
    'Number',
    'Department',
    'Email (Optional)',
    'Remarks (Optional)',
];
const sampleData = [
    {
        'Name': 'John Doe',
        'Designation': 'Manager',
        'Number': '0300-1234567',
        'Department': 'IT',
        'Email (Optional)': 'john@example.com',
        'Remarks (Optional)': 'Team Lead',
    },
];
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(sampleData);
// Add column widths
const colWidths = [
    { wch: 20 }, // Name
    { wch: 20 }, // Designation
    { wch: 15 }, // Number
    { wch: 20 }, // Department
    { wch: 25 }, // Email
    { wch: 30 }, // Remarks
];
worksheet['!cols'] = colWidths;
XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts Template');
const outputPath = path.join(process.cwd(), 'public', 'templates', 'contacts_template.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log('Template generated successfully at:', outputPath);
