window.addEventListener("DOMContentLoaded", () => {
  const savedData = JSON.parse(localStorage.getItem("customerData"));
  if (savedData) {
    document.getElementById("customerName").value = savedData.customerName || "";
    document.getElementById("roTag").value = savedData.roTag || "";
    document.getElementById("mileage").value = savedData.mileage || "";
    document.getElementById("serviceDate").value = savedData.serviceDate || new Date().toISOString().slice(0, 10);
  } else {
    document.getElementById("serviceDate").value = new Date().toISOString().slice(0, 10);
  }
});
function saveCustomerData() {
  const data = {
    customerName: document.getElementById("customerName").value.trim(),
    roTag: document.getElementById("roTag").value.trim(),
    mileage: document.getElementById("mileage").value.trim(),
    serviceDate: document.getElementById("serviceDate").value,
  };
  localStorage.setItem("customerData", JSON.stringify(data));
}


async function fetchCarData(vin) {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.Results[0];
  } catch (error) {
    console.error("VIN lookup failed", error);
    return null;
  }
}

function fillInspectionChecklist(checklists) {
  const carDiv = document.querySelector(".car-inspection");
  const tireDiv = document.querySelector(".tire-inspection");
  carDiv.innerHTML = "";
  tireDiv.innerHTML = "";

  checklists.car.forEach((item) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    label.appendChild(checkbox);
    label.append(" " + item);
    carDiv.appendChild(label);
  });

  checklists.tire.forEach((item) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    label.appendChild(checkbox);
    label.append(" " + item);
    tireDiv.appendChild(label);
  });
}

document.getElementById("lookupBtn").addEventListener("click", async () => {
  const vin = document.getElementById("serialNumber").value.trim();
  if (!vin || vin.length < 5) return alert("Enter a valid VIN.");

  const result = await fetchCarData(vin);
  if (!result || !result.Make || !result.Model) {
    alert("VIN not found.");
    return;
  }

  document.getElementById("carYear").value = result.ModelYear;
  document.getElementById("carMake").value = result.Make;
  document.getElementById("carModel").value = result.Model;

  fillInspectionChecklist({
    car: [
      " Engine Oil",
      "Brake Fluid",
      " Coolant Level",
      " Lights & Signals",
      " Battery Health",
      " Wiper Blades & Washer Fluid",
      " Air Filter",
      " Cabin Filter",
      " Drive Belt Condition",
      " Emissions System",
      " Electronic Control Units",
      " Radiator & Hoses",
      " Horn Function",
      " TPMS Warning Lights",
      " ADAS Calibration",
      " Fluid Leaks",
      " Steering & Suspension",
      " Exhaust System",
      " Charging Port (EV) or Fuel Cap"
    ],
    tire: [
      " Front Left Tire Condition",
      " Front Right Tire Condition",
      " Rear Left Tire Condition",
      " Rear Right Tire Condition",
      " Tire Pressure",
      " TPMS Sensor Functionality",
      " Wheel Alignment",
      " Tire Rotation Needed"
    ]
  });
});


const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");
let drawing = false;

canvas.addEventListener("mousedown", () => drawing = true);
canvas.addEventListener("mouseup", () => {
  drawing = false;
  ctx.beginPath();
});
canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
});
document.getElementById("clearSignature").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById("downloadPDF").addEventListener("click", async () => {
  saveCustomerData();

  const original = document.getElementById("pdf-content");
  const { jsPDF } = window.jspdf;

  // ---- Build a clean clone for PDF (no real inputs/checkboxes) ----
  const clone = original.cloneNode(true);
  clone.classList.add("pdf-clone", "pdf-mode");

  // Put clone off-screen so it renders but isn't visible
  clone.style.position = "fixed";
  clone.style.left = "-99999px";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.maxWidth = "none";

  document.body.appendChild(clone);

  // Replace inputs with styled text blocks (better than screenshotting inputs)
  clone.querySelectorAll("input[type='text'], input[type='number'], input[type='date']").forEach((inp) => {
    const div = document.createElement("div");
    div.className = "pdf-field";
    div.textContent = inp.value ? inp.value : ""; // keep empty if blank
    inp.replaceWith(div);
  });

  // Replace checkboxes with ☑ / ☐ (always visible in PDF)
  clone.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    const mark = document.createElement("span");
    mark.className = "pdf-check";
    mark.textContent = cb.checked ? "☑" : "☐";
    cb.replaceWith(mark);
  });

  // Replace signature canvas with image (clone canvas won't have drawing)
  const originalCanvas = document.getElementById("signaturePad");
  const cloneCanvas = clone.querySelector("#signaturePad");
  if (originalCanvas && cloneCanvas) {
    const img = document.createElement("img");
    img.src = originalCanvas.toDataURL("image/png");
    img.style.width = originalCanvas.width + "px";
    img.style.height = originalCanvas.height + "px";
    img.style.border = "2px solid #111";
    img.style.borderRadius = "10px";
    cloneCanvas.replaceWith(img);
  }

  // Wait a moment for clone layout/fonts to settle
  await new Promise((r) => setTimeout(r, 200));

  // ---- Capture the clone ----
  const fullCanvas = await html2canvas(clone, {
    scale: 3,
    backgroundColor: "#ffffff",
    useCORS: true
  });

  // Remove clone right after capture
  document.body.removeChild(clone);

  // ---- Convert to multi-page A4 PDF ----
  const pdf = new jsPDF("p", "pt", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const canvasWidth = fullCanvas.width;
  const canvasHeight = fullCanvas.height;

  const pageHeightPx = Math.floor((canvasWidth * pdfHeight) / pdfWidth);

  let y = 0;
  let pageIndex = 0;

  while (y < canvasHeight) {
    const sliceHeight = Math.min(pageHeightPx, canvasHeight - y);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvasWidth;
    pageCanvas.height = sliceHeight;

    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, sliceHeight);

    ctx.drawImage(
      fullCanvas,
      0, y, canvasWidth, sliceHeight,
      0, 0, canvasWidth, sliceHeight
    );

    const imgData = pageCanvas.toDataURL("image/png", 1.0);

    if (pageIndex > 0) pdf.addPage();

    pdf.setFillColor(15, 16, 32);
    pdf.rect(0, 0, pdfWidth, pdfHeight, "F");

    const imgHeightPt = (sliceHeight * pdfWidth) / canvasWidth;
    const yOffset = 0;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeightPt);

    y += sliceHeight;
    pageIndex++;
  }

  pdf.save("mechanic-inspection-form.pdf");
});

