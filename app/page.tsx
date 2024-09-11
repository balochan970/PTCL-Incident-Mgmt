// app/page.tsx

"use client";

import { useState, ChangeEvent, FormEvent } from 'react';

interface Nodes {
  nodeA: string;
  nodeB: string;
  nodeC?: string;
  nodeD?: string;
}

export default function Home() {
  const [nodes, setNodes] = useState<Nodes>({ nodeA: '', nodeB: '' });
  const [exchangeName, setExchangeName] = useState<string>('');
  const [stakeholders, setStakeholders] = useState<string[]>(['']);
  const [faultType, setFaultType] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // State for Phone Number
  const [outageNodes, setOutageNodes] = useState({
    nodeA: false,
    nodeB: false,
    nodeC: false,
    nodeD: false,
  });
  const [incidentOutput, setIncidentOutput] = useState<string | null>(null);
  const [showExtraNodes, setShowExtraNodes] = useState(false); // Hide Node C and D initially
  const [domain, setDomain] = useState<string>(''); // State for Domain
  const [equipmentType, setEquipmentType] = useState<string>(''); // State for Equipment Type

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Prevent the form from reloading
  
    // Prepare the data for incident creation
    const data = {
      exchangeName,
      nodes,
      stakeholders,
      faultType,
    };
  
    try {
      const response = await fetch('/api/create-incident', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      const result = await response.json();
  
      if (response.ok) {
        // Incident successfully created
        let formattedMessage = `***${equipmentType} ${faultType} in ${exchangeName}***\n\n`;
  
        const nodeAOutage = outageNodes.nodeA && faultType === 'Outage' ? '(OUTAGE)' : '';
        const nodeBOutage = outageNodes.nodeB && faultType === 'Outage' ? '(OUTAGE)' : '';
        const nodeCOutage = outageNodes.nodeC && faultType === 'Outage' ? '(OUTAGE)' : '';

        if (nodes.nodeA && nodes.nodeB) {
          formattedMessage += `${nodes.nodeA} ------/------ ${nodes.nodeB} ${nodeBOutage}`;
        }
        if (nodes.nodeA && nodes.nodeB && nodes.nodeC) {
          formattedMessage += ` ------/------ ${nodes.nodeC} ${nodeCOutage}`;
        }

        formattedMessage += `\n\nInformed to ${stakeholders.join(", ")}\n\nTicket # ${result.incidentNumber}`;

        // Update the incident output state
        setIncidentOutput(formattedMessage);

        // Display "Incident Created" message
        alert('Incident Created Successfully!');
        
        // Clear form fields
        setExchangeName('');
        setNodes({ nodeA: '', nodeB: '', nodeC: '', nodeD: '' });
        setStakeholders(['']);
        setFaultType('');
        setOutageNodes({ nodeA: false, nodeB: false, nodeC: false, nodeD: false });
        setShowExtraNodes(false);
      } else {
        console.error('Error:', result.message);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting the form:', error);
      alert('There was an error submitting the form.');
    }
  };

  return (
    <div>
      <h1>Incident Reporting</h1>
      <form onSubmit={handleSubmit}>
        {/* Domain Dropdown */}
        <label className="form-label">Domain</label>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="form-dropdown"
          required
        >
          <option value="">Select Domain</option>
          <option value="Switch/Access">Switch/Access</option>
          <option value="Transport/Transmission">Transport/Transmission</option>
        </select>

        {/* Equipment Type Dropdown */}
        <label className="form-label">Equipment Type</label>
        <select
          value={equipmentType}
          onChange={(e) => setEquipmentType(e.target.value)}
          className="form-dropdown"
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
              <option value="PTN">PTN</option>
              <option value="UFONE BTS">UFONE BTS</option>
              <option value="ACCESS">ACCESS</option>
              <option value="ACCESS-PTN">ACCESS-PTN</option>
              <option value="SPUR">SPUR</option>
            </>
          )}
        </select>

        {/* Exchange Name */}
        <label>Exchange Name</label>
        <input
          type="text"
          value={exchangeName}
          onChange={(e) => setExchangeName(e.target.value)}
          required
        />

        {/* Fault Type */}
        <label>Fault Type</label>
        <select
          value={faultType}
          onChange={(e) => setFaultType(e.target.value)}
          required
        >
          <option value="">Select Fault Type</option>
          <option value="Fiber Break">Fiber Break</option>
          <option value="Outage">Outage</option>
          <option value="Corporate Fault">Corporate Fault</option>
          <option value="MMBB Fault">MMBB Fault</option>
        </select>

        {/* Node A and Node B */}
        <div className="node-row">
          <div>
            <label>Node A</label>
            <input
              type="text"
              name="nodeA"
              value={nodes.nodeA}
              onChange={handleNodeChange}
              required
            />
            {faultType === 'Outage' && (
              <label>
                <input
                  type="checkbox"
                  name="nodeA"
                  checked={outageNodes.nodeA}
                  onChange={handleOutageNodeChange}
                />
                Mark as Outage
              </label>
            )}
          </div>
          <div>
            <label>Node B</label>
            <input
              type="text"
              name="nodeB"
              value={nodes.nodeB}
              onChange={handleNodeChange}
              required
            />
            {faultType === 'Outage' && (
              <label>
                <input
                  type="checkbox"
                  name="nodeB"
                  checked={outageNodes.nodeB}
                  onChange={handleOutageNodeChange}
                />
                Mark as Outage
              </label>
            )}
          </div>
        </div>

        {/* Add Nodes (C and D) */}
        {showExtraNodes ? (
          <>
            <div className="node-row">
              <div>
                <label>Node C (Optional)</label>
                <input
                  type="text"
                  name="nodeC"
                  value={nodes.nodeC}
                  onChange={handleNodeChange}
                />
                {faultType === 'Outage' && (
                  <label>
                    <input
                      type="checkbox"
                      name="nodeC"
                      checked={outageNodes.nodeC}
                      onChange={handleOutageNodeChange}
                    />
                    Mark as Outage
                  </label>
                )}
              </div>
              <div>
                <label>Node D (Optional)</label>
                <input
                  type="text"
                  name="nodeD"
                  value={nodes.nodeD}
                  onChange={handleNodeChange}
                />
                {faultType === 'Outage' && (
                  <label>
                    <input
                      type="checkbox"
                      name="nodeD"
                      checked={outageNodes.nodeD}
                      onChange={handleOutageNodeChange}
                    />
                    Mark as Outage
                  </label>
                )}
              </div>
            </div>

            {/* Cancel Nodes button */}
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowExtraNodes(false)}
            >
              Cancel Nodes
            </button>
          </>
        ) : (
          <button
            type="button"
            className="add-more-btn"
            onClick={() => setShowExtraNodes(true)}
          >
            Add Nodes
          </button>
        )}

        {/* Stakeholders */}
        <label>Stakeholders</label>
        {stakeholders.map((stakeholder, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={stakeholder}
              onChange={(e) => handleStakeholderChange(index, e)}
              required={index === 0} // First stakeholder is required
            />
            {index > 0 && (
              <button
                type="button"
                className="cancel-btn"
                onClick={() => handleRemoveStakeholder(index)}
              >
                Cancel
              </button>
            )}
          </div>
        ))}
        {stakeholders.length < 10 && (
          <button
            type="button"
            className="add-more-btn"
            onClick={handleAddStakeholder}
          >
            Add more
          </button>
        )}

        <button type="submit">Submit Incident</button>
      </form>

      {/* Display the incident output after form submission */}
      {incidentOutput && (
        <div className="incident-output">
          <h2>Incident Output</h2>
          <pre>{incidentOutput}</pre>
          
          {/* Copy to Clipboard Button */}
          <button
            onClick={() => navigator.clipboard.writeText(incidentOutput)}
            className="copy-to-clipboard"
          >
            Copy to Clipboard
          </button>

          {/* WhatsApp Options (Phone Number and Send Button) */}
          <div className="whatsapp-section">
            <label>Phone Number (International Format)</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="923312524443" // Without "+" symbol
            />

            <button
              onClick={() => sendWhatsAppViaApi(phoneNumber)}
              className="send-whatsapp-btn"
            >
              Send to WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
