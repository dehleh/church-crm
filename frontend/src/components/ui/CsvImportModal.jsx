import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// Simple CSV parser — handles quoted fields, commas inside quotes, newlines
function parseCSVText(text) {
  const rows = [];
  let fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else if ((ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      fields.push(current);
      current = '';
      if (ch === '\r') i++;
      if (fields.length > 0) {
        rows.push(fields);
        fields = [];
      }
    } else {
      current += ch;
    }
  }
  // Last field + last row
  fields.push(current);
  if (fields.some(f => f.trim())) rows.push(fields);
  return rows;
}

function mapRowsToObjects(headers, dataRows, columnMap) {
  return dataRows.map(row => {
    const obj = {};
    headers.forEach((_, idx) => {
      const targetField = columnMap[idx];
      if (targetField && targetField !== '__skip__') {
        obj[targetField] = row[idx] || '';
      }
    });
    return obj;
  });
}

// Template configs for each entity
const TEMPLATES = {
  members: {
    label: 'Members',
    fields: [
      { key: 'firstName', label: 'First Name', required: true },
      { key: 'lastName', label: 'Last Name', required: true },
      { key: 'middleName', label: 'Middle Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'gender', label: 'Gender (male/female)' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'maritalStatus', label: 'Marital Status' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'employer', label: 'Employer' },
      { key: 'membershipClass', label: 'Class (full/youth/child)' },
      { key: 'joinDate', label: 'Join Date' },
      { key: 'waterBaptized', label: 'Water Baptized (yes/no)' },
      { key: 'holyGhostBaptized', label: 'Holy Ghost Baptized (yes/no)' },
      { key: 'nextOfKinName', label: 'Next of Kin Name' },
      { key: 'nextOfKinPhone', label: 'Next of Kin Phone' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  firstTimers: {
    label: 'First Timers',
    fields: [
      { key: 'firstName', label: 'First Name', required: true },
      { key: 'lastName', label: 'Last Name', required: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'gender', label: 'Gender (male/female)' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'address', label: 'Address' },
      { key: 'howDidYouHear', label: 'How Did You Hear' },
      { key: 'visitDate', label: 'Visit Date' },
      { key: 'serviceAttended', label: 'Service Attended' },
      { key: 'prayerRequest', label: 'Prayer Request' },
    ],
  },
  transactions: {
    label: 'Transactions',
    fields: [
      { key: 'transactionType', label: 'Type (income/expense)', required: true },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'category', label: 'Category Name' },
      { key: 'description', label: 'Description' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'transactionDate', label: 'Date' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  requisitions: {
    label: 'Requisitions',
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'requisitionMonth', label: 'Month (YYYY-MM-01)', required: true },
      { key: 'totalAmount', label: 'Total Amount' },
      { key: 'description', label: 'Description' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  purchaseRequests: {
    label: 'Purchase Requests',
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'totalAmount', label: 'Total Amount', required: true },
      { key: 'vendorName', label: 'Vendor Name' },
      { key: 'priority', label: 'Priority (low/normal/high/urgent)' },
      { key: 'description', label: 'Description' },
    ],
  },
};

export default function CsvImportModal({ open, onClose, onComplete, entityType, importFn }) {
  const [step, setStep] = useState('upload'); // upload | map | preview | importing | done
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const template = TEMPLATES[entityType];
  if (!template) return null;

  const reset = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMap({});
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rows = parseCSVText(evt.target.result);
        if (rows.length < 2) {
          toast.error('CSV must have a header row and at least one data row');
          return;
        }

        const headers = rows[0].map(h => h.trim());
        const data = rows.slice(1).filter(r => r.some(c => c.trim()));
        setCsvHeaders(headers);
        setCsvData(data);

        // Auto-map columns by fuzzy matching
        const autoMap = {};
        headers.forEach((h, idx) => {
          const hLower = h.toLowerCase().replace(/[_\s-]/g, '');
          const match = template.fields.find(f => {
            const fLower = f.key.toLowerCase();
            const fLabel = f.label.toLowerCase().replace(/[_\s-]/g, '').replace(/\([^)]*\)/g, '');
            return hLower === fLower || hLower === fLabel || hLower.includes(fLower) || fLower.includes(hLower);
          });
          autoMap[idx] = match ? match.key : '__skip__';
        });
        setColumnMap(autoMap);
        setStep('map');
      } catch (err) {
        toast.error('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleMapChange = (colIdx, fieldKey) => {
    setColumnMap(prev => ({ ...prev, [colIdx]: fieldKey }));
  };

  const goToPreview = () => {
    // Check required fields are mapped
    const mapped = new Set(Object.values(columnMap));
    const missing = template.fields.filter(f => f.required && !mapped.has(f.key));
    if (missing.length > 0) {
      toast.error(`Required fields not mapped: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    setStep('preview');
  };

  const doImport = async () => {
    setStep('importing');
    try {
      const rows = mapRowsToObjects(csvHeaders, csvData, columnMap);
      const { data } = await importFn({ rows });
      setResult(data.data || data);
      setStep('done');
      if (data.data?.imported > 0 || data.imported > 0) {
        onComplete?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
      setStep('preview');
    }
  };

  const downloadTemplate = () => {
    const headers = template.fields.map(f => f.key);
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-brand-600" />
            Import {template.label} from CSV
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer
                           hover:border-brand-400 hover:bg-brand-50 transition-colors"
              >
                <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="font-medium text-gray-700">Click to select a CSV file</p>
                <p className="text-sm text-gray-500 mt-1">Maximum 500 rows, 5MB file size</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
              >
                <Download size={14} />
                Download CSV template for {template.label}
              </button>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Expected columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {template.fields.map(f => (
                    <span
                      key={f.key}
                      className={`text-xs px-2 py-1 rounded-full ${
                        f.required ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {f.label} {f.required && '*'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Column Mapping */}
          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Found <strong>{csvData.length}</strong> data rows. Map each CSV column to the correct field:
              </p>
              <div className="space-y-2">
                {csvHeaders.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-gray-700 font-medium truncate" title={h}>
                      {h}
                    </span>
                    <span className="text-gray-400">→</span>
                    <select
                      className="flex-1 text-sm border rounded-lg px-3 py-1.5"
                      value={columnMap[idx] || '__skip__'}
                      onChange={e => handleMapChange(idx, e.target.value)}
                    >
                      <option value="__skip__">— Skip this column —</option>
                      {template.fields.map(f => (
                        <option key={f.key} value={f.key}>
                          {f.label} {f.required ? '*' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Preview of first 5 rows (out of {csvData.length} total):
              </p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                      {template.fields
                        .filter(f => Object.values(columnMap).includes(f.key))
                        .map(f => (
                          <th key={f.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            {f.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mapRowsToObjects(csvHeaders, csvData.slice(0, 5), columnMap).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        {template.fields
                          .filter(f => Object.values(columnMap).includes(f.key))
                          .map(f => (
                            <td key={f.key} className="px-3 py-2 text-gray-700 max-w-[150px] truncate">
                              {row[f.key] || '—'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700">
                  {csvData.length} rows will be imported. Rows with missing required fields will be skipped.
                </p>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-gray-600 font-medium">Importing {csvData.length} rows...</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={32} className="text-green-500" />
                <div>
                  <p className="font-bold text-gray-900 text-lg">Import Complete</p>
                  <p className="text-sm text-gray-600">
                    <span className="text-green-600 font-semibold">{result.imported}</span> imported,{' '}
                    <span className="text-amber-600 font-semibold">{result.skipped}</span> skipped
                  </p>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium text-red-700 mb-2">Errors ({result.errors.length}):</p>
                  {result.errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-xs text-red-600">
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-xs text-red-500 mt-1">...and {result.errors.length - 20} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          <div className="flex gap-2">
            {step === 'map' && (
              <>
                <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">
                  Back
                </button>
                <button onClick={goToPreview} className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700">
                  Preview Data
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('map')} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">
                  Back
                </button>
                <button onClick={doImport} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700">
                  Import {csvData.length} Rows
                </button>
              </>
            )}
            {step === 'done' && (
              <button onClick={handleClose} className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
