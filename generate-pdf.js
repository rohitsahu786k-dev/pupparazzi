const fs = require('fs');
const { jsPDF } = require('jspdf');

// Read the markdown guide file
const content = fs.readFileSync('PUPPARAZZI_COMPLETE_GUIDE.md', 'utf-8');

// Create PDF document
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Set margins and boundaries
const margin = 20;
const pageHeight = 297;
const pageWidth = 210;
const maxLineWidth = pageWidth - (margin * 2);

let y = margin;

function addNewPage() {
  doc.addPage();
  y = margin;
}

// Split content by lines
const lines = content.split('\n');
let inMermaid = false;

// Set default fonts
doc.setFont('Helvetica', 'normal');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trimEnd();

  // Handle mermaid block toggle
  if (line.trim().startsWith('```mermaid')) {
    inMermaid = true;
    continue;
  }
  if (inMermaid && line.trim().startsWith('```')) {
    inMermaid = false;
    continue;
  }
  if (inMermaid) {
    // Skip diagram code inside PDF to keep text clean
    continue;
  }

  // Handle markdown blocks/headers
  let isHeader1 = false;
  let isHeader2 = false;
  let isHeader3 = false;
  let text = line;

  if (line.startsWith('# ')) {
    isHeader1 = true;
    text = line.substring(2);
  } else if (line.startsWith('## ')) {
    isHeader2 = true;
    text = line.substring(3);
  } else if (line.startsWith('### ')) {
    isHeader3 = true;
    text = line.substring(4);
  } else if (line.startsWith('---')) {
    // Draw horizontal separator line
    if (y + 5 > pageHeight - margin) addNewPage();
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    continue;
  }

  if (!text.trim()) {
    y += 4; // Spacing for empty lines
    continue;
  }

  // Set style and font size based on header type
  if (isHeader1) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    y += 5;
  } else if (isHeader2) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    y += 4;
  } else if (isHeader3) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    y += 3;
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
  }

  // Wrap text to fit page margins
  const splitText = doc.splitTextToSize(text, maxLineWidth);
  
  // Calculate text block height
  const lineHeight = isHeader1 ? 8 : (isHeader2 ? 6 : (isHeader3 ? 5 : 5));
  const totalHeight = splitText.length * lineHeight;

  if (y + totalHeight > pageHeight - margin) {
    addNewPage();
  }

  // Print text lines
  splitText.forEach((tLine) => {
    // Clean markdown bold notation from text
    const cleanLine = tLine.replace(/\*\*/g, '');
    doc.text(cleanLine, margin, y);
    y += lineHeight;
  });

  // Extra spacing after headers
  if (isHeader1) y += 6;
  else if (isHeader2) y += 4;
  else if (isHeader3) y += 3;
  else y += 2;
}

doc.save('PUPPARAZZI_COMPLETE_GUIDE.pdf');
console.log('PDF Generated successfully as PUPPARAZZI_COMPLETE_GUIDE.pdf');
