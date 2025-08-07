import React, { useState } from 'react';
import { Search, LayoutDashboard, Share2, ShieldAlert, Bot, History, Settings, Bell, UserCircle, ChevronDown, ChevronLeft, ChevronRight, Lock, ArrowRight, Eye, Users, KeyRound, Filter, PlusCircle, Play, Pause, Trash2, Copy, Download, ZoomIn, ZoomOut, Maximize, X, Mail, Key } from 'lucide-react';

// --- MOCK DATA ---
const mockUser = {
  name: 'Alex Carter',
  tier: 'Tier 2', // Can be 'Free', 'Tier 2', or 'Enterprise'
  avatar: 'https://i.pravatar.cc/150?u=alexcarter',
};

const mockNewDashboardStats = {
    breachedAccounts: 1327,
    secretsFound: 84,
};

const mockAlerts = [
  { id: 1, agent: 'Tracking "Volt Typhoon"', finding: 'New IOC found', ioc: '192.168.1.100', time: '2m ago', severity: 'High', publishedDate: '2025-08-06' },
  { id: 2, agent: 'Actor "ShadowBroker"', finding: 'Mentioned "ProjectChimera"', ioc: 'ShadowBroker', time: '15m ago', severity: 'Medium', publishedDate: '2025-08-06' },
  { id: 3, agent: 'CVE-2025-XXXX Monitor', finding: 'New exploit PoC published', ioc: 'CVE-2025-XXXX', time: '1h ago', severity: 'Critical', publishedDate: '2025-08-06' },
  { id: 4, agent: 'Tracking "Volt Typhoon"', finding: 'New wallet address associated', ioc: 'bc1q...', time: '3h ago', severity: 'High', publishedDate: '2025-08-05' },
  { id: 5, agent: 'Keyword "internal-docs"', finding: 'Document exposed on public paste', ioc: 'pastebin.com/xyz123', time: '5h ago', severity: 'Medium', publishedDate: '2025-08-05' },
];

const mockHistory = [
    { id: 1, query: '"ProjectChimera"', time: '5h ago' },
    { id: 2, query: 'actor:"Nyx"', time: 'yesterday' },
    { id: 3, query: 'ioc:cve-2025-xxxx', time: 'yesterday' },
    { id: 4, query: 'source:darknet "hydra"', time: '2 days ago'}
];

const mockBreachedAccounts = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    email: `user${i+1}@example.com`,
    passwordHash: `${Math.random().toString(36).substring(2, 15)}...`,
    source: i % 3 === 0 ? 'DataLeakersInc' : i % 3 === 1 ? 'CorporateDB_v2' : 'ForumLeak2025',
    breachDate: `2025-07-${25 - i}`
}));

const mockSecrets = [
    { id: 1, type: 'API Key', value: 'sk_live_aBcDeFg...', source: 'Public GitHub Repo', dateFound: '2025-08-01', severity: 'Critical' },
    { id: 2, type: 'DB Password', value: 'db_pass_xYz123...', source: 'Exposed .env file', dateFound: '2025-07-28', severity: 'High' },
    { id: 3, type: 'AWS Secret Key', value: 'ASIAXYZ...', source: 'Leaked config.json', dateFound: '2025-07-25', severity: 'Critical' },
    { id: 4, type: 'SSH Private Key', value: '-----BEGIN RSA...', source: 'Unsecured S3 Bucket', dateFound: '2025-07-22', severity: 'High' },
    { id: 5, type: 'Auth Token', value: 'Bearer eyJhbGci...', source: 'Misconfigured NGINX', dateFound: '2025-07-20', severity: 'Medium' },
];

const mockWorkflows = [
    { id: 1, name: 'Monitor Competitor Keywords', status: 'Active', rules: 3, lastRun: '5m ago' },
    { id: 2, name: 'Track High-Value Actors', status: 'Active', rules: 5, lastRun: '1h ago' },
    { id: 3, name: 'Watch for Brand Impersonation', status: 'Paused', rules: 2, lastRun: 'yesterday' },
];

