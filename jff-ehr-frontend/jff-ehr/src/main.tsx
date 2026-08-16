import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./api/query-client";
import { AppLayout } from "./app/app-layout";
import { HomePage } from "./app/home-page";
import { AdminUsersPage } from "./features/admin/components/admin-users-page";
import { RegistrationIntakePage } from "./features/admin/components/registration-intake-page";
import { AuthProvider } from "./features/auth/auth-context";
import { LoginPage } from "./features/auth/login-page";
import { ProtectedRoute } from "./features/auth/protected-route";
import { CamperFormPage } from "./features/campers/components/camper-form-page";
import { CamperProfilePage } from "./features/campers/components/camper-profile-page";
import { PrecampFormPage } from "./features/campers/components/precamp-form-page";
import { ArrivalCheckPage } from "./features/campers/components/arrival-check-page";
import { ConsentPage } from "./features/campers/components/consent-page";
import { CampersListPage } from "./features/campers/components/campers-list-page";
import { CampDetailPage } from "./features/camps/components/camp-detail-page";
import { CampFormPage } from "./features/camps/components/camp-form-page";
import { CampRegisterPage } from "./features/camps/components/camp-register-page";
import { CampsListPage } from "./features/camps/components/camps-list-page";
import { CrewListPage } from "./features/crew/components/crew-list-page";
import { CrewFormPage } from "./features/crew/components/crew-form-page";
import { CrewDetailPage } from "./features/crew/components/crew-detail-page";
import { CrewCheckinPage } from "./features/crew/components/crew-checkin-page";
import { IncidentFormPage } from "./features/incidents/components/incident-form-page";
import { IncidentsPage } from "./features/incidents/components/incidents-page";
import { MedicationGridPage } from "./features/medications/components/medication-grid-page";
import { MedicationRoundsPage } from "./features/medications/components/medication-rounds-page";
import { PrescriptionsPage } from "./features/medications/components/prescriptions-page";
import { MedShackPage } from "./features/medshack/components/medshack-page";
import { MedShackVisitFormPage } from "./features/medshack/components/medshack-visit-form-page";
import "./styles/theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/camps" element={<CampsListPage />} />
              <Route path="/camps/new" element={<CampFormPage />} />
              <Route path="/camps/:campId" element={<CampDetailPage />} />
              <Route path="/camps/:campId/edit" element={<CampFormPage />} />
              <Route path="/camps/:campId/register" element={<CampRegisterPage />} />
              <Route path="/campers" element={<CampersListPage />} />
              <Route path="/campers/new" element={<CamperFormPage />} />
              <Route path="/campers/:camperId" element={<CamperProfilePage />} />
              <Route path="/campers/:camperId/edit" element={<CamperFormPage />} />
              <Route path="/crew" element={<CrewListPage />} />
              <Route path="/crew/new" element={<CrewFormPage />} />
              <Route path="/crew/:crewId" element={<CrewDetailPage />} />
              <Route path="/crew/:crewId/edit" element={<CrewFormPage />} />
              <Route path="/crew/:crewId/checkin" element={<CrewCheckinPage />} />
              <Route path="/registrations/:regId/precamp" element={<PrecampFormPage />} />
              <Route path="/registrations/:regId/arrival-check" element={<ArrivalCheckPage />} />
              <Route path="/registrations/:regId/consent" element={<ConsentPage />} />
              <Route path="/registrations/:regId/medications" element={<MedicationGridPage />} />
              <Route path="/registrations/:regId/prescriptions" element={<PrescriptionsPage />} />
              <Route path="/medications" element={<MedicationRoundsPage />} />
              <Route path="/medshack" element={<MedShackPage />} />
              <Route path="/medshack/new" element={<MedShackVisitFormPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/incidents/new" element={<IncidentFormPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/intake" element={<RegistrationIntakePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
