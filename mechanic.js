// Auto-fill saved customer data from localStorage
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

// VIN Lookup
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

// Signature pad
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

// PDF Download
document.getElementById("downloadPDF").addEventListener("click", () => {
  saveCustomerData(); // Save before exporting

  const { jsPDF } = window.jspdf;
  html2canvas(document.body, { scale: 2 }).then((canvas) => {
    const pdf = new jsPDF("p", "pt", "a4");
    const imgData = canvas.toDataURL("image/png");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("mechanic-form.pdf");
  });
});