// --- GLOBAL STYLES & ANIMATIONS ---
const GlobalStyles = () => (
    <style>{`
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fadeInDown { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
      .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
      .animate-fade-in-down { animation: fadeInDown 0.8s ease-out forwards; }
      .radial-background { background-image: radial-gradient(circle at center, #161B22 0%, #0D1117 70%); }
      .sidebar-active-link { color: white; background-color: #1F2937; }
      .sidebar-active-link::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background-color: #3B82F6; border-top-right-radius: 3px; border-bottom-right-radius: 3px; }
    `}</style>
);


// --- REUSABLE & DASHBOARD COMPONENTS ---

const StatCard = ({ icon, title, value, tier }) => {
  const isLocked = tier === 'Free' && (title === 'Graph Explorer' || title === 'AI Workflows');
  return (
    <div className={`relative p-5 rounded-xl border border-white/10 bg-gray-900/50 transition-all duration-300 group hover:border-blue-500/50 hover:bg-gray-900 ${isLocked ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{isLocked ? 'Upgrade' : value}</p>
          {isLocked && <p className="text-xs text-amber-400">Available on Tier 2+</p>}
        </div>
        <div className="p-2 rounded-lg bg-gray-800 border border-white/10">{isLocked ? <Lock size={20} className="text-amber-400" /> : icon}</div>
      </div>
    </div>
  );
};

const ActivityItem = ({ icon, title, subtitle, time }) => (
  <div className="flex items-center space-x-4 p-3 hover:bg-gray-800/70 rounded-lg transition-colors duration-200 cursor-pointer">
    <div className="flex-shrink-0 bg-gray-800 p-3 rounded-full border border-white/10">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-200 font-medium truncate">{title}</p>
      <p className="text-xs text-gray-400 truncate">{subtitle}</p>
    </div>
    <p className="text-xs text-gray-500 flex-shrink-0">{time}</p>
  </div>
);

const Sidebar = ({ activeView, isCollapsed, setIsCollapsed, onNavigate }) => {
  const navItems = [
    { slug: 'dashboard', icon: <LayoutDashboard size={20} />, name: 'Dashboard' },
    { slug: 'breachedAccounts', icon: <Users size={20} />, name: 'Breached Accounts' },
    { slug: 'secretsFound', icon: <KeyRound size={20} />, name: 'Secrets Found' },
    { slug: 'graphExplorer', icon: <Share2 size={20} />, name: 'Graph Explorer' },
    { slug: 'aiWorkflows', icon: <Bot size={20} />, name: 'AI Workflows' },
    { slug: 'alerts', icon: <ShieldAlert size={20} />, name: 'Alerts' },
    { slug: 'queryHistory', icon: <History size={20} />, name: 'Query History' },
  ];
  return (
    <div className={`bg-[#0D1117] text-gray-400 border-r border-white/10 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10 h-[65px]">
        {!isCollapsed && <h1 onClick={() => onNavigate('home')} className="text-xl font-bold text-white cursor-pointer flex items-center gap-2"><Eye size={24} className="text-blue-400"/> OSIRIS</h1>}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-gray-800"><ChevronLeft size={20} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} /></button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (<a key={item.name} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.slug); }} className={`relative flex items-center p-3 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-gray-800 hover:text-white ${activeView === item.slug ? 'sidebar-active-link' : ''}`}>{item.icon}{!isCollapsed && <span className="ml-4">{item.name}</span>}</a>))}
      </nav>
      <div className="p-2 border-t border-white/10"><a href="#" className="flex items-center p-3 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-gray-800 hover:text-white"><Settings size={20} />{!isCollapsed && <span className="ml-4">Settings</span>}</a></div>
    </div>
  );
};

const Header = () => (
    <header className="flex items-center justify-between px-6 h-[65px]">
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" size={20} />
        <input type="text" placeholder="Search selectors, keywords, or IOCs..." className="w-full bg-gray-900/80 border border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"><Bell size={20} /></button>
        <div className="flex items-center space-x-3 cursor-pointer p-1 rounded-lg hover:bg-gray-800">
          <img src={mockUser.avatar} alt="User Avatar" className="w-8 h-8 rounded-full border-2 border-gray-700" />
          <div className="hidden md:block"><p className="text-sm font-medium text-white">{mockUser.name}</p><p className="text-xs text-amber-400">{mockUser.tier} Plan</p></div>
          <ChevronDown size={16} className="text-gray-500 hidden md:block" />
        </div>
      </div>
    </header>
);

const TabButton = ({ active, onClick, children }) => (<button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>{children}</button>);

const PageHeader = ({ title, children }) => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">{title}</h1>
        <div className="flex items-center space-x-2">{children}</div>
    </div>
);

const SeverityBadge = ({ severity }) => {
    const styles = {
        'Critical': 'bg-red-500/20 text-red-400',
        'High': 'bg-orange-500/20 text-orange-400',
        'Medium': 'bg-yellow-500/20 text-yellow-400',
        'Low': 'bg-blue-500/20 text-blue-400',
    };
    return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${styles[severity] || 'bg-gray-500/20 text-gray-400'}`}>{severity}</span>
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
    <div className="flex justify-between items-center px-6 py-3 text-sm text-gray-400 bg-gray-800/50">
        <span>Page {currentPage} of {totalPages}</span>
        <div className="flex items-center space-x-2">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border border-white/10 rounded-md disabled:opacity-50 hover:bg-gray-700">Previous</button>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border border-white/10 rounded-md disabled:opacity-50 hover:bg-gray-700">Next</button>
        </div>
    </div>
);

// --- PAGE COMPONENTS ---

const DashboardContent = () => {
  const [activeTab, setActiveTab] = useState('alerts');
  return (
    <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto animate-fade-in">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <StatCard icon={<Users size={20} className="text-red-400" />} title="Breached Accounts" value={mockNewDashboardStats.breachedAccounts.toLocaleString()} tier={mockUser.tier} />
             <StatCard icon={<KeyRound size={20} className="text-yellow-400" />} title="Secrets Found" value={mockNewDashboardStats.secretsFound.toLocaleString()} tier={mockUser.tier} />
             <StatCard icon={<Share2 size={20} className="text-green-400" />} title="Graph Explorer" value="Ready" tier={mockUser.tier} />
        </div>
        <div className="flex-1 bg-gray-900/50 border border-white/10 rounded-xl p-5 flex flex-col"><h2 className="text-lg font-semibold text-white mb-4">Recent Graph Analysis</h2><GraphPlaceholder /></div>
      </div>
      <aside className="lg:col-span-1 bg-gray-900/50 border border-white/10 rounded-xl flex flex-col">
        <div className="p-4 border-b border-white/10"><div className="flex items-center bg-gray-800/50 p-1 rounded-lg"><TabButton active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')}>Alerts</TabButton><TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>History</TabButton></div></div>
        <div className="flex-1 p-2 overflow-y-auto">
            {activeTab === 'alerts' && (<div className="space-y-1">{mockAlerts.slice(0, 5).map(alert => (<ActivityItem key={alert.id} icon={<ShieldAlert size={20} className="text-red-400" />} title={alert.agent} subtitle={alert.finding} time={alert.time} />))}</div>)}
            {activeTab === 'history' && (<div className="space-y-1">{mockHistory.map(item => (<ActivityItem key={item.id} icon={<History size={20} className="text-blue-400" />} title={item.query} subtitle="View Results" time={item.time} />))}</div>)}
        </div>
      </aside>
    </main>
  );
};

const BreachedAccountsPage = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(mockBreachedAccounts.length / itemsPerPage);
    const currentItems = mockBreachedAccounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-6 animate-fade-in flex flex-col h-full">
            <PageHeader title="Breached Accounts">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="Filter accounts..." className="bg-gray-800 border border-white/10 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
                <button className="p-2 bg-gray-800 border border-white/10 rounded-md hover:bg-gray-700"><Filter size={18} /></button>
            </PageHeader>
            <div className="bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/50 sticky top-0"><tr><th scope="col" className="px-6 py-3">Email</th><th scope="col" className="px-6 py-3">Password Hash</th><th scope="col" className="px-6 py-3">Source</th><th scope="col" className="px-6 py-3">Breach Date</th></tr></thead>
                        <tbody className="divide-y divide-gray-800">{currentItems.map(acc => (<tr key={acc.id} className="hover:bg-gray-800/50"><td className="px-6 py-4 font-medium text-white">{acc.email}</td><td className="px-6 py-4 font-mono">{acc.passwordHash}</td><td className="px-6 py-4">{acc.source}</td><td className="px-6 py-4">{acc.breachDate}</td></tr>))}</tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

const SecretsFoundPage = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(mockSecrets.length / itemsPerPage);
    const currentItems = mockSecrets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    return (
        <div className="p-6 animate-fade-in flex flex-col h-full">
            <PageHeader title="Secrets Found"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="Filter secrets..." className="bg-gray-800 border border-white/10 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div><button className="p-2 bg-gray-800 border border-white/10 rounded-md hover:bg-gray-700"><Filter size={18} /></button></PageHeader>
            <div className="bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/50 sticky top-0"><tr><th scope="col" className="px-6 py-3">Type</th><th scope="col" className="px-6 py-3">Value</th><th scope="col" className="px-6 py-3">Source</th><th scope="col" className="px-6 py-3">Severity</th><th scope="col" className="px-6 py-3">Date Found</th><th scope="col" className="px-6 py-3"><span className="sr-only">Copy</span></th></tr></thead>
                        <tbody className="divide-y divide-gray-800">{currentItems.map(sec => (<tr key={sec.id} className="hover:bg-gray-800/50"><td className="px-6 py-4 font-medium text-white">{sec.type}</td><td className="px-6 py-4 font-mono text-yellow-400">{sec.value}</td><td className="px-6 py-4">{sec.source}</td><td className="px-6 py-4"><SeverityBadge severity={sec.severity} /></td><td className="px-6 py-4">{sec.dateFound}</td><td className="px-6 py-4"><button className="p-1 text-gray-400 hover:text-white"><Copy size={16} /></button></td></tr>))}</tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

const GraphPlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
        <svg width="100%" height="100%" className="opacity-50">
            <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#4A5568" /></marker></defs>
            <line x1="20%" y1="30%" x2="40%" y2="50%" stroke="#4A5568" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="40%" y1="50%" x2="25%" y2="70%" stroke="#4A5568" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="40%" y1="50%" x2="60%" y2="50%" stroke="#4A5568" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="60%" y1="50%" x2="75%" y2="30%" stroke="#4A5568" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="60%" y1="50%" x2="80%" y2="70%" stroke="#4A5568" strokeWidth="2" markerEnd="url(#arrow)" />
            <circle cx="20%" cy="30%" r="15" fill="#2D3748" stroke="#3B82F6" strokeWidth="2" />
            <circle cx="40%" cy="50%" r="20" fill="#2D3748" stroke="#E53E3E" strokeWidth="2" />
            <circle cx="25%" cy="70%" r="12" fill="#2D3748" stroke="#3B82F6" strokeWidth="2" />
            <circle cx="60%" cy="50%" r="18" fill="#2D3748" stroke="#3B82F6" strokeWidth="2" />
            <circle cx="75%" cy="30%" r="15" fill="#2D3748" stroke="#3B82F6" strokeWidth="2" />
            <circle cx="80%" cy="70%" r="16" fill="#2D3748" stroke="#3B82F6" strokeWidth="2" />
        </svg>
    </div>
);

const GraphExplorerPage = () => (
    <div className="p-6 h-full flex flex-col animate-fade-in">
        <PageHeader title="Graph Explorer">
            <div className="flex items-center space-x-1 bg-gray-800 border border-white/10 p-1 rounded-md">
                <button className="p-2 hover:bg-gray-700 rounded"><ZoomIn size={18} /></button>
                <button className="p-2 hover:bg-gray-700 rounded"><ZoomOut size={18} /></button>
                <button className="p-2 hover:bg-gray-700 rounded"><Maximize size={18} /></button>
                <button className="p-2 hover:bg-gray-700 rounded"><Download size={18} /></button>
            </div>
        </PageHeader>
        <div className="flex-1 bg-gray-900/50 border border-white/10 rounded-xl flex items-center justify-center text-gray-500"><GraphPlaceholder /></div>
    </div>
);

const AIWorkflowsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    return (
        <>
            <div className="p-6 animate-fade-in">
                <PageHeader title="AI Workflows"><button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"><PlusCircle size={18} /><span>Create New Workflow</span></button></PageHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockWorkflows.map(wf => (
                        <div key={wf.id} className="bg-gray-900/50 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-white">{wf.name}</h3>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block ${wf.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{wf.status}</span>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                <div className="text-sm"><span className="font-medium text-white">{wf.rules}</span> Rules</div>
                                <div className="flex items-center space-x-2">
                                    <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md">{wf.status === 'Active' ? <Pause size={16}/> : <Play size={16}/>}</button>
                                    <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-800 rounded-md"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {isModalOpen && <WorkflowCreationModal onClose={() => setIsModalOpen(false)} />}
        </>
    );
};

const WorkflowCreationModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in">
        <div className="bg-[#101419] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl p-6 m-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Create New AI Workflow</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-800"><X size={20} /></button>
            </div>
            <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-400 block mb-2">Workflow Name</label><input type="text" placeholder="e.g., Monitor High-Value Actors" className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
                <div><label className="text-sm font-medium text-gray-400 block mb-2">Rules & Triggers</label><textarea placeholder="Define rules using selectors, keywords, and logic. e.g., (actor:ShadowBroker OR ioc:1.2.3.4) AND keyword:exploit" rows="4" className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea></div>
                <div><label className="text-sm font-medium text-gray-400 block mb-2">Actions</label><select className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"><option>Create Alert</option><option>Send Email Notification</option><option>Push to Webhook</option></select></div>
                <div className="flex justify-end space-x-3 pt-4"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700">Cancel</button><button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Create Workflow</button></div>
            </div>
        </div>
    </div>
);

const AlertsPage = () => {
    return (
        <div className="p-6 animate-fade-in">
            <PageHeader title="Alerts">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="Filter alerts..." className="bg-gray-800 border border-white/10 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
                <button className="p-2 bg-gray-800 border border-white/10 rounded-md hover:bg-gray-700"><Filter size={18} /></button>
            </PageHeader>
            <div className="bg-gray-900/50 border border-white/10 rounded-xl">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-800/50"><tr><th scope="col" className="px-6 py-3">Agent</th><th scope="col" className="px-6 py-3">Finding</th><th scope="col" className="px-6 py-3">IOC</th><th scope="col" className="px-6 py-3">Severity</th><th scope="col" className="px-6 py-3">Published</th></tr></thead>
                    <tbody className="divide-y divide-gray-800">{mockAlerts.map(alert => (<tr key={alert.id} className="hover:bg-gray-800/50"><td className="px-6 py-4 font-medium text-white">{alert.agent}</td><td className="px-6 py-4">{alert.finding}</td><td className="px-6 py-4 font-mono text-cyan-400">{alert.ioc}</td><td className="px-6 py-4"><SeverityBadge severity={alert.severity} /></td><td className="px-6 py-4">{alert.publishedDate}</td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );
};

const QueryHistoryPage = () => (
    <div className="p-6 animate-fade-in">
        <PageHeader title="Query History"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="Filter history..." className="bg-gray-800 border border-white/10 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div></PageHeader>
        <div className="bg-gray-900/50 border border-white/10 rounded-xl p-2 space-y-1">{mockHistory.map(item => (<ActivityItem key={item.id} icon={<History size={20} className="text-blue-400" />} title={item.query} subtitle="View Results" time={item.time} />))}</div>
    </div>
);


const AppLayout = ({ activeView, onNavigate, children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    return (
        <div className="flex h-screen bg-gray-900 text-gray-300 font-sans">
            <Sidebar activeView={activeView} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} onNavigate={onNavigate} />
            <div className="flex-1 flex flex-col overflow-hidden bg-[#101419]"><Header />{children}</div>
        </div>
    );
};

const HomePage = ({ onNavigate }) => (
    <>
      <GlobalStyles />
      <div className="flex flex-col items-center justify-center min-h-screen radial-background text-white font-sans p-4 overflow-hidden">
        <div className="absolute top-6 right-6 flex items-center space-x-4"><button onClick={() => onNavigate('auth')} className="text-gray-300 hover:text-white font-medium transition-colors">Login</button><button onClick={() => onNavigate('auth')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-300 transform hover:scale-105"><span>Sign Up Free</span><ArrowRight className="ml-2" size={16} /></button></div>
        <main className="text-center flex flex-col items-center animate-fade-in-down">
          <div className="mb-8"><div className="p-4 bg-blue-500/10 rounded-full inline-block mb-4 border border-blue-500/20"><Eye size={60} className="text-blue-400"/></div><h1 className="text-7xl font-bold tracking-tighter">OSIRIS</h1><p className="text-gray-400 mt-2 text-lg">Uncovering Connections in the Digital Underworld.</p></div>
          <div className="w-full max-w-2xl my-8">
              <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={24} /><input type="text" placeholder='Enter a selector, keyword, or IOC...' className="w-full text-lg bg-[#0D1117] border-2 border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 rounded-lg pl-16 pr-6 py-4 text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-300"/></div>
               <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-gray-500"><span>Sources:</span><span className="font-mono bg-gray-800/60 px-2 py-1 rounded">Darknet Forums</span><span className="font-mono bg-gray-800/60 px-2 py-1 rounded">Breach Datasets</span><span className="font-mono bg-gray-800/60 px-2 py-1 rounded">Paste Sites</span></div>
          </div>
        </main>
        <footer className="absolute bottom-4 text-center text-gray-600 text-sm animate-fade-in-down" style={{animationDelay: '0.3s'}}><p>&copy; {new Date().getFullYear()} OSIRIS Intelligence. All rights reserved.</p></footer>
      </div>
    </>
);

const AuthPage = ({ onNavigate }) => {
    const [isLogin, setIsLogin] = useState(true);
    return (
        <>
            <GlobalStyles />
            <div className="flex flex-col items-center justify-center min-h-screen radial-background text-white font-sans p-4 overflow-hidden">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="text-center mb-8 cursor-pointer" onClick={() => onNavigate('home')}>
                        <div className="p-4 bg-blue-500/10 rounded-full inline-block mb-4 border border-blue-500/20"><Eye size={40} className="text-blue-400"/></div>
                        <h1 className="text-4xl font-bold tracking-tighter">OSIRIS</h1>
                    </div>
                    <div className="bg-gray-900/50 border border-white/10 rounded-xl p-8">
                        <h2 className="text-2xl font-bold text-center text-white mb-2">{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
                        <p className="text-center text-gray-400 mb-6 text-sm">{isLogin ? 'Sign in to continue to your dashboard' : 'Start your journey into the digital underworld'}</p>
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onNavigate('dashboard'); }}>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="email" placeholder="Email Address" required className="w-full bg-gray-800 border border-white/10 rounded-md pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </div>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="password" placeholder="Password" required className="w-full bg-gray-800 border border-white/10 rounded-md pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </div>
                            {!isLogin && (
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="password" placeholder="Confirm Password" required className="w-full bg-gray-800 border border-white/10 rounded-md pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                </div>
                            )}
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors">{isLogin ? 'Login' : 'Create Account'}</button>
                        </form>
                        <p className="text-center text-sm text-gray-400 mt-6">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-blue-400 hover:text-blue-300 ml-1">
                                {isLogin ? 'Sign Up' : 'Login'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};


// --- MAIN APP ROUTER ---

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // home, auth, dashboard, etc.
  const navigate = (view) => { setCurrentView(view); };

  const renderContent = () => {
      switch (currentView) {
          case 'dashboard': return <DashboardContent />;
          case 'breachedAccounts': return <BreachedAccountsPage />;
          case 'secretsFound': return <SecretsFoundPage />;
          case 'graphExplorer': return <GraphExplorerPage />;
          case 'aiWorkflows': return <AIWorkflowsPage />;
          case 'alerts': return <AlertsPage />;
          case 'queryHistory': return <QueryHistoryPage />;
          default: return <DashboardContent />;
      }
  };

  if (currentView === 'home') { return <HomePage onNavigate={navigate} />; }
  if (currentView === 'auth') { return <AuthPage onNavigate={navigate} />; }

  return (
    <>
      <GlobalStyles />
      <AppLayout activeView={currentView} onNavigate={navigate}>{renderContent()}</AppLayout>
    </>
  );
}