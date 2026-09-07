import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DemoProvider } from './state/DemoStore'
import { AppShell } from './components/AppShell'
import { Login } from './pages/Login'
import { TicketGenerator } from './pages/TicketGenerator'
import { MyQueue } from './pages/L1Console/MyQueue'
import { AutoResolvedMonitor } from './pages/L1Console/AutoResolvedMonitor'
import { TicketDetail } from './pages/L1Console/TicketDetail'
import { Overview } from './pages/AdminDashboard/Overview'
import { RunHistory } from './pages/AdminDashboard/RunHistory'
import { VendorCases } from './pages/AdminDashboard/VendorCases'
import { FeedbackReview } from './pages/AdminDashboard/FeedbackReview'

export default function App() {
  return (
    <DemoProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/simulator" element={<TicketGenerator />} />
          <Route element={<AppShell />}>
            <Route path="/l1/queue" element={<MyQueue />} />
            <Route path="/l1/auto" element={<AutoResolvedMonitor />} />
            <Route path="/l1/ticket" element={<TicketDetail />} />
            <Route path="/admin/overview" element={<Overview />} />
            <Route path="/admin/history" element={<RunHistory />} />
            <Route path="/admin/vendor-cases" element={<VendorCases />} />
            <Route path="/admin/feedback" element={<FeedbackReview />} />
            <Route path="/admin/audit" element={<TicketDetail showControls={false} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </DemoProvider>
  )
}
