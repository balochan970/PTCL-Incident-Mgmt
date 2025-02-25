"use client";
import '../styles/globals.css';
import { useState, ChangeEvent, FormEvent, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import TemplatesOverlay from '../components/TemplatesOverlay';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import NavBar from '../components/NavBar';
import { collection, addDoc, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { createIncident, IncidentData } from '../services/incidentService';

// Dynamic data for dropdowns
const exchanges = [
  "EPZA", "GADAP", "GULISTAN-e-JAUHAR", "GULSHAN-e-HADEED", "GULSHAN-e-MEHRAN",
  "KAP", "KATHORE", "LANDHI", "MALIR CANTT", "MEMON GOTH", "MMC", "PAK CAPITAL", "PORT QASIM", "SHAH LATIF"
];

const morningTeamMembers = [
  'A. Rehman Splicer',
  'A. Shahid Splicer',
  'Adnan AM',
  'Adnan Splicer',
  'Akhtar Labor',
  'Faizan Splicer',
  'Ghazi Team Lead',
  'Gulshan Splicer',
  'Hafeez Splicer',
  'Hassan Splicer',
  'Hasnain Splicer',
  'Junaid Splicer',
  'Kaleem Ansari Sb',
  'Kareem Splicer',
  'Owais Team Lead',
  'Rasheed Splicer',
  'S. Alam AM',
  'Safeer Splicer',
  'Sameer Splicer',
  'Usama Splicer',
  'Uzair Splicer',
  'Zain Splicer',
  'Zubair Splicer'
];

const nightTeamMembers = [...morningTeamMembers]; // Using the same list for both shifts

const switchAccessTicketGenerators = [
  'Absheer',
  'Aalay Ahmed',
  'Akhtar',
  'Ali Haider',
  'Asif',
  'Fahad',
  'Jaffar',
  'Kamran',
  'Muneer',
  'Syed Raza',
  'Syed Jaffar',
  'Saad',
  'Sania',
  'Shahzad',
  'Talib',
  'Taimoor'
];

const transportTicketGenerators = [...switchAccessTicketGenerators]; // Using the same list for both domains

// Add this constant at the top with other constants
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

interface Fault {
  equipmentType: string;
  faultType: string;
  nodes: {
    nodeA: string;
    nodeB: string;
    nodeC?: string;
    nodeD?: string;
    nodeE?: string;
    nodeF?: string;
    nodeG?: string;
    nodeH?: string;
  };
  outageNodes: {
    nodeA: boolean;
    nodeB: boolean;
    nodeC: boolean;
    nodeD: boolean;
    nodeE: boolean;
    nodeF: boolean;
    nodeG: boolean;
    nodeH: boolean;
  };
  remarks?: string;
}

export default function MultipleFaults() {
  const [domain, setDomain] = useState<string>('');
  const [ticketGenerator, setTicketGenerator] = useState<string>('');
  const [exchangeName, setExchangeName] = useState<string>('');
  const [stakeholderGroup, setStakeholderGroup] = useState<string>('');
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [showExtraNodes, setShowExtraNodes] = useState<boolean>(false);
  const [incidentOutput, setIncidentOutput] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [availableStakeholders, setAvailableStakeholders] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [customStakeholder, setCustomStakeholder] = useState('');
  const [showCustomStakeholder, setShowCustomStakeholder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // WhatsApp API call
  const sendWhatsAppViaApi = (phoneNumber: string) => {
    const phone = phoneNumber || "923312524443"; // Use default number if none provided
    const message = encodeURIComponent(incidentOutput || "Test message");

    // WhatsApp Web URL for messaging
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
    
    // Open WhatsApp Web in a new tab
    window.open(url, "_blank");
  };
  
  // Add fault (maximum 10 faults)
  const addFault = () => {
    if (faults.length < 10) {
      setFaults([
        ...faults,
        {
          equipmentType: '',
          faultType: '',
          nodes: { nodeA: '', nodeB: '' },
          outageNodes: {
            nodeA: false,
            nodeB: false,
            nodeC: false,
            nodeD: false,
            nodeE: false,
            nodeF: false,
            nodeG: false,
            nodeH: false
          },
          remarks: ''
        },
      ]);
      setShowExtraNodes(false);
    }
  };

  // Add cancel fault handler
  const cancelFault = (index: number) => {
    const newFaults = faults.filter((_, i) => i !== index);
    setFaults(newFaults);
  };

  // Handle fault change
  const handleFaultChange = (index: number, field: string, value: string) => {
    const newFaults = [...faults];
    (newFaults[index] as any)[field] = value;
    setFaults(newFaults);
  };

  // Handle node changes
  const handleFaultNodeChange = (index: number, nodeField: string, value: string) => {
    const newFaults = [...faults];
    newFaults[index].nodes = { ...newFaults[index].nodes, [nodeField]: value };
    setFaults(newFaults);
  };

  // Handle outage changes
  const handleOutageNodeChange = (index: number, nodeName: string, checked: boolean) => {
    const newFaults = [...faults];
    newFaults[index].outageNodes = { ...newFaults[index].outageNodes, [nodeName]: checked };
    setFaults(newFaults);
  };

  // Update domain change handler to set available stakeholders
  const handleDomainChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newDomain = e.target.value;
    setDomain(newDomain);
    // Reset stakeholders when domain changes
    setSelectedStakeholders([]);
    
    if (newDomain === 'Switch/Access') {
      setAvailableStakeholders(morningTeamMembers);
    } else if (newDomain === 'Transport/Transmission') {
      setAvailableStakeholders(nightTeamMembers);
    } else {
      setAvailableStakeholders([]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate that at least one fault is added
    if (faults.length === 0) {
      alert('Please add at least one fault');
      return;
    }

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
      // Create an array to store all incident numbers
      const incidentNumbers: string[] = [];

      // Submit each fault as a separate incident
      for (const fault of faults) {
        // Prepare the incident data
        const incidentData: IncidentData = {
          exchangeName,
          nodes: fault.nodes,
          stakeholders: selectedStakeholders,
          faultType: fault.faultType,
          equipmentType: fault.equipmentType,
          domain,
          ticketGenerator,
          isMultipleFault: true,
          outageNodes: fault.outageNodes,
          remarks: fault.remarks
        };

        // Create the incident using our service
        const nextIncidentNumber = await createIncident(incidentData);
        incidentNumbers.push(nextIncidentNumber);
      }

      // Create formatted message with all incident numbers
      let formattedMessage = "***Multiple Faults Incident***\n\n";
      faults.forEach((fault, index) => {
        formattedMessage += `FAULT #${index + 1} ${fault.equipmentType} ${fault.faultType}: `;
        
        // Add nodes with outage status
        const nodes = [];
        if (fault.nodes.nodeA) nodes.push(`${fault.nodes.nodeA}${fault.outageNodes.nodeA ? ' (outage)' : ''}`);
        if (fault.nodes.nodeB) nodes.push(`${fault.nodes.nodeB}${fault.outageNodes.nodeB ? ' (outage)' : ''}`);
        if (fault.nodes.nodeC) nodes.push(`${fault.nodes.nodeC}${fault.outageNodes.nodeC ? ' (outage)' : ''}`);
        if (fault.nodes.nodeD) nodes.push(`${fault.nodes.nodeD}${fault.outageNodes.nodeD ? ' (outage)' : ''}`);
        if (fault.nodes.nodeE) nodes.push(`${fault.nodes.nodeE}${fault.outageNodes.nodeE ? ' (outage)' : ''}`);
        if (fault.nodes.nodeF) nodes.push(`${fault.nodes.nodeF}${fault.outageNodes.nodeF ? ' (outage)' : ''}`);
        if (fault.nodes.nodeG) nodes.push(`${fault.nodes.nodeG}${fault.outageNodes.nodeG ? ' (outage)' : ''}`);
        if (fault.nodes.nodeH) nodes.push(`${fault.nodes.nodeH}${fault.outageNodes.nodeH ? ' (outage)' : ''}`);
        
        formattedMessage += nodes.join(' ------/------ ');
        formattedMessage += `\nTicket # ${incidentNumbers[index]}\n\n`;
      });

      formattedMessage += `Informed to ${selectedStakeholders.join(", ")}\nTicket Generator: ${ticketGenerator}`;

      setIncidentOutput(formattedMessage);
      alert('Multiple Faults Incidents Created Successfully!');

      // Clear form
      setFaults([]);
      setShowExtraNodes(false);
      
    } catch (error) {
      console.error('Error:', error);
      setSubmissionError('Error submitting the form. Please try again.');
      alert('Error submitting the form');
    } finally {
      setIsSubmitting(false);
      // Re-enable the submit button
      if (submitButtonRef.current) {
        submitButtonRef.current.disabled = false;
      }
    }
  };

  // Add this function to handle applying templates
  const handleApplyTemplate = (template: any) => {
    if (template.domain) {
      setDomain(template.domain);
      // Update available stakeholders based on domain
      if (template.domain === 'Switch/Access') {
        setAvailableStakeholders(morningTeamMembers);
      } else if (template.domain === 'Transport/Transmission') {
        setAvailableStakeholders(nightTeamMembers);
      }
    }
    if (template.exchangeName) setExchangeName(template.exchangeName);
    if (template.nodes || template.faultType || template.equipmentType) {
      // Add a new fault with the template data
      const newFault = {
        equipmentType: template.equipmentType || '',
        faultType: template.faultType || '',
        nodes: {
          nodeA: template.nodes?.nodeA || '',
          nodeB: template.nodes?.nodeB || '',
          nodeC: template.nodes?.nodeC || '',
          nodeD: template.nodes?.nodeD || '',
          nodeE: template.nodes?.nodeE || '',
          nodeF: template.nodes?.nodeF || '',
          nodeG: template.nodes?.nodeG || '',
          nodeH: template.nodes?.nodeH || ''
        },
        outageNodes: {
          nodeA: false,
          nodeB: false,
          nodeC: false,
          nodeD: false,
          nodeE: false,
          nodeF: false,
          nodeG: false,
          nodeH: false
        },
        remarks: template.remarks || ''
      };
      setFaults([...faults, newFault]);
      // Show extra nodes if template has node C or D
      setShowExtraNodes(true);
    }
    if (template.stakeholders) {
      setSelectedStakeholders(template.stakeholders);
    }
    setShowTemplates(false);
  };

  return (
    <>
      <NavBar />
      <div className="container fade-in" style={{ paddingTop: '32px' }}>
        <div className="header card">
          <div className="title-section">
            <h1>Multiple Faults Report</h1>
            <div className="header-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTemplates(true)}
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
          <div className="actions">
            <Link href="/reports">
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

        <div className="form-container card slide-in">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-4">
              <div className="form-group">
                <label className="form-label">Domain</label>
                <select
                  value={domain}
                  onChange={handleDomainChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Domain</option>
                  <option value="Switch/Access">Switch/Access</option>
                  <option value="Transport/Transmission">Transport/Transmission</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Exchange Name</label>
                <select
                  value={exchangeName}
                  onChange={(e) => setExchangeName(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select Exchange</option>
                  {exchanges.map((exchange) => (
                    <option key={exchange} value={exchange}>{exchange}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ticket Generator</label>
                <select
                  value={ticketGenerator}
                  onChange={(e) => setTicketGenerator(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select Ticket Generator</option>
                  {domain === 'Switch/Access' && switchAccessTicketGenerators.map((person) => (
                    <option key={person} value={person}>{person}</option>
                  ))}
                  {domain === 'Transport/Transmission' && transportTicketGenerators.map((person) => (
                    <option key={person} value={person}>{person}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Stakeholders</label>
                <MultiSelectDropdown
                  options={[...availableStakeholders, 'Add Custom']}
                  selectedValues={selectedStakeholders}
                  onChange={(selected) => {
                    if (selected.includes('Add Custom')) {
                      setShowCustomStakeholder(true);
                      setSelectedStakeholders(selected.filter(s => s !== 'Add Custom'));
                    } else {
                      setSelectedStakeholders(selected);
                    }
                  }}
                  label="Name of Called Person"
                />
              </div>

              {showCustomStakeholder && (
                <div className="custom-stakeholder-input">
                  <input
                    type="text"
                    value={customStakeholder}
                    onChange={(e) => setCustomStakeholder(e.target.value)}
                    placeholder="Enter custom stakeholder name"
                    className="form-input"
                  />
                  <div className="custom-stakeholder-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (customStakeholder.trim()) {
                          setSelectedStakeholders([...selectedStakeholders, customStakeholder.trim()]);
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
            </div>

            <div className="faults-grid">
              {faults.map((fault, index) => (
                <div key={index} className="card fault-card">
                  <div className="card-header">
                    <h3>Fault #{index + 1}</h3>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => cancelFault(index)}
                    >
                      <span className="icon">❌</span>
                      Cancel Fault
                    </button>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Equipment Type</label>
                      <select
                        value={fault.equipmentType}
                        onChange={(e) => handleFaultChange(index, "equipmentType", e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Select Equipment Type</option>
                        {domain === 'Switch/Access' ? (
                          <>
                            <option value="UA5000 IPMD">UA5000 IPMD</option>
                            <option value="UA5000 PVMD">UA5000 PVMD</option>
                            <option value="HYBRID ma5600t">HYBRID ma5600t</option>
                            <option value="GPON ma5800">GPON ma5800</option>
                            <option value="MINI MSAG ma5616">MINI MSAG ma5616</option>
                            <option value="MINI OLT ma5608">MINI OLT ma5608</option>
                          </>
                        ) : (
                          <>
                            <option value="OFAN-3">OFAN-3</option>
                            <option value="DWDM">DWDM</option>
                            <option value="NOKIA">NOKIA</option>
                            <option value="OTN">NOKIA</option>
                            <option value="PTN">PTN</option>
                            <option value="UFONE BTS">UFONE BTS</option>
                            <option value="ACCESS">ACCESS</option>
                            <option value="ACCESS-PTN">ACCESS-PTN</option>
                            <option value="SPUR">SPUR</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Fault Type</label>
                      <select
                        value={fault.faultType}
                        onChange={(e) => handleFaultChange(index, "faultType", e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Select Fault Type</option>
                        <option value="Fiber Break">Fiber Break</option>
                        <option value="Low Power">Low Power</option>
                        <option value="Outage">Outage</option>
                        <option value="Corporate Fault">Corporate Fault</option>
                        <option value="MMBB Fault">MMBB Fault</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Node A</label>
                      <div className="input-with-checkbox">
                        <input
                          type="text"
                          value={fault.nodes.nodeA}
                          onChange={(e) => handleFaultNodeChange(index, "nodeA", e.target.value)}
                          className="form-input"
                          required
                          placeholder="Node A"
                        />
                        {fault.faultType === 'Outage' && (
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={fault.outageNodes.nodeA}
                              onChange={(e) => handleOutageNodeChange(index, "nodeA", e.target.checked)}
                            />
                            Outage
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Node B</label>
                      <div className="input-with-checkbox">
                        <input
                          type="text"
                          value={fault.nodes.nodeB}
                          onChange={(e) => handleFaultNodeChange(index, "nodeB", e.target.value)}
                          className="form-input"
                          required
                          placeholder="Node B"
                        />
                        {fault.faultType === 'Outage' && (
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={fault.outageNodes.nodeB}
                              onChange={(e) => handleOutageNodeChange(index, "nodeB", e.target.checked)}
                            />
                            Outage
                          </label>
                        )}
                      </div>
                    </div>

                    {showExtraNodes && (
                      <>
                        {['C', 'D', 'E', 'F', 'G', 'H'].map((nodeLetter) => (
                          <div key={nodeLetter} className="form-group">
                            <label className="form-label">Node {nodeLetter}</label>
                            <div className="input-with-checkbox">
                              <input
                                type="text"
                                value={fault.nodes[`node${nodeLetter}` as keyof typeof fault.nodes] || ''}
                                onChange={(e) => handleFaultNodeChange(index, `node${nodeLetter}`, e.target.value)}
                                className="form-input"
                              />
                              {fault.faultType === 'Outage' && (
                                <label className="checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={fault.outageNodes[`node${nodeLetter}` as keyof typeof fault.outageNodes]}
                                    onChange={(e) => handleOutageNodeChange(index, `node${nodeLetter}`, e.target.checked)}
                                  />
                                  Outage
                                </label>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {fault.faultType === 'Outage' && (
                    <div className="form-group">
                      <label className="form-label">Remarks (Optional)</label>
                      <textarea
                        value={fault.remarks || ''}
                        onChange={(e) => handleFaultChange(index, 'remarks', e.target.value)}
                        className="form-input"
                        placeholder="Enter any additional remarks"
                        rows={3}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary mt-10"
                    onClick={() => setShowExtraNodes(!showExtraNodes)}
                  >
                    {showExtraNodes ? 'Hide Extra Nodes' : 'Add Extra Nodes'}
                  </button>
                </div>
              ))}
            </div>

            {/* Display submission error if any */}
            {submissionError && (
              <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                {submissionError}
              </div>
            )}

            <div className="actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addFault}
              >
                <span className="icon">➕</span>
                Add Fault
              </button>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting || faults.length === 0}
                ref={submitButtonRef}
              >
                <span className="icon">📝</span>
                {isSubmitting ? 'Submitting...' : 'Submit Incidents'}
              </button>
            </div>
          </form>
        </div>

        {incidentOutput && (
          <div className="incident-output-container">
            <div className="card">
              <h2 className="text-xl font-bold mb-4 text-center">Incident Output</h2>
              <pre className="incident-output">{incidentOutput}</pre>
              
              <div className="actions-container">
                <button
                  onClick={() => navigator.clipboard.writeText(incidentOutput)}
                  className="btn btn-copy"
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
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="form-input"
                  />
                  <button
                    onClick={() => sendWhatsAppViaApi(phoneNumber)}
                    className="btn btn-whatsapp"
                  >
                    <span>📱</span> Send to WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .container {
            padding: var(--spacing-lg);
          }

          .header {
            margin-bottom: var(--spacing-lg);
          }

          .title-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .header-buttons {
            display: flex;
            gap: var(--spacing-md);
          }

          .faults-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-lg);
            margin: var(--spacing-lg) 0;
          }

          .fault-card {
            animation: slideIn var(--transition-normal);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-md);
            padding-bottom: var(--spacing-sm);
            border-bottom: 1px solid var(--border-color);
          }

          .input-with-checkbox {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            color: var(--text-secondary);
          }

          .incident-output {
            background: rgba(50, 35, 43, 0.4);
            padding: var(--spacing-md);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            margin: var(--spacing-md) 0;
            color: var(--text-primary);
            font-family: monospace;
            white-space: pre-wrap;
          }

          .number-input-group {
            display: flex;
            gap: var(--spacing-md);
          }

          .icon {
            font-size: 1.2em;
          }

          .actions-row {
            display: flex;
            justify-content: center;
            gap: var(--spacing-md);
            margin-top: var(--spacing-lg);
          }

          @media (max-width: 1200px) {
            .faults-grid {
              grid-template-columns: 1fr;
            }

            .number-input-group {
              flex-direction: column;
            }

            .actions-row {
              flex-direction: column;
              align-items: stretch;
            }
          }

          .incident-output-container {
            background-color: #FFF8E8;
            border: 2px solid #AAB396;
            border-radius: 8px;
            padding: 20px;
            margin: 20px auto;
            max-width: 800px;
            width: 100%;
          }

          .card {
            background-color: #FFF8E8;
            padding: 1.5rem;
            border-radius: 8px;
          }

          .incident-output {
            background-color: rgba(50, 35, 43, .4);
            color: #000000;
            border-radius: 4px;
            padding: 20px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
            width: 100%;
            margin: 0 auto;
          }

          .actions-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin-top: 1rem;
          }

          .number-input-group {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            flex: 1;
          }

          .form-select, .form-input {
            padding: 8px 12px;
            border: 1px solid #AAB396;
            border-radius: 4px;
            background-color: #FFF8E8;
            flex: 1;
            min-width: 150px;
          }

          .btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
          }

          .btn-copy {
            background-color: #007bff;
            color: white;
          }

          .btn-whatsapp {
            background-color: #25D366;
            color: white;
          }

          .btn:hover {
            opacity: 0.9;
          }

          @media (max-width: 768px) {
            .actions-container {
              flex-direction: column;
            }

            .number-input-group {
              flex-direction: column;
              width: 100%;
            }

            .form-select, .form-input {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </>
  );
} 