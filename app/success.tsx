"use client";

export default function Success() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Incident Successfully Created!</h1>
      <p>Your incident has been recorded and saved to the database.</p>
      <a href="/" style={{ color: '#8CB9BD', textDecoration: 'underline' }}>Go back to form</a>
    </div>
  );
}
