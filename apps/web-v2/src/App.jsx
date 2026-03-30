import React from 'react';
import {
  Route,
  Routes
} from 'react-router-dom';
import {
  LoginView,
  ProtectedRoute,
  WorkspaceLayout
} from './workspace/layout.jsx';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
