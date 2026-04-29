import { useMemo } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import AccessPromptModal from './AccessPromptModal';
import { dashboardRouteByRole, getCurrentSession } from '../../lib/auth';

function PrivateRoute({ role, title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const session = useMemo(() => getCurrentSession(), [location.pathname, location.search]);
  const redirectTo = `${location.pathname}${location.search}${location.hash}`;

  if (!session.isAuthenticated) {
    return (
      <AccessPromptModal
        isOpen
        onClose={() => navigate('/')}
        redirectTo={redirectTo}
        title={title || 'Continuez votre réservation'}
        subtitle={subtitle}
      />
    );
  }

  if (role && session.role !== role) {
    return <Navigate to={dashboardRouteByRole[session.role] || '/'} replace />;
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}

export default PrivateRoute;
