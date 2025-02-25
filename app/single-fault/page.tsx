// app/page.tsx

"use client";
import '../styles/globals.css';
import Link from 'next/link';
import React, { useState, ChangeEvent, FormEvent, useRef } from 'react';

import * as XLSX from 'xlsx';
import { doc, updateDoc, getDoc, Firestore, collection, addDoc, runTransaction } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebaseConfig';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import TemplatesOverlay from '../components/TemplatesOverlay';
import NavBar from '../components/NavBar';
import { createIncident, IncidentData } from '../services/incidentService';

const auth = getAuth();

interface Nodes {
  nodeA: string;
  nodeB: string;
  nodeC?: string;
  nodeD?: string;
  nodeE?: string;
  nodeF?: string;
  nodeG?: string;
  nodeH?: string;
}

// Update the constants at the top
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
  'Ahmed',
  'Akhtar',
  'Ali',
  'Asif',
  'Fahad',
  'Jaffar',
  'Kamran',
  'Muneer',
  'Raza',
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

export default function SingleFaultPage() {
  const [nodes, setNodes] = useState<Nodes>({ nodeA: '', nodeB: '' });
  const [exchangeName, setExchangeName] = useState<string>('');
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [availableStakeholders, setAvailableStakeholders] = useState<string[]>([]);
  const [ticketGenerator, setTicketGenerator] = useState<string>('');
  const [faultType, setFaultType] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [outageNodes, setOutageNodes] = useState({
    nodeA: false,
    nodeB: false,
    nodeC: false,
    nodeD: false,
    nodeE: false,
    nodeF: false,
    nodeG: false,
    nodeH: false,
  });
  const [incidentOutput, setIncidentOutput] = useState<string | null>(null);
  const [showExtraNodes, setShowExtraNodes] = useState(false);
  const [domain, setDomain] = useState<string>('');
  const [equipmentType, setEquipmentType] = useState<string>('');
  const [currentIncidentId, setCurrentIncidentId] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [remarks, setRemarks] = useState<string>('');
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

  // Stakeholder Handlers
  const handleAddStakeholder = () => {
    if (stakeholders.length < 10) {
      setStakeholders([...stakeholders, '']);
    }
  };

  const handleRemoveStakeholder = (index: number) => {
    const updatedStakeholders = stakeholders.filter((_, i) => i !== index);
    setStakeholders(updatedStakeholders);
  };

  const handleStakeholderChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const updatedStakeholders = [...stakeholders];
    updatedStakeholders[index] = e.target.value;
    setStakeholders(updatedStakeholders);
  };

  // Node Handlers
  const handleNodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNodes({ ...nodes, [e.target.name]: e.target.value });
  };

  const handleOutageNodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setOutageNodes({ ...outageNodes, [name]: checked });
  };

  // Add this function after the state declarations
  const handleDomainChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newDomain = e.target.value;
    setDomain(newDomain);
    // Reset stakeholders when domain changes
    setStakeholders([]);
    
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
      // Prepare the incident data
      const incidentData: IncidentData = {
        exchangeName,
        nodes,
        stakeholders,
        faultType,
        equipmentType,
        domain,
        ticketGenerator,
        isMultipleFault: false,
        outageNodes: outageNodes || {
          nodeA: false,
          nodeB: false,
          nodeC: false,
          nodeD: false,
          nodeE: false,
          nodeF: false,
          nodeG: false,
          nodeH: false
        },
        remarks
      };

      // Create the incident using our service
      const nextIncidentNumber = await createIncident(incidentData);

      // Format the message for display
      let formattedMessage = `***${equipmentType} ${faultType} in ${exchangeName}***\n\n`;
  
      // Add nodes with outage status
      const nodesList = [];
      if (nodes.nodeA) nodesList.push(`${nodes.nodeA}${outageNodes.nodeA ? ' (outage)' : ''}`);
      if (nodes.nodeB) nodesList.push(`${nodes.nodeB}${outageNodes.nodeB ? ' (outage)' : ''}`);
      if (nodes.nodeC) nodesList.push(`${nodes.nodeC}${outageNodes.nodeC ? ' (outage)' : ''}`);
      if (nodes.nodeD) nodesList.push(`${nodes.nodeD}${outageNodes.nodeD ? ' (outage)' : ''}`);
      if (nodes.nodeE) nodesList.push(`${nodes.nodeE}${outageNodes.nodeE ? ' (outage)' : ''}`);
      if (nodes.nodeF) nodesList.push(`${nodes.nodeF}${outageNodes.nodeF ? ' (outage)' : ''}`);
      if (nodes.nodeG) nodesList.push(`${nodes.nodeG}${outageNodes.nodeG ? ' (outage)' : ''}`);
      if (nodes.nodeH) nodesList.push(`${nodes.nodeH}${outageNodes.nodeH ? ' (outage)' : ''}`);
      
      formattedMessage += nodesList.join(' ------/------ ');
      
      // Add remarks if present
      if (remarks && faultType === 'Outage') {
        formattedMessage += `\n(${remarks})`;
      }
      
      formattedMessage += `\n\nInformed to ${stakeholders.join(", ")}\nTicket Generator: ${ticketGenerator}\n\nTicket # ${nextIncidentNumber}`;

      // Update the incident output state
      setIncidentOutput(formattedMessage);

      // Display "Incident Created" message
      alert('Incident Created Successfully!');
      
      // Clear form fields
      setExchangeName('');
      setNodes({ nodeA: '', nodeB: '', nodeC: '', nodeD: '', nodeE: '', nodeF: '', nodeG: '', nodeH: '' });
      setStakeholders([]);
      setFaultType('');
      setOutageNodes({ nodeA: false, nodeB: false, nodeC: false, nodeD: false, nodeE: false, nodeF: false, nodeG: false, nodeH: false });
      setShowExtraNodes(false);
      setDomain('');
      setEquipmentType('');
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
    if (template.equipmentType) setEquipmentType(template.equipmentType);
    if (template.exchangeName) setExchangeName(template.exchangeName);
    if (template.faultType) setFaultType(template.faultType);
    if (template.nodes) {
      setNodes({
        nodeA: template.nodes.nodeA || '',
        nodeB: template.nodes.nodeB || '',
        nodeC: template.nodes.nodeC || '',
        nodeD: template.nodes.nodeD || '',
        nodeE: template.nodes.nodeE || '',
        nodeF: template.nodes.nodeF || '',
        nodeG: template.nodes.nodeG || '',
        nodeH: template.nodes.nodeH || ''
      });
      // Show extra nodes if template has node C or D
      setShowExtraNodes(!!(template.nodes.nodeC || template.nodes.nodeD || template.nodes.nodeE || template.nodes.nodeF || template.nodes.nodeG || template.nodes.nodeH));
    }
    if (template.stakeholders) {
      setStakeholders(template.stakeholders);
    }
    setShowTemplates(false);
  };

  // Add this function to handle adding custom stakeholder
  const handleAddCustomStakeholder = () => {
    if (customStakeholder.trim()) {
      setStakeholders([...stakeholders, customStakeholder.trim()]);
      setCustomStakeholder('');
    }
  };

  return (
    <>
      <NavBar />
      <div className="container fade-in" style={{ paddingTop: '32px' }}>
        <div className="header card">
          <div className="title-section">
            <h1>Single Fault Report</h1>
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
                <label className="form-label">Equipment Type</label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select Equipment Type</option>
                  {domain === 'Switch/Access' && (
                    <>
                      <option value="UA5000 IPMD">UA5000 IPMD</option>
                      <option value="UA5000 PVMD">UA5000 PVMD</option>
                      <option value="HYBRID ma5600t">HYBRID ma5600t</option>
                      <option value="GPON ma5800">GPON ma5800</option>
                      <option value="MINI MSAG ma5616/ma52aa">MINI MSAG ma5616/ma52aa</option>
                      <option value="MINI OLT ma5608">MINI OLT ma5608</option>
                    </>
                  )}
                  {domain === 'Transport/Transmission' && (
                    <>
                      <option value="OFAN-3">OFAN-3</option>
                      <option value="DWDM">DWDM</option>
                      <option value="NOKIA">NOKIA</option>
                      <option value="OTN">OTN</option>
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
                <label className="form-label">Exchange Name</label>
                <select
                  value={exchangeName}
                  onChange={(e) => setExchangeName(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select Exchange</option>
                  <option value="EPZA">EPZA</option>
                  <option value="GADAP">GADAP</option>
                  <option value="GULISTAN-e-JAUHAR">GULISTAN-e-JAUHAR</option>
                  <option value="GULSHAN-e-HADEED">GULSHAN-e-HADEED</option>
                  <option value="GULSHAN-e-MEHRAN">GULSHAN-e-MEHRAN</option>
                  <option value="KAP">KAP</option>
                  <option value="KATHORE">KATHORE</option>
                  <option value="LANDHI">LANDHI</option>
                  <option value="MALIR CANTT">MALIR CANTT</option>
                  <option value="MEMON GOTH">MEMON GOTH</option>
                  <option value="MMC">MMC</option>
                  <option value="PAK CAPITAL">PAK CAPITAL</option>
                  <option value="PORT QASIM">PORT QASIM</option>
                  <option value="SHAH LATIF">SHAH LATIF</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fault Type</label>
                <select
                  value={faultType}
                  onChange={(e) => setFaultType(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select Fault Type</option>
                  <option value="Fiber Break">Fiber Break</option>
                  <option value="Low Power">Low Power</option>
                  <option value="Outage">Outage</option>
                  <option value="Power Outage">Power Outage</option>
                  <option value="Corporate Fault">Corporate Fault</option>
                  <option value="MMBB Fault">MMBB Fault</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3">
              <div className="card node-section">
                <h3>Node Information</h3>
                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Node A</label>
                    <div className="input-with-checkbox">
                      <input
                        type="text"
                        name="nodeA"
                        value={nodes.nodeA}
                        onChange={handleNodeChange}
                        className="form-input"
                        required
                      />
                      {faultType === 'Outage' && (
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            name="nodeA"
                            checked={outageNodes.nodeA}
                            onChange={handleOutageNodeChange}
                          />
                          Outage
                        </label>
                      )}
                    </div>
                  </div>

                  {faultType !== 'Power Outage' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Node B</label>
                        <div className="input-with-checkbox">
                          <input
                            type="text"
                            name="nodeB"
                            value={nodes.nodeB}
                            onChange={handleNodeChange}
                            className="form-input"
                            required
                          />
                          {faultType === 'Outage' && (
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                name="nodeB"
                                checked={outageNodes.nodeB}
                                onChange={handleOutageNodeChange}
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
                                  name={`node${nodeLetter}`}
                                  value={nodes[`node${nodeLetter}` as keyof Nodes] || ''}
                                  onChange={handleNodeChange}
                                  className="form-input"
                                />
                                {faultType === 'Outage' && (
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      name={`node${nodeLetter}`}
                                      checked={outageNodes[`node${nodeLetter}` as keyof typeof outageNodes]}
                                      onChange={handleOutageNodeChange}
                                    />
                                    Outage
                                  </label>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>

                {faultType !== 'Power Outage' && (
                  <button
                    type="button"
                    className="btn btn-secondary mt-10"
                    onClick={() => setShowExtraNodes(!showExtraNodes)}
                  >
                    {showExtraNodes ? 'Hide Extra Nodes' : 'Add Extra Nodes'}
                  </button>
                )}

                {faultType === 'Outage' && (
                  <div className="form-group col-span-2">
                    <label className="form-label">Remarks (Optional)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="form-input"
                      placeholder="Enter any additional remarks"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="card stakeholder-section">
                <h3>Stakeholders</h3>
                <div className="stakeholders-container">
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
                  />

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
                          onClick={handleAddCustomStakeholder}
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
              </div>

              <div className="card ticket-section">
                <h3>Ticket Generator</h3>
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
            </div>

            {/* Display submission error if any */}
            {submissionError && (
              <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                {submissionError}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
                ref={submitButtonRef}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Incident'}
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

          .cards-grid {
            display: grid;
            grid-template-columns: 2fr 2fr 1fr;
            gap: var(--spacing-lg);
            margin: var(--spacing-lg) 0;
          }

          .node-section .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-md);
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