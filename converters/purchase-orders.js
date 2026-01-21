import fs from "fs";
import Papa from "papaparse";

// Parse CSV into array of objects
let data = Papa.parse(fs.readFileSync("input.csv", "utf-8"), {
  header: true,
}).data;

// Remove bottom row(s) if blank
while (!data[data.length - 1].PONumber) {
  data = data.slice(0, -1);
}

// Function to parse date format from Excel into ISO
const parseDate = (date) => {
  const [day, month, year] = date.split("/");
  return year && month && day
    ? new Date(year, month - 1, day).toISOString().substring(0, 10)
    : null;
};

// Create PO object and push to array
let purchaseOrderArray = [];

data.forEach((line) => {
  // Xero format, conditionally create fields if present in data
  const purchaseOrder = {
    [line.PONumber]: {
      PurchaseOrderNumber: line.PONumber,
      ...(line.Date && { Date: parseDate(line.Date) }),
      ...(line.DeliveryDate && { DeliveryDate: parseDate(line.DeliveryDate) }),
      Contact: {
        ContactID: line.ContactID,
      },
      LineItems: [
        {
          ...(line.Description && { Description: line.Description }),
          UnitAmount: line.UnitAmount,
          Quantity: parseFloat(line.Quantity).toFixed(4),
          TaxType: line.TaxType ?? "NONE",
          ...(line.AccountCode && { AccountCode: line.AccountCode }),
          ...(line.TrackingCategory1 && {
            Tracking: [
              line.TrackingCategory1 && {
                Name: line.TrackingCategory1,
                Option: line.TrackingOption1,
              },
              line.TrackingCategory2 && {
                Name: line.TrackingCategory2,
                Option: line.TrackingOption2,
              },
            ].filter(Boolean),
          }),
        },
      ],
    },
  };

  // Check if PO already exists, returning object in PO array if it does
  const existingPO = purchaseOrderArray.find((pO) => line.PONumber in pO);

  // Only push line items if PO already exists, else push entire PO object
  if (existingPO) {
    existingPO[line.PONumber].LineItems.push(
      purchaseOrder[line.PONumber].LineItems[0],
    );
  } else {
    purchaseOrderArray.push(purchaseOrder);
  }
});

// Remove PO number keys and write output.json
const xeroJson = JSON.stringify({
  PurchaseOrders: purchaseOrderArray.map((pO) => Object.values(pO)[0]),
});

fs.writeFileSync("output.json", xeroJson);
