export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        letterSpacing: '0.05em'
      }}>
        Hello, this is Gowtham&apos;s portfolio.
      </h1>
      <p style={{
        fontSize: '1.25rem',
        opacity: 0.8
      }}>
        Not launched yet, come back later.
      </p>
    </div>
  );
}
