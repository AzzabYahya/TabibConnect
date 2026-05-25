import AccountSettingsPanel from '../components/account/AccountSettingsPanel';

function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Mon compte</h1>
        <p className="text-sm text-slate-600">Session, coordonnées et déconnexion.</p>
      </header>
      <AccountSettingsPanel />
    </div>
  );
}

export default AccountPage;
