export function printDeliveryDocument(delivery) {
  if (!delivery) {
    return false;
  }

  const items = Array.isArray(delivery.items) ? delivery.items : [];
  const refNo = delivery.reference_no || 'DELIVERY-DRAFT';
  const customer = delivery.customer_name || 'Direct Customer';
  const warehouse = delivery.warehouse_name || 'Warehouse';
  const location = delivery.source_location_name || 'Dispatch Location';
  const operator = delivery.created_by_name || 'System Operator';
  const status = (delivery.status || 'draft').toUpperCase();
  const dateStr = delivery.created_at ? new Date(delivery.created_at).toLocaleString() : new Date().toLocaleString();
  const validatedStr = delivery.validated_at ? new Date(delivery.validated_at).toLocaleString() : 'Pending Dispatch';

  const rowsHtml = items.map((itm, idx) => {
    const qty = parseFloat(itm.quantity || 0);
    const unit = itm.unit_of_measure || 'units';
    return `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-family: monospace; font-weight: bold;">${itm.sku || '-'}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: 500;">${itm.product_name || 'Item'}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${qty.toLocaleString()} ${unit}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Delivery Slip - ${refNo}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            padding: 30px;
            margin: 0;
            background: #fff;
          }
          .slip-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .company-title {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0 0 4px 0;
          }
          .slip-type {
            font-size: 13px;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .ref-box {
            text-align: right;
          }
          .ref-number {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 4px 0;
          }
          .status-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 8px;
            border: 1px solid #111;
            border-radius: 3px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 28px;
            font-size: 13px;
            background: #fbfbfb;
            padding: 16px;
            border: 1px solid #e5e5e5;
            border-radius: 6px;
          }
          .info-field {
            margin-bottom: 6px;
          }
          .info-label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            color: #666;
            display: block;
            margin-bottom: 2px;
          }
          .info-val {
            font-weight: 600;
            color: #111;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 13px;
          }
          th {
            background: #f0f0f0;
            border-top: 1px solid #333;
            border-bottom: 2px solid #111;
            padding: 10px 8px;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sign-section {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
          }
          .sign-box {
            width: 220px;
            text-align: center;
          }
          .sign-line {
            border-top: 1px solid #111;
            margin-top: 50px;
            padding-top: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          @media print {
            body { padding: 15px; }
            .info-grid { background: transparent !important; }
            th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="slip-header">
          <div>
            <h1 class="company-title">StockSense Warehouse System</h1>
            <p class="slip-type">Outbound Goods Delivery Note</p>
          </div>
          <div class="ref-box">
            <div class="ref-number">${refNo}</div>
            <span class="status-badge">${status}</span>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-field">
              <span class="info-label">Customer / Recipient</span>
              <span class="info-val">${customer}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Dispatch Location</span>
              <span class="info-val">${warehouse} &mdash; ${location}</span>
            </div>
          </div>
          <div>
            <div class="info-field">
              <span class="info-label">Order Created</span>
              <span class="info-val">${dateStr}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Operator / Handler</span>
              <span class="info-val">${operator}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Validation Status</span>
              <span class="info-val">${validatedStr}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 120px;">SKU</th>
              <th>Product Description</th>
              <th style="width: 140px; text-align: right;">Quantity to Dispatch</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sign-section">
          <div class="sign-box">
            <div class="sign-line">Warehouse Dispatcher Signature</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Customer / Carrier Signature</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  openPrintWindow(html, `Delivery_${refNo}`);
  return true;
}

export function printReceiptDocument(receipt) {
  if (!receipt) {
    return false;
  }

  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const refNo = receipt.reference_no || 'RECEIPT-DRAFT';
  const supplier = receipt.supplier_name || 'General Supplier';
  const warehouse = receipt.warehouse_name || 'Warehouse';
  const location = receipt.destination_location_name || 'Receiving Location';
  const operator = receipt.created_by_name || 'System Operator';
  const status = (receipt.status || 'draft').toUpperCase();
  const dateStr = receipt.created_at ? new Date(receipt.created_at).toLocaleString() : new Date().toLocaleString();
  const validatedStr = receipt.validated_at ? new Date(receipt.validated_at).toLocaleString() : 'Pending Receipt';

  const rowsHtml = items.map((itm, idx) => {
    const qty = parseFloat(itm.quantity || 0);
    const unit = itm.unit_of_measure || 'units';
    return `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-family: monospace; font-weight: bold;">${itm.sku || '-'}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: 500;">${itm.product_name || 'Item'}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">+${qty.toLocaleString()} ${unit}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Goods Receipt Note - ${refNo}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            padding: 30px;
            margin: 0;
            background: #fff;
          }
          .slip-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .company-title {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0 0 4px 0;
          }
          .slip-type {
            font-size: 13px;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .ref-box {
            text-align: right;
          }
          .ref-number {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 4px 0;
          }
          .status-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 8px;
            border: 1px solid #111;
            border-radius: 3px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 28px;
            font-size: 13px;
            background: #fbfbfb;
            padding: 16px;
            border: 1px solid #e5e5e5;
            border-radius: 6px;
          }
          .info-field {
            margin-bottom: 6px;
          }
          .info-label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            color: #666;
            display: block;
            margin-bottom: 2px;
          }
          .info-val {
            font-weight: 600;
            color: #111;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 13px;
          }
          th {
            background: #f0f0f0;
            border-top: 1px solid #333;
            border-bottom: 2px solid #111;
            padding: 10px 8px;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sign-section {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
          }
          .sign-box {
            width: 220px;
            text-align: center;
          }
          .sign-line {
            border-top: 1px solid #111;
            margin-top: 50px;
            padding-top: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          @media print {
            body { padding: 15px; }
            .info-grid { background: transparent !important; }
            th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="slip-header">
          <div>
            <h1 class="company-title">StockSense Warehouse System</h1>
            <p class="slip-type">Inbound Goods Receiving Note (GRN)</p>
          </div>
          <div class="ref-box">
            <div class="ref-number">${refNo}</div>
            <span class="status-badge">${status}</span>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-field">
              <span class="info-label">Supplier / Source</span>
              <span class="info-val">${supplier}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Destination Location</span>
              <span class="info-val">${warehouse} &mdash; ${location}</span>
            </div>
          </div>
          <div>
            <div class="info-field">
              <span class="info-label">Receipt Logged</span>
              <span class="info-val">${dateStr}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Receiving Officer</span>
              <span class="info-val">${operator}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Validation Status</span>
              <span class="info-val">${validatedStr}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 120px;">SKU</th>
              <th>Product Description</th>
              <th style="width: 140px; text-align: right;">Quantity Received</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sign-section">
          <div class="sign-box">
            <div class="sign-line">Received & Inspected By</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Delivery Driver / Carrier</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  openPrintWindow(html, `Receipt_${refNo}`);
  return true;
}

function openPrintWindow(html, title) {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
