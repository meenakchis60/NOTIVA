/**
 * App.jsx
 *
 * Root application component.
 * Wires together:
 *  - QueryClientProvider (TanStack Query)
 *  - AuthProvider (authentication context)
 *  - BrowserRouter + Routes (navigation)
 *
 * Route structure:
 *  /login          -> LoginPage      (public)
 *  /register       -> RegisterPage   (public)
 *  /               -> redirect to /dashboard
 *  /dashboard      -> DashboardPage  (protected)
 *
 * Future phases will add more protected routes here.
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import PrivateRoute from './auth/PrivateRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import AcademicsPage from './pages/academics/AcademicsPage'

// New imports
import AppLayout from './components/layout/AppLayout'
import NotesPage from './pages/notes/NotesPage'
import NoteFormPage from './pages/notes/NoteFormPage'
import NoteDetailPage from './pages/notes/NoteDetailPage'
import StudyPage from './pages/study/StudyPage'
import GroupsPage from './pages/groups/GroupsPage'
import TrashPage from './pages/trash/TrashPage'
import ProfilePage from './pages/profile/ProfilePage'

// Global QueryClient — caching and retry configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes — wrapped in PrivateRoute */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/academics" element={<AcademicsPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/notes/new" element={<NoteFormPage />} />
                <Route path="/notes/:noteId" element={<NoteDetailPage />} />
                <Route path="/notes/:noteId/edit" element={<NoteFormPage />} />
                <Route path="/notebooks" element={<AcademicsPage />} />
                <Route path="/search" element={<NotesPage />} />
                <Route path="/reminders" element={<StudyPage />} />
                <Route path="/study" element={<StudyPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/trash" element={<TrashPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
