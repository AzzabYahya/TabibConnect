import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import DashboardShell from './DashboardShell';

function PatientDashboardLayout() {
  const { t } = useTranslation();
  return (
    <DashboardShell subtitle={t('dashboard.patientSubtitle')}>
      <Outlet />
    </DashboardShell>
  );
}

export default PatientDashboardLayout;
