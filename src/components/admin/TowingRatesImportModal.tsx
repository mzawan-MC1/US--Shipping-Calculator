import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  AdminTowingRate,
  AdminPurchaseLocation,
  AdminState,
} from '../../services/adminService';
import {
  towingRatesBulkService,
  TowingRateImportSummary,
} from '../../services/towingBulkService';
import {
  Upload,
  Download,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface TowingRatesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  existingRates: AdminTowingRate[];
  locations: AdminPurchaseLocation[];
  ports: Array<{ id: string; name: string; code: string }>;
  states: AdminState[];
}

export const TowingRatesImportModal: React.FC<TowingRatesImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingRates,
  locations,
  ports,
  states,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summary, setSummary] = useState<TowingRateImportSummary | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setIsAnalyzing(true);

    try {
      const res = await towingRatesBulkService.parseFile(
        file,
        existingRates,
        locations,
        ports,
        states
      );
      setSummary(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse file.');
      setSummary(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!summary) return;
    setIsCommitting(true);
    setError(null);

    try {
      const { appliedCount } = await towingRatesBulkService.commitImport(summary.rows);
      onSuccess(`Successfully imported/updated ${appliedCount} towing rate(s).`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to commit imported rates.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importableCount = summary ? summary.newCount + summary.updatedCount : 0;
  const rejectedRows = summary ? summary.rows.filter((r) => r.status === 'rejected') : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Towing Rates (CSV / Excel)"
    >
      <div className="space-y-4 pt-1 text-xs">
        {/* Template Downloads & Info */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="font-bold text-slate-800 block">Download Template</span>
            <span className="text-[11px] text-slate-500">
              Includes required headers, sample rows, and valid port codes.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => towingRatesBulkService.downloadTemplate('csv')}
              className="text-[11px] font-bold"
            >
              <Download className="w-3 h-3 mr-1" /> .CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => towingRatesBulkService.downloadTemplate('xlsx')}
              className="text-[11px] font-bold"
            >
              <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-600" /> .XLSX
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* File Upload / Drop Area */}
        {!summary ? (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-brand-orange-500 transition-colors bg-slate-50/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
              id="towingRateFileInput"
            />
            <label
              htmlFor="towingRateFileInput"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-brand-orange-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800 text-sm">
                {isAnalyzing ? 'Analyzing file...' : 'Choose a CSV or Excel file'}
              </span>
              <span className="text-slate-500 text-[11px]">
                Supports .csv, .xlsx, .xls with up to 10,000 rate rows
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info Bar */}
            <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg text-slate-700 font-semibold">
              <span className="truncate max-w-xs">{selectedFile?.name}</span>
              <button
                type="button"
                onClick={handleReset}
                className="text-brand-orange-600 hover:underline text-[11px] font-bold"
              >
                Upload different file
              </button>
            </div>

            {/* Validation Metrics Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Total</span>
                <span className="text-base font-bold text-slate-800">{summary.total}</span>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                <span className="block text-[10px] text-emerald-700 font-bold uppercase">New</span>
                <span className="text-base font-bold text-emerald-700">{summary.newCount}</span>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
                <span className="block text-[10px] text-blue-700 font-bold uppercase">Updated</span>
                <span className="text-base font-bold text-blue-700">{summary.updatedCount}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Unchanged</span>
                <span className="text-base font-bold text-slate-600">{summary.unchangedCount}</span>
              </div>
              <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-center">
                <span className="block text-[10px] text-rose-700 font-bold uppercase">Rejected</span>
                <span className="text-base font-bold text-rose-700">{summary.rejectedCount}</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                <span className="block text-[10px] text-amber-700 font-bold uppercase">Duplicates</span>
                <span className="text-base font-bold text-amber-700">{summary.duplicateCount}</span>
              </div>
            </div>

            {/* Download error report if any rejected */}
            {summary.rejectedCount > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>{summary.rejectedCount} row(s)</strong> failed validation. Download error report to inspect details.
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => towingRatesBulkService.downloadErrorReport(rejectedRows, 'csv')}
                    className="text-[10px] border-rose-300 text-rose-800 hover:bg-rose-100"
                  >
                    CSV Report
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => towingRatesBulkService.downloadErrorReport(rejectedRows, 'xlsx')}
                    className="text-[10px] border-rose-300 text-rose-800 hover:bg-rose-100"
                  >
                    Excel Report
                  </Button>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-start text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Port</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Rate</th>
                    <th className="p-2">Details / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {summary.rows.map((row) => {
                    const badgeVariant =
                      row.status === 'new'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : row.status === 'updated'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : row.status === 'unchanged'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : row.status === 'duplicate'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200';

                    return (
                      <tr key={row.rowNumber} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-400">#{row.rowNumber}</td>
                        <td className="p-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeVariant}`}
                          >
                            {row.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 font-semibold text-slate-800">
                          {row.locationName} ({row.stateCode})
                        </td>
                        <td className="p-2 text-slate-600">{row.portCode}</td>
                        <td className="p-2">
                          {row.vehicleCategoryId ? row.vehicleCategoryId.toUpperCase() : 'ALL'}
                        </td>
                        <td className="p-2 font-bold text-brand-navy-950">
                          {row.rateType === 'fixed'
                            ? `$${row.fixedAmount || 0}`
                            : `$${row.minAmount || 0}-$${row.maxAmount || 0}`}
                        </td>
                        <td className="p-2 text-[11px] text-slate-500">
                          {row.errors.length > 0 ? (
                            <span className="text-rose-600 font-medium">
                              {row.errors.join('; ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">Valid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isCommitting}>
            Cancel
          </Button>
          {summary && importableCount > 0 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCommit}
              disabled={isCommitting}
              className="font-bold"
            >
              {isCommitting ? 'Importing Rates...' : `Confirm & Import (${importableCount} Rates)`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
