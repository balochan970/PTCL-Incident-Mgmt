"use client";
import '../styles/globals.css';
import { useState, ChangeEvent, FormEvent, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import TemplatesOverlay from '../components/TemplatesOverlay';
import NavBar from '../components/NavBar';
import { collection, addDoc, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { createGPONIncidents, GPONIncidentData, GPONFaultData } from '../services/incidentService';

interface FATEntry {
  id: string;
  value: string;
}

interface FSPEntry {
  id: string;
  value: string;
}

interface GPONFault {
  fdh: string;
  fats: FATEntry[];
  oltIp: string;
  fsps: FSPEntry[];
  isOutage: boolean;
  remarks?: string;
}

// Constants
const exchanges = [
  "EPZA", "GADAP", "GULISTAN-e-JAUHAR", "GULSHAN-e-HADEED", "GULSHAN-e-MEHRAN",
  "KAP", "KATHORE", "LANDHI", "MALIR CANTT", "MEMON GOTH", "MMC", "PAK CAPITAL", 
  "PORT QASIM", "SHAH LATIF"
];

const morningTeamMembers = [
  'A. Rehman Splicer', 'A. Shahid Splicer', 'Adnan AM', 'Adnan Splicer',
  'Akhtar Labor', 'Faizan Splicer', 'Ghazi Team Lead', 'Gulshan Splicer',
  'Hafeez Splicer', 'Hassan Splicer', 'Hasnain Splicer', 'Junaid Splicer',
  'Kaleem Ansari Sb', 'Kareem Splicer', 'Owais Team Lead', 'Rasheed Splicer',
  'S. Alam AM', 'Safeer Splicer', 'Sameer Splicer', 'Usama Splicer',
  'Uzair Splicer', 'Zain Splicer', 'Zubair Splicer'
];

const nightTeamMembers = [...morningTeamMembers];

const switchAccessTicketGenerators = [
  'Absheer', 'Aalay Ahmed', 'Akhtar', 'Ali Haider', 'Asif', 'Fahad', 'Jaffar',
  'Kamran', 'Muneer', 'Syed Raza', 'Syed Jaffar', 'Saad', 'Sania', 'Shahzad', 'Talib', 'Taimoor'
];

const transportTicketGenerators = [...switchAccessTicketGenerators];

const phoneContacts = [
  { name: 'Aalay Ahmed', number: '923311345985' },
  { name: 'Akhtar', number: '923332248442' },
  { name: 'Absheer', number: '923312099218' },
  { name: 'Ali Haider', number: '923242890802' },
  { name: 'Asif', number: '923312271166' },
  { name: 'Fahad', number: '923353266059' },
  { name: 'Kamran', number: '923313505170' },
  { name: 'Muneer', number: '923313476949' },
  { name: 'Syed Raza', number: '923304503999' },
  { name: 'Syed Jaffar', number: '923333592557' },
  { name: 'Saad', number: '923042265312' },
  { name: 'Sania', number: '923301235598' },
  { name: 'Shahzad', number: '92333639598' },
  { name: 'Talib', number: '923357485461' },
  { name: 'Taimoor', number: '923312524443' }
];

export default function GPONFaultsPage() {
  const [ticketGenerator, setTicketGenerator] = useState<string>('');
  const [showTicketGeneratorInMessage, setShowTicketGeneratorInMessage] = useState(false);
  const [exchangeName, setExchangeName] = useState<string>('');
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [customStakeholder, setCustomStakeholder] = useState('');
  const [showCustomStakeholder, setShowCustomStakeholder] = useState(false);
  const [faults, setFaults] = useState<GPONFault[]>([]);
  const [incidentOutput, setIncidentOutput] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [domain, setDomain] = useState<string>('Switch/Access'); // GPON is always Switch/Access
  const [availableStakeholders, setAvailableStakeholders] = useState<string[]>(morningTeamMembers);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Add fault
  const addFault = () => {
    const newFault: GPONFault = {
      fdh: '',
      fats: [{ id: Date.now().toString(), value: '' }],
      oltIp: '',
      fsps: [{ id: Date.now().toString(), value: '' }],
      isOutage: false,
      remarks: ''
    };
    setFaults([...faults, newFault]);
  };

  // Add FAT entry
  const addFAT = (faultIndex: number) => {
    const newFaults = [...faults];
    newFaults[faultIndex].fats.push({
      id: Date.now().toString(),
      value: ''
    });
    setFaults(newFaults);
  };

  // Add F/S/P entry
  const addFSP = (faultIndex: number) => {
    const newFaults = [...faults];
    newFaults[faultIndex].fsps.push({
      id: Date.now().toString(),
      value: ''
    });
    setFaults(newFaults);
  };

  // Remove FAT entry
  const removeFAT = (faultIndex: number, fatId: string) => {
    const newFaults = [...faults];
    newFaults[faultIndex].fats = newFaults[faultIndex].fats.filter(
      fat => fat.id !== fatId
    );
    setFaults(newFaults);
  };

  // Remove F/S/P entry
  const removeFSP = (faultIndex: number, fspId: string) => {
    const newFaults = [...faults];
    newFaults[faultIndex].fsps = newFaults[faultIndex].fsps.filter(
      fsp => fsp.id !== fspId
    );
    setFaults(newFaults);
  };

  // Remove fault
  const removeFault = (index: number) => {
    setFaults(faults.filter((_, i) => i !== index));
  };

  // Update fault field
  const updateFault = (index: number, field: keyof GPONFault, value: any) => {
    const newFaults = [...faults];
    newFaults[index] = { ...newFaults[index], [field]: value };
    setFaults(newFaults);
  };

  // Update FAT value
  const updateFAT = (faultIndex: number, fatId: string, value: string) => {
    const newFaults = [...faults];
    const fatIndex = newFaults[faultIndex].fats.findIndex(fat => fat.id === fatId);
    newFaults[faultIndex].fats[fatIndex].value = value;
    setFaults(newFaults);
  };

  // Update F/S/P value
  const updateFSP = (faultIndex: number, fspId: string, value: string) => {
    const newFaults = [...faults];
    const fspIndex = newFaults[faultIndex].fsps.findIndex(fsp => fsp.id === fspId);
    newFaults[faultIndex].fsps[fspIndex].value = value;
    setFaults(newFaults);
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError(null);
    
    // Disable the submit button to prevent multiple clicks
    if (submitButtonRef.current) {
      submitButtonRef.current.disabled = true;
    }

    try {
      // Prepare the GPON incident data
      const gponIncidentData: GPONIncidentData = {
        exchangeName,
        stakeholders,
        ticketGenerator,
        faults: faults.map(fault => ({
          fdh: fault.fdh,
          fats: fault.fats,
          oltIp: fault.oltIp,
          fsps: fault.fsps,
          isOutage: fault.isOutage,
          remarks: fault.remarks
        }))
      };

      // Create the GPON incidents using our service
      const incidentNumbers = await createGPONIncidents(gponIncidentData);

      // Format the message for display
      let formattedMessage = `***GPON Faults in ${exchangeName}***\n\n`;

      faults.forEach((fault, index) => {
        formattedMessage += `FAULT #${index + 1}\n`;
        formattedMessage += `Node: ${fault.oltIp}\n`;
        if (fault.remarks) {
          formattedMessage += `Remarks: ${fault.remarks}\n`;
        }
        formattedMessage += `Ticket #: ${incidentNumbers[index]}\n\n`;
      });

      formattedMessage += `Informed to: ${stakeholders.join(", ")}`;
      if (showTicketGeneratorInMessage) {
        formattedMessage += `\nTicket Generator: ${ticketGenerator}`;
      }

      setIncidentOutput(formattedMessage);
      alert('GPON Faults Created Successfully!');

      // Clear form
      setFaults([]);
      setStakeholders([]);
      setExchangeName('');
      setTicketGenerator('');
    } catch (error) {
      console.error('Error submitting the form:', error);
      setSubmissionError('There was an error submitting the form. Please try again.');
      alert('There was an error submitting the form.');
    } finally {
      setIsSubmitting(false);
      // Re-enable the submit button
      if (submitButtonRef.current) {
        submitButtonRef.current.disabled = false;
      }
    }
  };

  // WhatsApp API call
  const sendWhatsAppViaApi = (phoneNumber: string) => {
    const phone = phoneNumber || "923312524443";
    const message = encodeURIComponent(incidentOutput || "Test message");
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${message}`, "_blank");
  };

  const handleApplyTemplate = (template: any) => {
    if (template.exchangeName) {
      setExchangeName(template.exchangeName);
    }
    if (template.stakeholders) {
      setStakeholders(template.stakeholders);
    }
    // Update the fault fields from template
    const newFault: GPONFault = {
      fdh: template.fdh || '',
      fats: [{ id: Date.now().toString(), value: template.fat || '' }],
      oltIp: template.oltIp || '',
      fsps: [{ id: Date.now().toString(), value: template.fsp || '' }],
      isOutage: template.faultType === 'Outage',
      remarks: template.remarks || ''
    };
    setFaults([newFault]);
    setShowTemplates(false);
  };

  return (
    <>
      <NavBar />
      <div className="page-container" style={{ paddingTop: '32px' }}>
        <div className="card slide-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1>GPON Faults</h1>
              <div className="header-buttons" style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  <span className="icon">📋</span>
                  Templates
                </button>
                <Link href="/">
                  <button className="btn btn-primary">
                    <span className="icon">🏠</span>
                    Back to Home
                  </button>
                </Link>
              </div>
            </div>
            <Link href="/gpon-reports">
              <button className="btn btn-danger">
                <span className="icon">📊</span>
                View Reports
              </button>
            </Link>
          </div>
        </div>

        {showTemplates && (
          <TemplatesOverlay
            onClose={() => setShowTemplates(false)}
            onApplyTemplate={handleApplyTemplate}
          />
        )}

        <div className="card mt-20">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-20">
              <div className="form-group">
                <label className="form-label">Exchange Name</label>
                <select
                  className="form-select"
                  value={exchangeName}
                  onChange={(e) => setExchangeName(e.target.value)}
                  required
                >
                  <option value="">Select Exchange</option>
                  {exchanges.map((exchange) => (
                    <option key={exchange} value={exchange}>
                      {exchange}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ticket Generator</label>
                <div className="bg-[#fdf6e7] p-4 rounded-lg border border-[#e6d5b0]">
                  <h2 className="text-lg font-semibold mb-2">Ticket Generator</h2>
                  <select
                    className="form-select"
                    value={ticketGenerator}
                    onChange={(e) => setTicketGenerator(e.target.value)}
                    required
                  >
                    <option value="">Select Ticket Generator</option>
                    {switchAccessTicketGenerators.map((generator) => (
                      <option key={generator} value={generator}>
                        {generator}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={showTicketGeneratorInMessage}
                      onChange={(e) => setShowTicketGeneratorInMessage(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Show in message
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Stakeholders</label>
                <MultiSelectDropdown
                  options={[...availableStakeholders, 'Add Custom']}
                  selectedValues={stakeholders}
                  onChange={(selected) => {
                    if (selected.includes('Add Custom')) {
                      setShowCustomStakeholder(true);
                      setStakeholders(selected.filter(s => s !== 'Add Custom'));
                    } else {
                      setStakeholders(selected);
                    }
                  }}
                  label="Name of Called Person"
                  required={true}
                />
              </div>
            </div>

            {showCustomStakeholder && (
              <div className="custom-stakeholder-input mt-10">
                <input
                  type="text"
                  value={customStakeholder}
                  onChange={(e) => setCustomStakeholder(e.target.value)}
                  placeholder="Enter custom stakeholder name"
                  className="form-input"
                />
                <div className="flex gap-10 mt-10">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (customStakeholder.trim()) {
                        setStakeholders([...stakeholders, customStakeholder.trim()]);
                        setCustomStakeholder('');
                        setShowCustomStakeholder(false);
                      }
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCustomStakeholder(false);
                      setCustomStakeholder('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-20 mt-20">
              {faults.map((fault, faultIndex) => (
                <div key={faultIndex} className="card">
                  <div className="flex justify-between items-center mb-10">
                    <h2 className="text-xl font-bold">Fault #{faultIndex + 1}</h2>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeFault(faultIndex)}
                    >
                      Cancel Fault
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="form-group">
                      <label className="form-label">FDH</label>
                      <input
                        type="text"
                        className="form-input"
                        value={fault.fdh}
                        onChange={(e) => updateFault(faultIndex, 'fdh', e.target.value)}
                        placeholder="Enter FDH"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">FAT</label>
                      {fault.fats.map((fat) => (
                        <div key={fat.id} className="flex gap-10 mb-10">
                          <input
                            type="text"
                            className="form-input"
                            value={fat.value}
                            onChange={(e) => updateFAT(faultIndex, fat.id, e.target.value)}
                            placeholder="Enter FAT"
                          />
                          {fault.fats.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => removeFAT(faultIndex, fat.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => addFAT(faultIndex)}
                      >
                        Add FAT
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="form-label">OLT IP</label>
                      <input
                        type="text"
                        className="form-input"
                        value={fault.oltIp}
                        onChange={(e) => updateFault(faultIndex, 'oltIp', e.target.value)}
                        placeholder="Enter OLT IP"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">F/S/P</label>
                      {fault.fsps.map((fsp) => (
                        <div key={fsp.id} className="flex gap-10 mb-10">
                          <input
                            type="text"
                            className="form-input"
                            value={fsp.value}
                            onChange={(e) => updateFSP(faultIndex, fsp.id, e.target.value)}
                            placeholder="Enter F/S/P"
                          />
                          {fault.fsps.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => removeFSP(faultIndex, fsp.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => addFSP(faultIndex)}
                      >
                        Add F/S/P
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={fault.isOutage}
                          onChange={(e) => updateFault(faultIndex, 'isOutage', e.target.checked)}
                        />
                        Outage
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Remarks (Optional)</label>
                      <textarea
                        className="form-input"
                        value={fault.remarks}
                        onChange={(e) => updateFault(faultIndex, 'remarks', e.target.value)}
                        placeholder="Enter any additional remarks"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-20">
              <button
                type="button"
                className="btn btn-primary"
                onClick={addFault}
              >
               <span className="icon">➕</span>
               Add Fault
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={faults.length === 0 || isSubmitting}
                ref={submitButtonRef}
              >
                <span className="icon">📝</span>
                {isSubmitting ? 'Submitting...' : 'Submit Incidents'}
              </button>
            </div>

            {/* Display submission error if any */}
            {submissionError && (
              <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                {submissionError}
              </div>
            )}
          </form>
        </div>

        {incidentOutput && (
          <div className="incident-output-container">
            <div className="card">
              <h2 className="text-xl font-bold mb-4 text-center">Incident Output</h2>
              <pre className="incident-output">{incidentOutput}</pre>
              <div className="whatsapp-section">
                <button
                  className="btn btn-copy"
                  onClick={() => {
                    navigator.clipboard.writeText(incidentOutput);
                    alert('Copied to clipboard!');
                  }}
                >
                  <span>📋</span> Copy to Clipboard
                </button>
                <div className="number-input-group">
                  <select
                    className="form-select"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  >
                    <option value="">Select Contact</option>
                    {phoneContacts.map((contact) => (
                      <option key={contact.number} value={contact.number}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <button
                    className="btn btn-whatsapp"
                    onClick={() => sendWhatsAppViaApi(phoneNumber)}
                  >
                    <span>📱</span> Send to WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 