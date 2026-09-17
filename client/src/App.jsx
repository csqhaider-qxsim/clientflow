import { useState, useEffect } from 'react';

const API_BASE = 'https://clientflow-api-x0v4.onrender.com';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  
  // FIXED: Default to 'landing' if no token exists
  const [view, setView] = useState(token ? (user?.role === 'admin' ? 'admin' : 'dashboard') : 'landing');
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [selectedClient, setSelectedClient] = useState('');

  const [adminUsers, setAdminUsers] = useState([]);
  const [resetPasswords, setResetPasswords] = useState({});
  const [adminMsg, setAdminMsg] = useState('');

  useEffect(() => {
    if (token) {
      if (user?.role === 'admin' && view === 'admin') {
        fetchAdminUsers();
      } else if (view === 'dashboard') {
        fetchClients();
        fetchInvoices();
      }
    }
  }, [token, view]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    // FIXED: Added /api/ prefix
    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setView(data.user.role === 'admin' ? 'admin' : 'dashboard');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setClients([]);
    setInvoices([]);
    setView('landing'); 
  };

  const fetchAdminUsers = async () => {
    // FIXED: Added /api/ prefix
    const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAdminUsers(await res.json());
  };

  const handleResetPassword = async (userId) => {
    const newPass = resetPasswords[userId];
    if (!newPass || newPass.length < 6) {
      setAdminMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      // FIXED: Added /api/ prefix
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newPass })
      });
      const data = await res.json();
      setAdminMsg(data.message);
      setResetPasswords({ ...resetPasswords, [userId]: '' });
      setTimeout(() => setAdminMsg(''), 3000);
    } catch (err) {
      setAdminMsg('Failed to update password.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;

    // FIXED: Added /api/ prefix
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setAdminMsg(data.message);
    fetchAdminUsers();
    setTimeout(() => setAdminMsg(''), 3000);
  };

  const fetchClients = async () => {
    // FIXED: Added /api/ prefix
    const res = await fetch(`${API_BASE}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setClients(await res.json());
  };

  const fetchInvoices = async () => {
    // FIXED: Added /api/ prefix
    const res = await fetch(`${API_BASE}/api/invoices`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setInvoices(await res.json());
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!clientName || !clientEmail) return;
    // FIXED: Added /api/ prefix
    await fetch(`${API_BASE}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: clientName, email: clientEmail, status: 'Active' })
    });
    setClientName('');
    setClientEmail('');
    fetchClients();
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceTitle || !invoiceAmount || !selectedClient) return;
    // FIXED: Added /api/ prefix
    await fetch(`${API_BASE}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: invoiceTitle, amount: Number(invoiceAmount), clientId: Number(selectedClient) })
    });
    setInvoiceTitle('');
    setInvoiceAmount('');
    fetchInvoices();
  };

  const toggleInvoiceStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    // FIXED: Added /api/ prefix
    await fetch(`${API_BASE}/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    fetchInvoices();
  };

  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const totalOutstanding = invoices.filter(i => i.status === 'Unpaid').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setView(token ? (user?.role === 'admin' ? 'admin' : 'dashboard') : 'landing')}>
          ClientFlow
        </div>
        <div className="nav-buttons">
          {token ? (
            <>
              {user?.role === 'admin' && (
                <button className="btn-secondary" onClick={() => setView(view === 'admin' ? 'dashboard' : 'admin')}>
                  {view === 'admin' ? 'Back to Dashboard' : 'Admin Panel'}
                </button>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user?.email}</span>
              <button className="btn-secondary" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => { setView('login'); setAuthError(''); }}>Sign In</button>
              <button className="btn-primary" onClick={() => { setView('register'); setAuthError(''); }}>Get Started</button>
            </>
          )}
        </div>
      </nav>

      {view === 'landing' && (
        <div>
          <section className="hero">
            <h1>Financial Management & Client Operations</h1>
            <p>Enterprise invoicing and client tracking tailored for contractors and growing agencies in the UK. Track revenue and balance sheets in real-time.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }} onClick={() => setView('register')}>Start Free Trial</button>
              <button className="btn-secondary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }} onClick={() => setView('login')}>Sign In</button>
            </div>
          </section>

          <section className="features-grid">
            <div className="card">
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Client Directory</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Maintain complete corporate records, contact information, and billing histories across active accounts.</p>
            </div>
            <div className="card">
              <h3 style={{ margin: '0 0 0.5rem 0' }}>GBP (£) Invoicing</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Generate and audit localized billing statements with real-time status updates and reconciliation controls.</p>
            </div>
            <div className="card">
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Role-Based Security</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>JWT authentication combined with bcrypt hashing ensures isolated client data privacy across multi-tenant environments.</p>
            </div>
          </section>
        </div>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
          <div className="card">
            <h2>{view === 'login' ? 'Account Sign In' : 'Create Account'}</h2>
            {authError && <div style={{ color: 'var(--warning)', marginBottom: '1rem', fontSize: '0.85rem' }}>{authError}</div>}
            <form onSubmit={handleAuth}>
              <label>Email Address</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
              <label>Password</label>
