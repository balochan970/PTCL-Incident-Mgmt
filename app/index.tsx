/* New homepage component */
"use client";
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Incident Reporting Application</h1>
      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        <Link href="/single-fault"><button style={{ padding: '10px 20px' }}>Single Fault</button></Link>
        <Link href="/multiple-faults"><button style={{ padding: '10px 20px' }}>Multiple Faults</button></Link>
        <Link href="/reports"><button style={{ padding: '10px 20px' }}>Reports</button></Link>
      </div>
    </div>
  );
} 