<div style={{ position: 'relative' }}>
  <input 
    type={showPassword ? "text" : "password"} 
    value={authPassword} 
    onChange={e => setAuthPassword(e.target.value)} 
    required 
    style={{ paddingRight: '2.5rem' }}
  />
  <button 
    type="button" 
    onClick={() => setShowPassword(!showPassword)} 
    style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', boxShadow: 'none' }}
  >
    {showPassword ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    )}
  </button>
</div>
              <button className="btn-primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
                {view === 'login' ? 'Sign In' : 'Register'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {view === 'login' ? (
                <>Need an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setView('register')}>Sign up</span></>
              ) : (
                <>Already registered? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setView('login')}>Sign in</span></>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="container">
          
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Collected</span>
              <span className="stat-value" style={{ color: 'var(--success)' }}>£{totalCollected.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Outstanding Balance</span>
              <span className="stat-value" style={{ color: 'var(--warning)' }}>£{totalOutstanding.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Active Clients</span>
              <span className="stat-value">{clients.length}</span>
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <h2>Client Directory</h2>
              <form onSubmit={handleAddClient}>
                <label>Company Name</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} />
                <label>Contact Email</label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                <button className="btn-primary" type="submit" style={{ width: '100%' }}>Add Client</button>
              </form>
              <ul className="item-list">
                {clients.map(c => (
                  <li key={c.id} className="item-card">
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>{c.name}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.email}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>Invoice Ledger</h2>
              <form onSubmit={handleAddInvoice}>
                <label>Project Description</label>
                <input value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} />
                <label>Amount (£)</label>
                <input type="number" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} />
                <label>Assign to Client</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                  <option value="">Select a client...</option>
                  <option disabled={clients.length === 0} value="">
                    {clients.length === 0 ? 'Add a client first' : '---'}
                  </option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-primary" type="submit" style={{ width: '100%' }}>Issue Invoice</button>
              </form>
              <ul className="item-list">
                {invoices.map(inv => {
                  const client = clients.find(c => c.id === inv.clientId);
                  return (
                    <li key={inv.id} className="item-card">
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>{inv.title}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{client ? client.name : 'Unassigned'}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', marginBottom: '0.4rem' }}>£{inv.amount.toLocaleString()}</div>
                        <button onClick={() => toggleInvoiceStatus(inv.id, inv.status)} className={`badge ${inv.status}`} style={{cursor: 'pointer'}}>
                          {inv.status}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {view === 'admin' && (
  <div className="container">
    <div className="card">
      <h2>System Administration</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Manage registered tenant accounts and reset user passwords.
      </p>

      {adminMsg && (
        <div style={{ padding: '0.65rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary)', color: 'var(--text-main)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {adminMsg}
        </div>
      )}

      <ul className="item-list">
        {adminUsers.map(u => (
          <li key={u.id} className="item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{u.email}</strong>
                <span className="badge Paid" style={{ marginLeft: '8px' }}>{u.role}</span>
              </div>
              {u.role !== 'admin' && (
                <button 
                  onClick={() => handleDeleteUser(u.id)}
                  className="btn-secondary"
                  style={{ color: 'var(--warning)', borderColor: 'rgba(245, 158, 11, 0.3)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Delete Account
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="password" 
                placeholder="Type new password for user"
                value={resetPasswords[u.id] || ''}
                onChange={e => setResetPasswords({ ...resetPasswords, [u.id]: e.target.value })}
                style={{ margin: 0, padding: '0.5rem 0.75rem' }}
              />
              <button 
                onClick={() => handleResetPassword(u.id)}
                className="btn-primary"
                style={{ width: 'auto', whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
              >
                Update Password
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
)}
    </div>
  );
}